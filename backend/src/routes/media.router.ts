import { Router, Request, Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { prisma } from '../lib/prisma.js';
import { s3Service, ALLOWED_CATEGORIES, MediaCategory } from '../services/s3.service.js';
import { authenticate, tenantGuard } from '../middleware/auth.middleware.js';

export const mediaRouter = Router();

// =========================================================================
// LOCAL STORAGE EMULATOR ENDPOINTS (Must be mounted before auth middleware)
// Used when operating without external AWS S3 credentials
// =========================================================================

// PUT /api/media/storage/* -> Raw binary streaming upload
mediaRouter.put('/storage/:encodedKey(*)', (req: Request, res: Response) => {
  try {
    const key = decodeURIComponent(req.params.encodedKey);
    const { action, token, expires } = req.query as { action?: string; token?: string; expires?: string };

    if (!action || !token || !expires || action !== 'put') {
      res.status(403).json({ success: false, error: 'Invalid or missing signature parameters' });
      return;
    }

    const expiresAt = parseInt(expires, 10);
    const isValid = s3Service.verifyLocalToken(key, 'put', expiresAt, token);
    if (!isValid) {
      res.status(403).json({ success: false, error: 'Invalid or expired upload signature token' });
      return;
    }

    const uploadsDir = s3Service.getLocalUploadsDir();
    const destPath = path.join(uploadsDir, key);
    const destFolder = path.dirname(destPath);

    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }

    const fileStream = fs.createWriteStream(destPath);
    req.pipe(fileStream);

    fileStream.on('finish', () => {
      res.status(200).json({ success: true, message: 'File written to local storage', key });
    });

    fileStream.on('error', (err) => {
      console.error('File write stream error:', err);
      res.status(500).json({ success: false, error: 'Failed to write file stream' });
    });
  } catch (error) {
    console.error('Local PUT storage error:', error);
    res.status(500).json({ success: false, error: 'Storage upload failed' });
  }
});

// GET /api/media/storage/* -> Stream binary file back
mediaRouter.get('/storage/:encodedKey(*)', (req: Request, res: Response) => {
  try {
    const key = decodeURIComponent(req.params.encodedKey);
    const { action, token, expires } = req.query as { action?: string; token?: string; expires?: string };

    if (!action || !token || !expires || action !== 'get') {
      res.status(403).json({ success: false, error: 'Invalid or missing signature parameters' });
      return;
    }

    const expiresAt = parseInt(expires, 10);
    const isValid = s3Service.verifyLocalToken(key, 'get', expiresAt, token);
    if (!isValid) {
      res.status(403).json({ success: false, error: 'Invalid or expired download signature token' });
      return;
    }

    const uploadsDir = s3Service.getLocalUploadsDir();
    const filePath = path.join(uploadsDir, key);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'File not found in storage' });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };

    res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (error) {
    console.error('Local GET storage error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve storage file' });
  }
});

// =========================================================================
// AUTHENTICATED MULTI-TENANT MEDIA MANAGEMENT API
// =========================================================================

mediaRouter.use(authenticate, tenantGuard);

/**
 * POST /api/media/presign-upload
 * Generates presigned PUT upload URL and pre-configured S3 key
 */
mediaRouter.post('/presign-upload', async (req: Request, res: Response) => {
  try {
    if (process.env.DISABLE_MEDIA_UPLOADS === 'true') {
      res.status(503).json({
        success: false,
        error: 'Media uploads are temporarily disabled in this test deployment.',
      });
      return;
    }

    const { fileName, fileSize, mimeType, category = 'PROPERTY_IMAGE', propertyId } = req.body;

    if (!fileName || typeof fileName !== 'string') {
      res.status(400).json({ success: false, error: 'fileName is required' });
      return;
    }

    if (fileSize === undefined || fileSize === null || typeof fileSize !== 'number' || Number.isNaN(fileSize)) {
      res.status(400).json({ success: false, error: 'fileSize is required as a numeric byte value' });
      return;
    }

    if (!mimeType || typeof mimeType !== 'string') {
      res.status(400).json({ success: false, error: 'mimeType is required' });
      return;
    }

    if (!ALLOWED_CATEGORIES.includes(category as MediaCategory)) {
      res.status(400).json({
        success: false,
        error: `Invalid category. Allowed: ${ALLOWED_CATEGORIES.join(', ')}`,
      });
      return;
    }

    // Validate size and MIME constraints
    const validation = s3Service.validateMedia(mimeType, fileSize);
    if (!validation.valid) {
      res.status(400).json({ success: false, error: validation.error });
      return;
    }

    const organizationId = req.user!.organizationId;

    // Concurrency guard: If propertyId provided, ensure property is not undergoing deletion
    if (propertyId) {
      const property = await prisma.property.findFirst({
        where: {
          id: propertyId,
          ...(req.user!.role !== 'SUPER_ADMIN' ? { organizationId } : {}),
        },
      });

      if (!property) {
        res.status(404).json({ success: false, error: 'Property not found or access denied' });
        return;
      }

      if (property.status === 'DELETING') {
        res.status(409).json({ success: false, error: 'Cannot generate upload URL: Property is undergoing deletion.' });
        return;
      }
    }

    // Generate tenant-partitioned key: organizations/{orgId}/{category}/...
    const key = s3Service.generateKey(organizationId, category as MediaCategory, fileName);

    // Generate presigned upload URL
    const presigned = await s3Service.getPresignedUploadUrl(key, mimeType, 900); // 15 min expiry

    res.json({
      success: true,
      data: presigned,
    });
  } catch (error) {
    console.error('Presign upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate upload URL' });
  }
});

