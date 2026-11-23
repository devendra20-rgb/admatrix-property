import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { validateTrakheesiCompliance } from '../services/compliance.service.js';
import { s3Service } from '../services/s3.service.js';
import { PropertyLockService } from '../services/property-lock.service.js';
import { authenticate, tenantGuard, requireRole } from '../middleware/auth.middleware.js';

export const propertiesRouter = Router();

// Apply authentication and tenant isolation to all property routes
propertiesRouter.use(authenticate, tenantGuard);

// GET /api/properties (Multi-tenant scoped)
propertiesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const compliance = (req.query.compliance as string) || '';
    const type = (req.query.type as string) || '';

    const where: any = {};

    // Multi-tenant isolation: Always enforce user's organizationId
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = req.user!.organizationId;
    } else if (req.query.organizationId) {
      where.organizationId = req.query.organizationId as string;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { community: { contains: search, mode: 'insensitive' } },
        { trakheesiPermitNo: { contains: search } },
        { buildingProject: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (compliance) where.complianceStatus = compliance;
    if (type) where.propertyType = type;

    const properties = await prisma.property.findMany({
      where,
      include: {
        campaigns: {
          select: { id: true, name: true, status: true, spend: true, leadsCount: true },
        },
        leads: {
          select: { id: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: properties.length, data: properties });
  } catch (error) {
    console.error('Failed to fetch properties:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch properties' });
  }
});

// POST /api/properties (Scoped to caller's organization)
propertiesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const complianceResult = validateTrakheesiCompliance(body);

    const organizationId = req.user!.organizationId;
    const createdById = req.user!.userId;

    let qrCodeUrl = body.qrCodeUrl;
    if (body.trakheesiPermitNo && !qrCodeUrl) {
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://dubailand.gov.ae/en/eservices/trakheesi-permit/${encodeURIComponent(body.trakheesiPermitNo)}`;
    }

    const property = await prisma.property.create({
      data: {
        title: body.title,
        description: body.description || '',
        propertyType: body.propertyType || 'Apartment',
        listingType: body.listingType || 'Sale',
        price: parseFloat(body.price) || 0,
        currency: body.currency || 'AED',
        bedrooms: parseInt(body.bedrooms) || 1,
        bathrooms: parseInt(body.bathrooms) || 1,
        builtUpArea: parseFloat(body.builtUpArea) || 0,
        furnishingStatus: body.furnishingStatus || 'Unfurnished',
        emirate: body.emirate || 'Dubai',
        community: body.community || 'Downtown Dubai',
        buildingProject: body.buildingProject || null,
        address: body.address || 'Dubai, UAE',
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
        trakheesiPermitNo: body.trakheesiPermitNo || null,
        permitExpiryDate: body.permitExpiryDate ? new Date(body.permitExpiryDate) : null,
        qrCodeUrl,
        formACompleted: Boolean(body.formACompleted),
        complianceStatus: complianceResult.status,
        complianceNotes: complianceResult.issues.length > 0
          ? complianceResult.issues.join(' | ')
          : 'Verified compliant with DLD Trakheesi standards.',
        isOffPlan: Boolean(body.isOffPlan),
        developerName: body.developerName || null,
        escrowNumber: body.escrowNumber || null,
        completionDate: body.completionDate ? new Date(body.completionDate) : null,
        coverImage: body.coverImage || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80',
        images: body.images ? (typeof body.images === 'string' ? body.images : JSON.stringify(body.images)) : null,
        organizationId,
        createdById,
      },
    });

    await prisma.complianceLog.create({
      data: {
        propertyId: property.id,
        status: complianceResult.status,
        reason: complianceResult.issues.length > 0 ? complianceResult.issues.join('; ') : 'Compliant',
        performedBy: req.user!.name,
      },
    });

    res.status(201).json({
      success: true,
      data: property,
      compliance: complianceResult,
    });
  } catch (error) {
    console.error('Failed to create property:', error);
    res.status(500).json({ success: false, error: 'Failed to create property: ' + String(error) });
  }
});

