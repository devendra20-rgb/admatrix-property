import { Router, Request, Response } from 'express';
import { generateDubaiPropertyAds, AdGenerationParams } from '../services/ai.service.js';
import { prisma } from '../lib/prisma.js';
import { authenticate, tenantGuard } from '../middleware/auth.middleware.js';

export const aiRouter = Router();

aiRouter.use(authenticate, tenantGuard);

aiRouter.post('/generate-ad', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    let property: any = null;

    if (body.propertyId) {
      const where: any = { id: body.propertyId };
      if (req.user!.role !== 'SUPER_ADMIN') {
        where.organizationId = req.user!.organizationId;
      }

      property = await prisma.property.findFirst({ where });
      if (!property) {
        return res.status(404).json({ success: false, error: 'Specified property not found in your organization' });
      }
    }

    const params: AdGenerationParams = {
      propertyTitle: body.propertyTitle || property?.title || 'Dubai Luxury Residence',
      propertyType: body.propertyType || property?.propertyType || 'Villa',
      price: body.price ? parseFloat(body.price) : (property?.price || 5000000),
      currency: body.currency || property?.currency || 'AED',
      community: body.community || property?.community || 'Palm Jumeirah',
      bedrooms: body.bedrooms ? parseInt(body.bedrooms) : (property?.bedrooms || 4),
      builtUpArea: body.builtUpArea ? parseFloat(body.builtUpArea) : (property?.builtUpArea || 4500),
      platform: body.platform || 'META',
      language: body.language || 'both',
      tone: body.tone || 'LUXURY',
      trakheesiPermitNo: body.trakheesiPermitNo || property?.trakheesiPermitNo || '',
      isOffPlan: body.isOffPlan !== undefined ? body.isOffPlan : (property?.isOffPlan || false),
      developerName: body.developerName || property?.developerName || '',
    };

    const result = generateDubaiPropertyAds(params);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Failed to generate ad copy:', error);
    res.status(500).json({ success: false, error: 'Failed to generate ad copy' });
  }
});
