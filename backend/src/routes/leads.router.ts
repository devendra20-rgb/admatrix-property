import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, tenantGuard } from '../middleware/auth.middleware.js';

export const leadsRouter = Router();

leadsRouter.use(authenticate, tenantGuard);

// GET /api/leads (Multi-tenant scoped)
leadsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const propertyId = req.query.propertyId as string;
    const search = (req.query.search as string) || '';

    const where: any = {};
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = req.user!.organizationId;
    } else if (req.query.organizationId) {
      where.organizationId = req.query.organizationId as string;
    }

    if (status) where.status = status;
    if (propertyId) where.propertyId = propertyId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        property: {
          select: { id: true, title: true, community: true, price: true, coverImage: true },
        },
        campaign: {
          select: { id: true, name: true, platform: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch leads' });
  }
});

// POST /api/leads (Scoped to caller's organization)
leadsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.name || !body.phone) {
      return res.status(400).json({ success: false, error: 'Name and Phone are required' });
    }

    const organizationId = req.user!.organizationId;

    // If propertyId supplied, verify it belongs to this organization
    if (body.propertyId) {
      const prop = await prisma.property.findFirst({
        where: { id: body.propertyId, organizationId },
      });
      if (!prop) {
        return res.status(400).json({ success: false, error: 'Associated property does not belong to your organization' });
      }
    }

    // If campaignId supplied, verify it belongs to this organization (Zero-leakage isolation)
    if (body.campaignId) {
      const camp = await prisma.campaign.findFirst({
        where: { id: body.campaignId, organizationId },
      });
      if (!camp) {
        return res.status(400).json({ success: false, error: 'Associated campaign does not belong to your organization' });
      }
    }

    // If assignedToId supplied, verify target agent belongs to this organization
    let assignedToId = req.user!.userId;
    if (body.assignedToId) {
      const targetUser = await prisma.user.findFirst({
        where: { id: body.assignedToId, organizationId },
      });
      if (!targetUser) {
        return res.status(400).json({ success: false, error: 'Assigned agent does not belong to your organization' });
      }
      assignedToId = targetUser.id;
    }

    const lead = await prisma.lead.create({
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email || null,
        status: body.status || 'NEW',
        sourcePlatform: body.sourcePlatform || 'META',
        notes: body.notes || 'Inquired via real estate campaign',
        propertyId: body.propertyId || null,
        campaignId: body.campaignId || null,
        organizationId,
        assignedToId,
        createdById: req.user!.userId,
      },
      include: {
        property: true,
        campaign: true,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'STATUS_CHANGE',
        title: `Lead captured via ${lead.sourcePlatform}`,
        details: `Assigned to ${req.user!.name}. Source: ${lead.campaign?.name || 'Direct / Organic'}.`,
      },
    });

    await prisma.whatsAppMessage.create({
      data: {
        leadId: lead.id,
        direction: 'OUTBOUND',
        templateName: 'dubai_property_lead_welcome_v1',
        content: `Dear ${lead.name}, thank you for your interest in ${lead.property?.title || 'our luxury Dubai listings'}. A licensed property advisor from our team has been assigned to assist you.`,
        status: 'DELIVERED',
      },
    });

    res.status(201).json({ success: true, data: lead, message: 'Lead recorded and WhatsApp auto-responder triggered.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create lead: ' + String(error) });
  }
});

// GET /api/leads/:id (Multi-tenant protected)
leadsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const where: any = { id: req.params.id };
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = req.user!.organizationId;
    }

    const lead = await prisma.lead.findFirst({
      where,
      include: {
        property: true,
        campaign: true,
        assignedTo: { select: { id: true, name: true, email: true, phone: true } },
        activities: { orderBy: { createdAt: 'desc' } },
        whatsappMessages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch lead' });
  }
});

// PATCH /api/leads/:id (Multi-tenant protected)
leadsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const where: any = { id: req.params.id };
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = req.user!.organizationId;
    }

    const oldLead = await prisma.lead.findFirst({ where });
    if (!oldLead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const body = req.body;

    // Verify assignedToId belongs to same organization
    if (body.assignedToId && body.assignedToId !== oldLead.assignedToId) {
      const targetUser = await prisma.user.findFirst({
        where: { id: body.assignedToId, organizationId: oldLead.organizationId },
      });
      if (!targetUser) {
        return res.status(400).json({ success: false, error: 'Assigned agent does not belong to your organization' });
      }
    }

    const updated = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        status: body.status !== undefined ? body.status : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
        assignedToId: body.assignedToId !== undefined ? body.assignedToId : undefined,
      },
    });

    if (body.status && body.status !== oldLead.status) {
      await prisma.leadActivity.create({
        data: {
          leadId: req.params.id,
          type: 'STATUS_CHANGE',
          title: `Status updated to ${body.status}`,
          details: body.activityNote || `Status changed from ${oldLead.status} to ${body.status}`,
        },
      });
    }

    if (body.note) {
      await prisma.leadActivity.create({
        data: {
          leadId: req.params.id,
          type: 'NOTE_ADDED',
          title: 'Broker Note Added',
          details: body.note,
        },
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update lead' });
  }
});
