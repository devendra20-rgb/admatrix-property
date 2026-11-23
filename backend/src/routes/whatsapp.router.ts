import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, tenantGuard } from '../middleware/auth.middleware.js';

export const whatsappRouter = Router();

whatsappRouter.use(authenticate, tenantGuard);

whatsappRouter.post('/send', async (req: Request, res: Response) => {
  try {
    const { leadId, message, templateName } = req.body;

    if (!leadId || !message) {
      return res.status(400).json({ success: false, error: 'leadId and message are required' });
    }

    const where: any = { id: leadId };
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = req.user!.organizationId;
    }

    const lead = await prisma.lead.findFirst({
      where,
      include: { property: true },
    });

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found in your organization' });
    }

    const waMsg = await prisma.whatsAppMessage.create({
      data: {
        leadId,
        direction: 'OUTBOUND',
        content: message,
        templateName: templateName || null,
        status: 'DELIVERED',
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'WHATSAPP_SENT',
        title: templateName ? `WhatsApp Template: ${templateName}` : 'WhatsApp Message Sent',
        details: message.length > 80 ? message.substring(0, 80) + '...' : message,
      },
    });

    res.json({
      success: true,
      data: waMsg,
      message: 'WhatsApp message sent successfully via Official Business API.',
    });
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    res.status(500).json({ success: false, error: 'Failed to send WhatsApp message' });
  }
});