// GET /api/properties/:id (Multi-tenant protected)
propertiesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const where: any = { id: req.params.id };
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = req.user!.organizationId;
    }

    const property = await prisma.property.findFirst({
      where,
      include: {
        campaigns: true,
        leads: { orderBy: { createdAt: 'desc' } },
        adCreatives: true,
        complianceLogs: { orderBy: { checkedAt: 'desc' } },
        mediaAssets: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    const compliance = validateTrakheesiCompliance(property);
    res.json({ success: true, data: property, compliance });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch property' });
  }
});

// PUT /api/properties/:id (Multi-tenant protected)
propertiesRouter.put('/:id', requireRole('SUPER_ADMIN', 'BROKERAGE_ADMIN', 'BROKER'), async (req: Request, res: Response) => {
  try {
    const where: any = { id: req.params.id };
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = req.user!.organizationId;
    }

    const existing = await prisma.property.findFirst({ where });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    if (existing.status === 'DELETING') {
      return res.status(409).json({ success: false, error: 'Cannot update property: Deletion is in progress' });
    }

    const body = req.body;
    const complianceResult = validateTrakheesiCompliance(body);

    const updated = await prisma.property.update({
      where: { id: req.params.id },
      data: {
        title: body.title,
        description: body.description,
        propertyType: body.propertyType,
        listingType: body.listingType,
        price: body.price ? parseFloat(body.price) : undefined,
        currency: body.currency,
        bedrooms: body.bedrooms ? parseInt(body.bedrooms) : undefined,
        bathrooms: body.bathrooms ? parseInt(body.bathrooms) : undefined,
        builtUpArea: body.builtUpArea ? parseFloat(body.builtUpArea) : undefined,
        furnishingStatus: body.furnishingStatus,
        community: body.community,
        buildingProject: body.buildingProject,
        address: body.address,
        trakheesiPermitNo: body.trakheesiPermitNo,
        permitExpiryDate: body.permitExpiryDate ? new Date(body.permitExpiryDate) : undefined,
        qrCodeUrl: body.qrCodeUrl,
        formACompleted: body.formACompleted,
        complianceStatus: complianceResult.status,
        complianceNotes: complianceResult.issues.join(' | ') || 'Compliant with DLD regulations',
        isOffPlan: body.isOffPlan,
        developerName: body.developerName,
        escrowNumber: body.escrowNumber,
        completionDate: body.completionDate ? new Date(body.completionDate) : undefined,
        coverImage: body.coverImage,
        images: body.images ? (typeof body.images === 'string' ? body.images : JSON.stringify(body.images)) : undefined,
      },
    });

    await prisma.complianceLog.create({
      data: {
        propertyId: req.params.id,
        status: complianceResult.status,
        reason: 'Property updated and re-validated.',
        performedBy: req.user!.name,
      },
    });

    res.json({ success: true, data: updated, compliance: complianceResult });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update property' });
  }
});