/**
 * POST /api/media/confirm
 * Confirms file upload and creates MediaAsset record in PostgreSQL
 */
mediaRouter.post('/confirm', async (req: Request, res: Response) => {
  try {
    if (process.env.DISABLE_MEDIA_UPLOADS === 'true') {
      res.status(503).json({
        success: false,
        error: 'Media uploads are temporarily disabled in this test deployment.',
      });
      return;
    }

    const { key, bucket, fileName, fileSize, mimeType, category, propertyId, creativeId } = req.body;

    if (!key || !fileName || !fileSize || !mimeType || !category) {
      res.status(400).json({
        success: false,
        error: 'Missing required confirmation fields (key, fileName, fileSize, mimeType, category)',
      });
      return;
    }

    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;

    // Cross-tenant security check: Ensure the key prefix matches caller's organizationId
    const expectedPrefix = `organizations/${organizationId}/`;
    if (req.user!.role !== 'SUPER_ADMIN' && !key.startsWith(expectedPrefix)) {
      res.status(403).json({
        success: false,
        error: 'Access denied: Cannot claim a media asset belonging to another organization',
      });
      return;
    }

    // If propertyId supplied, verify it exists and belongs to this organization
    if (propertyId) {
      const property = await prisma.property.findFirst({
        where: {
          id: propertyId,
          ...(req.user!.role !== 'SUPER_ADMIN' ? { organizationId } : {}),
        },
      });

      if (!property) {
        // Prevent untracked storage objects: purge uploaded object if property does not exist or was deleted
        let cleanupStatus: 'PURGED' | 'CLEANUP_FAILED' = 'PURGED';
        let cleanupError: string | undefined = undefined;
        try {
          await s3Service.deleteObjectWithRetry(key, 3);
        } catch (cleanupErr: any) {
          cleanupStatus = 'CLEANUP_FAILED';
          cleanupError = cleanupErr.message || 'Unknown storage deletion error';
          console.error(`[mediaRouter] CRITICAL: Failed to purge upload for deleted property ${key}:`, cleanupErr);
        }

        res.status(404).json({
          success: false,
          error: 'Property not found or already deleted',
          cleanupStatus,
          ...(cleanupStatus === 'CLEANUP_FAILED' ? { orphanedStorageKey: key, cleanupError } : {}),
        });
        return;
      }

      if (property.status === 'DELETING') {
        // Prevent untracked storage objects: purge the uploaded object if already present
        let cleanupStatus: 'PURGED' | 'CLEANUP_FAILED' = 'PURGED';
        let cleanupError: string | undefined = undefined;
        try {
          await s3Service.deleteObjectWithRetry(key, 3);
        } catch (cleanupErr: any) {
          cleanupStatus = 'CLEANUP_FAILED';
          cleanupError = cleanupErr.message || 'Unknown storage deletion error';
          console.error(`[mediaRouter] CRITICAL: Failed to purge concurrent upload on deleting property ${key}:`, cleanupErr);
        }

        res.status(409).json({
          success: false,
          error: 'Cannot attach media: Property is undergoing deletion.',
          cleanupStatus,
          ...(cleanupStatus === 'CLEANUP_FAILED' ? { orphanedStorageKey: key, cleanupError } : {}),
        });
        return;
      }
    }

    // If creativeId supplied, verify it exists and belongs to this organization
    if (creativeId) {
      const creative = await prisma.adCreative.findFirst({
        where: {
          id: creativeId,
          ...(req.user!.role !== 'SUPER_ADMIN' ? { organizationId } : {}),
        },
      });

      if (!creative) {
        res.status(404).json({ success: false, error: 'Ad Creative not found or access denied' });
        return;
      }
    }

    // Verify actual uploaded object existence, size, and header magic bytes in storage
    const verification = await s3Service.verifyObjectUpload(key, mimeType);
    if (!verification.valid) {
      let cleanupStatus: 'PURGED' | 'CLEANUP_FAILED' = 'PURGED';
      let cleanupError: string | undefined = undefined;

      try {
        await s3Service.deleteObjectWithRetry(key, 3);
        cleanupStatus = 'PURGED';
      } catch (cleanupErr: any) {
        cleanupStatus = 'CLEANUP_FAILED';
        cleanupError = cleanupErr.message || 'Unknown storage deletion error';
        console.error(`[mediaRouter] CRITICAL: Failed to purge rejected storage object ${key} after 3 attempts:`, cleanupErr);
      }

      res.status(400).json({
        success: false,
        error: `Storage verification failed: ${verification.error}`,
        cleanupStatus,
        ...(cleanupStatus === 'CLEANUP_FAILED' ? { orphanedStorageKey: key, cleanupError } : {}),
      });
      return;
    }

    // Generate download URL
    const { downloadUrl } = await s3Service.getPresignedDownloadUrl(key, 86400 * 7); // 7-day token or persistent local URL

    // Create MediaAsset record
    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        key,
        bucket: bucket || s3Service.getBucket(),
        fileName,
        fileSize: Number(fileSize),
        mimeType,
        category,
        url: downloadUrl,
        propertyId: propertyId || null,
        creativeId: creativeId || null,
        organizationId,
        uploadedById: userId,
      },
    });

    // Update Property if applicable
    if (propertyId) {
      if (category === 'PROPERTY_COVER') {
        await prisma.property.update({
          where: { id: propertyId },
          data: { coverImage: downloadUrl },
        });
      } else if (category === 'PROPERTY_IMAGE') {
        const prop = await prisma.property.findUnique({
          where: { id: propertyId },
          select: { images: true },
        });
        let existingImages: string[] = [];
        try {
          if (prop?.images) {
            existingImages = JSON.parse(prop.images);
            if (!Array.isArray(existingImages)) existingImages = [];
          }
        } catch {
          existingImages = [];
        }
        if (!existingImages.includes(downloadUrl)) {
          existingImages.push(downloadUrl);
          await prisma.property.update({
            where: { id: propertyId },
            data: { images: JSON.stringify(existingImages) },
          });
        }
      }
    }

    // Update AdCreative if applicable
    if (creativeId && category === 'AD_CREATIVE') {
      await prisma.adCreative.update({
        where: { id: creativeId },
        data: {
          renderedImageUrl: downloadUrl,
          imageUrl: downloadUrl,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: mediaAsset,
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ success: false, error: 'Media asset with this S3 key already exists' });
      return;
    }
    console.error('Confirm upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to record media asset' });
  }
});

