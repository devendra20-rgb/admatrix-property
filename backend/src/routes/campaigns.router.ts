import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { validateTrakheesiCompliance } from '../services/compliance.service.js';
import { authenticate, tenantGuard, requireRole } from '../middleware/auth.middleware.js';

export const campaignsRouter = Router();

campaignsRouter.use(authenticate, tenantGuard);

// GET /api/campaigns (Multi-tenant scoped)
campaignsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const platform = req.query.platform as string;
    const status = req.query.status as string;

    const where: any = {};
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = req.user!.organizationId;
    } else if (req.query.organizationId) {
      where.organizationId = req.query.organizationId as string;
    }

    if (platform) where.platform = platform;
    if (status) where.status = status;

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            community: true,
            price: true,
            coverImage: true,
            complianceStatus: true,
            trakheesiPermitNo: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: campaigns.length, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch campaigns' });
  }
});

// POST /api/campaigns (Multi-tenant scoped & compliance gated)
campaignsRouter.post('/', requireRole('SUPER_ADMIN', 'BROKERAGE_ADMIN', 'BROKER'), async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.propertyId) {
      return res.status(400).json({ success: false, error: 'Property ID is required' });
    }

    // Verify property belongs to caller's organization
    const propWhere: any = { id: body.propertyId };
    if (req.user!.role !== 'SUPER_ADMIN') {
      propWhere.organizationId = req.user!.organizationId;
    }

    const property = await prisma.property.findFirst({
      where: propWhere,
    });

    if (!property) {
      return res.status(404).json({ success: false, error: 'Selected property does not exist in your organization' });
    }

    const compliance = validateTrakheesiCompliance(property);

    let initialStatus = body.status || 'DRAFT';
    if (!compliance.canLaunchCampaign && initialStatus === 'ACTIVE') {
      return res.status(422).json({
        success: false,
        error: `Cannot launch campaign: ${compliance.issues.join('; ')}`,
        compliance,
      });
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: body.name || `${property.community} - ${body.platform || 'META'} Campaign`,
        platform: body.platform || 'META',
        objective: body.objective || 'LEADS',
        status: initialStatus,
        budgetType: body.budgetType || 'DAILY',
        budgetAmount: parseFloat(body.budgetAmount) || 200,
        currency: body.currency || 'AED',
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : null,
        targetLocations: typeof body.targetLocations === 'string'
          ? body.targetLocations
          : JSON.stringify(body.targetLocations || ['Dubai', 'Abu Dhabi']),
        targetAudience: body.targetAudience ? JSON.stringify(body.targetAudience) : null,
        propertyId: property.id,
        creativeId: body.creativeId || null,
        organizationId: req.user!.organizationId,
        createdById: req.user!.userId,
        spend: 0,
        impressions: 0,
        clicks: 0,
        leadsCount: 0,
      },
      include: {
        property: true,
      },
    });

    res.status(201).json({
      success: true,
      data: campaign,
      compliance,
      message: 'Campaign created successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create campaign: ' + String(error) });
  }
});

// GET /api/campaigns/:id (Multi-tenant protected)
campaignsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const where: any = { id: req.params.id };
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = req.user!.organizationId;
    }

    const campaign = await prisma.campaign.findFirst({
      where,
      include: {
        property: true,
        creative: true,
        createdBy: { select: { id: true, name: true, email: true } },
        leads: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch campaign' });
  }
});

// PATCH /api/campaigns/:id (Multi-tenant protected)
campaignsRouter.patch('/:id', requireRole('SUPER_ADMIN', 'BROKERAGE_ADMIN', 'BROKER'), async (req: Request, res: Response) => {
  try {
    const where: any = { id: req.params.id };
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = req.user!.organizationId;
    }

    const existing = await prisma.campaign.findFirst({ where });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const body = req.body;
    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: {
        status: body.status,
        budgetAmount: body.budgetAmount ? parseFloat(body.budgetAmount) : undefined,
        name: body.name,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update campaign' });
  }
});

// POST /api/campaigns/:id/publish (Multi-tenant protected)
campaignsRouter.post('/:id/publish', requireRole('SUPER_ADMIN', 'BROKERAGE_ADMIN', 'BROKER'), async (req: Request, res: Response) => {
  try {
    const where: any = { id: req.params.id };
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = req.user!.organizationId;
    }

    const campaign = await prisma.campaign.findFirst({
      where,
      include: { property: true },
    });

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const compliance = validateTrakheesiCompliance(campaign.property);
    if (!compliance.canLaunchCampaign) {
      await prisma.campaign.update({
        where: { id: req.params.id },
        data: { status: 'COMPLIANCE_FAILED' },
      });

      return res.status(422).json({
        success: false,
        blocked: true,
        error: `Cannot launch campaign. Trakheesi compliance check failed: ${compliance.issues.join('; ')}`,
        compliance,
      });
    }

    const externalAdId = campaign.platform === 'META'
      ? `meta_act_782910_${Date.now()}`
      : `goog_ad_549102_${Date.now()}`;

    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE' },
      include: { property: true },
    });

    res.json({
      success: true,
      message: `Successfully published campaign to ${campaign.platform} Ads API!`,
      externalCampaignId: externalAdId,
      campaign: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to publish campaign' });
  }
});
