import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDbSeeded } from '@/lib/seed';

export async function GET(request: NextRequest) {
  try {
    await ensureDbSeeded();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const propertyId = searchParams.get('propertyId');
    const search = searchParams.get('search') || '';

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

    return NextResponse.json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    console.error('Failed to fetch leads:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbSeeded();
    const body = await request.json();

    if (!body.name || !body.phone) {
      return NextResponse.json({ success: false, error: 'Name and Phone are required' }, { status: 400 });
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

    // Automatically create initial Lead Activity
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: 'STATUS_CHANGE',
        title: `Lead captured via ${lead.sourcePlatform}`,
        details: `Assigned to ${broker?.name || 'Lead Pool'}. Source: ${lead.campaign?.name || 'Direct / Organic'}.`,
      },
    });

    // Module 8 Automation: If phone is present, simulate automated WhatsApp notification greeting
    await prisma.whatsAppMessage.create({
      data: {
        leadId: lead.id,
        direction: 'OUTBOUND',
        templateName: 'dubai_property_lead_welcome_v1',
        content: `Dear ${lead.name}, thank you for your interest in ${lead.property?.title || 'our luxury Dubai listings'}. A licensed property advisor from Apex Luxury Properties has been assigned to assist you.`,
        status: 'DELIVERED',
      },
    });

    return NextResponse.json({ success: true, data: lead, message: 'Lead recorded and WhatsApp auto-responder triggered.' }, { status: 201 });
  } catch (error) {
    console.error('Failed to create lead:', error);
    return NextResponse.json({ success: false, error: 'Failed to create lead: ' + String(error) }, { status: 500 });
  }
}