/**
 * GET /api/media
 * List media assets for caller's organization
 */
mediaRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { category, propertyId, creativeId } = req.query as {
      category?: string;
      propertyId?: string;
      creativeId?: string;
    };

    const where: any = {};
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = req.user!.organizationId;
    } else if (req.query.organizationId) {
      where.organizationId = req.query.organizationId as string;
    }

    if (category) where.category = category;
    if (propertyId) where.propertyId = propertyId;
    if (creativeId) where.creativeId = creativeId;

    const assets = await prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({
      success: true,
      count: assets.length,
      data: assets,
    });
  } catch (error) {
    console.error('List media assets error:', error);
    res.status(500).json({ success: false, error: 'Failed to list media assets' });
  }
});

/**
 * GET /api/media/presign-download/:id
 * Generate fresh presigned download URL with strict multi-tenant authorization
 */
mediaRouter.get('/presign-download/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const where: any = { id };
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = organizationId;
    }

    const asset = await prisma.mediaAsset.findFirst({ where });
    if (!asset) {
      res.status(404).json({ success: false, error: 'Media asset not found or access denied' });
      return;
    }

    const { downloadUrl, expiresIn } = await s3Service.getPresignedDownloadUrl(asset.key, 900);

    res.json({
      success: true,
      data: {
        downloadUrl,
        expiresIn,
        mediaAsset: asset,
      },
    });
  } catch (error) {
    console.error('Presign download error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate download URL' });
  }
});

/**
 * DELETE /api/media/:id
 * Secure deletion: deletes object from S3/storage and removes DB record
 */
mediaRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const where: any = { id };
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = organizationId;
    }

    const asset = await prisma.mediaAsset.findFirst({ where });
    if (!asset) {
      res.status(404).json({ success: false, error: 'Media asset not found or access denied' });
      return;
    }

    // 1. Delete physical object from S3 or local disk with safe retry handling
    try {
      await s3Service.deleteObjectWithRetry(asset.key, 3);
    } catch (storageErr: any) {
      console.error(`[mediaRouter] S3 object deletion failed for ${asset.key}:`, storageErr);
      res.status(502).json({
        success: false,
        error: `Failed to safely delete storage object: ${storageErr.message}. Database record was preserved to avoid orphaned state.`,
      });
      return;
    }

    // 2. Delete database record
    await prisma.mediaAsset.delete({
      where: { id: asset.id },
    });

    // 3. Clean up references if attached to Property
    if (asset.propertyId) {
      const prop = await prisma.property.findUnique({
        where: { id: asset.propertyId },
        select: { coverImage: true, images: true },
      });

      if (prop) {
        if (prop.coverImage === asset.url) {
          await prisma.property.update({
            where: { id: asset.propertyId },
            data: { coverImage: null },
          });
        }
        if (prop.images) {
          try {
            const parsed = JSON.parse(prop.images);
            if (Array.isArray(parsed)) {
              const updated = parsed.filter((u: string) => u !== asset.url);
              await prisma.property.update({
                where: { id: asset.propertyId },
                data: { images: JSON.stringify(updated) },
              });
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Media asset deleted successfully',
      data: { id: asset.id, key: asset.key },
    });
  } catch (error) {
    console.error('Delete media asset error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete media asset' });
  }
});