// DELETE /api/properties/:id (Multi-tenant protected)
propertiesRouter.delete('/:id', requireRole('SUPER_ADMIN', 'BROKERAGE_ADMIN', 'BROKER'), async (req: Request, res: Response) => {
  try {
    // 1. Ownership & Tenant Scoping
    const where: any = { id: req.params.id };
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = req.user!.organizationId;
    }

    const existing = await prisma.property.findFirst({ where });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    // 2. Safe Atomic Lock Acquisition & Concurrent Deletion Prevention
    // Uses Redis SET NX PX to guarantee mutual exclusion across concurrent requests.
    const lockResult = await PropertyLockService.acquireLock(existing.id, 30000);
    if (!lockResult.acquired) {
      const isRedisError = lockResult.reason?.includes('Redis is unavailable');
      return res.status(isRedisError ? 503 : 409).json({
        success: false,
        error: lockResult.reason || 'Property deletion is actively in progress by an ongoing worker. Concurrent deletion blocked.',
      });
    }
    const lockToken = lockResult.lockToken;

    try {
      // 3. Mark property status as DELETING in PostgreSQL to block concurrent uploads or edits
      await prisma.property.update({
        where: { id: existing.id },
        data: { status: 'DELETING' },
      });

      // 4. Fetch associated MediaAssets scoped strictly to this property and organization
      const associatedAssets = await prisma.mediaAsset.findMany({
        where: {
          propertyId: existing.id,
          organizationId: existing.organizationId,
        },
        orderBy: { createdAt: 'asc' },
      });

      // 5. Per-asset deletion with atomic database sync & heartbeat lock extension:
      // If S3 deletion succeeds for asset[i], immediately delete asset[i] from database.
      // If S3 deletion fails after retries, halt immediately and preserve remaining assets and property.
      let deletedCount = 0;
      for (const asset of associatedAssets) {
        // Heartbeat lock extension: guarantees slow deletions exceeding 30s never have their lock stolen
        const lockExtended = await PropertyLockService.extendLock(existing.id, lockToken, 30000);
        if (!lockExtended) {
          console.error(`[propertiesRouter] FAIL-CLOSED: Heartbeat lock extension failed for property ${existing.id}. Halting deletion.`);
          await prisma.property.update({
            where: { id: existing.id },
            data: { status: 'ACTIVE' },
          });
          await PropertyLockService.releaseLock(existing.id, lockToken);

          return res.status(503).json({
            success: false,
            error: 'Lock heartbeat extension failed. Deletion halted by fail-closed policy to prevent concurrent deletion.',
            deletedCount,
            remainingCount: associatedAssets.length - deletedCount,
          });
        }

        await prisma.property.update({
          where: { id: existing.id },
          data: { updatedAt: new Date() },
        });

        try {
          await s3Service.deleteObjectWithRetry(asset.key, 3);
        } catch (s3Err: any) {
          console.error(`[propertiesRouter] Aborting property deletion: Failed to delete S3 object ${asset.key}:`, s3Err);

          // Revert property status from DELETING back to ACTIVE so it can be managed/retried
          await prisma.property.update({
            where: { id: existing.id },
            data: { status: 'ACTIVE' },
          });
          await PropertyLockService.releaseLock(existing.id, lockToken);

          return res.status(502).json({
            success: false,
            error: `Partial deletion halted: Successfully deleted ${deletedCount} storage object(s) and database record(s), but failed to delete storage object for ${asset.fileName} (${asset.key}) after retries. Property and remaining ${associatedAssets.length - deletedCount} asset(s) were preserved in the database to prevent inconsistency.`,
            deletedCount,
            failedAssetKey: asset.key,
            failedFileName: asset.fileName,
            remainingCount: associatedAssets.length - deletedCount,
          });
        }

        // S3 deletion confirmed -> immediately delete this specific MediaAsset record from DB
        try {
          await prisma.mediaAsset.delete({
            where: { id: asset.id },
          });
          deletedCount++;
        } catch (dbErr: any) {
          console.error(`[propertiesRouter] Critical: S3 object ${asset.key} was deleted, but failed to delete database record ${asset.id}:`, dbErr);

          // Revert property status to ACTIVE to allow inspection and retry
          await prisma.property.update({
            where: { id: existing.id },
            data: { status: 'ACTIVE' },
          });
          await PropertyLockService.releaseLock(existing.id, lockToken);

          return res.status(502).json({
            success: false,
            error: `Storage-database sync failure: Storage object for ${asset.fileName} (${asset.key}) was deleted from storage, but database record removal failed (${dbErr.message || 'DB error'}). Property status was reverted to ACTIVE. Re-running property deletion will reconcile this record because storage deletion is idempotent.`,
            deletedCount,
            failedAssetKey: asset.key,
            failedDbAssetId: asset.id,
            remainingCount: associatedAssets.length - deletedCount,
          });
        }
      }

      // 6. Cascade delete property only after all associated storage objects & MediaAsset records are deleted
      await prisma.property.delete({
        where: { id: existing.id },
      });

      // 7. Safely release lock using ownership token
      await PropertyLockService.releaseLock(existing.id, lockToken);

      res.json({
        success: true,
        message: 'Property and all associated storage assets deleted successfully',
        deletedAssetsCount: deletedCount,
      });
    } catch (innerErr: any) {
      await PropertyLockService.releaseLock(existing.id, lockToken);
      throw innerErr;
    }
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete property' });
  }
});
