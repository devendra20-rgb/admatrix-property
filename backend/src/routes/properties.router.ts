import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { validateTrakheesiCompliance } from '../services/compliance.service.js';
import { ensureDbSeeded } from '../seed.js';

export const propertiesRouter = Router();

// GET /api/properties
propertiesRouter.get('/', async (req: Request, res: Response) => {
  try {
    await ensureDbSeeded();

    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const compliance = (req.query.compliance as string) || '';
    const type = (req.query.type as string) || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { community: { contains: search } },
        { trakheesiPermitNo: { contains: search } },
        { buildingProject: { contains: search } },
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

// POST /api/properties
propertiesRouter.post('/', async (req: Request, res: Response) => {
  try {
    await ensureDbSeeded();
    const body = req.body;

    const complianceResult = validateTrakheesiCompliance(body);

    let org = await prisma.organization.findFirst();
    if (!org) {
      await ensureDbSeeded();
      org = await prisma.organization.findFirst();
    }
    const user = await prisma.user.findFirst({ where: { organizationId: org!.id } });

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
        organizationId: org!.id,
        createdById: user!.id,
      },
    });

    await prisma.complianceLog.create({
      data: {
        propertyId: property.id,
        status: complianceResult.status,
        reason: complianceResult.issues.length > 0 ? complianceResult.issues.join('; ') : 'Compliant',
        performedBy: user!.name,
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

// GET /api/properties/:id
propertiesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        campaigns: true,
        leads: { orderBy: { createdAt: 'desc' } },
        adCreatives: true,
        complianceLogs: { orderBy: { checkedAt: 'desc' } },
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

// PUT /api/properties/:id
propertiesRouter.put('/:id', async (req: Request, res: Response) => {
  try {
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
      },
    });

    res.json({ success: true, data: updated, compliance: complianceResult });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update property' });
  }
});

// DELETE /api/properties/:id
propertiesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.property.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete property' });
  }
});

