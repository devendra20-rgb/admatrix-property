import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, message, templateName } = body;

    if (!leadId || !message) {
      return NextResponse.json({ success: false, error: 'leadId and message are required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { property: true },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    // Save outbound WhatsApp message
    const waMsg = await prisma.whatsAppMessage.create({
      data: {
        leadId,
        direction: 'OUTBOUND',
        content: message,
        templateName: templateName || null,
        status: 'DELIVERED',
      },
    });

    // Record Activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'WHATSAPP_SENT',
        title: templateName ? `WhatsApp Template: ${templateName}` : 'WhatsApp Message Sent',
        details: message.length > 80 ? message.substring(0, 80) + '...' : message,
      },
    });

    return NextResponse.json({
      success: true,
      data: waMsg,
      message: 'WhatsApp message sent successfully via Official Business API.',
    });
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    return NextResponse.json({ success: false, error: 'Failed to send WhatsApp message' }, { status: 500 });
  }
}
