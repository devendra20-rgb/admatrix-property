import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { ensureDbSeeded } from '../seed.js';

export const leadsRouter = Router();

// GET /api/leads
leadsRouter.get('/', async (req: Request, res: Response) => {
  try {
    await ensureDbSeeded();
    const status = req.query.status as string;
    const propertyId = req.query.propertyId as string;
    const search = (req.query.search as string) || '';

    const where: any = {};
    if (status) where.status = status;
    if (propertyId) where.propertyId = propertyId;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
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

// POST /api/leads
leadsRouter.post('/', async (req: Request, res: Response) => {
  try {
    await ensureDbSeeded();
    const body = req.body;

    if (!body.name || !body.phone) {
      return res.status(400).json({ success: false, error: 'Name and Phone are required' });
    }

    const org = await prisma.organization.findFirst();
    const broker = await prisma.user.findFirst();

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
        organizationId: org!.id,
        assignedToId: body.assignedToId || broker?.id || null,
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
        details: `Assigned to ${broker?.name || 'Lead Pool'}. Source: ${lead.campaign?.name || 'Direct / Organic'}.`,
      },
    });

    await prisma.whatsAppMessage.create({
      data: {
        leadId: lead.id,
        direction: 'OUTBOUND',
        templateName: 'dubai_property_lead_welcome_v1',
        content: `Dear ${lead.name}, thank you for your interest in ${lead.property?.title || 'our luxury Dubai listings'}. A licensed property advisor from Apex Luxury Properties has been assigned to assist you.`,
        status: 'DELIVERED',
      },
    });

    res.status(201).json({ success: true, data: lead, message: 'Lead recorded and WhatsApp auto-responder triggered.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create lead: ' + String(error) });
  }
});

// GET /api/leads/:id
leadsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
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

// PATCH /api/leads/:id
leadsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const oldLead = await prisma.lead.findUnique({ where: { id: req.params.id } });

    if (!oldLead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
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
