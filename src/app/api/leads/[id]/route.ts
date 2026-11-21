import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        property: true,
        campaign: true,
        assignedTo: { select: { id: true, name: true, email: true, phone: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
        },
        whatsappMessages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: lead });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const oldLead = await prisma.lead.findUnique({ where: { id: params.id } });

    if (!oldLead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const updated = await prisma.lead.update({
      where: { id: params.id },
      data: {
        status: body.status !== undefined ? body.status : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
        assignedToId: body.assignedToId !== undefined ? body.assignedToId : undefined,
      },
    });

    // If status changed, record activity
    if (body.status && body.status !== oldLead.status) {
      await prisma.leadActivity.create({
        data: {
          leadId: params.id,
          type: 'STATUS_CHANGE',
          title: `Status updated to ${body.status}`,
          details: body.activityNote || `Status changed from ${oldLead.status} to ${body.status}`,
        },
      });
    }

    // If note added
    if (body.note) {
      await prisma.leadActivity.create({
        data: {
          leadId: params.id,
          type: 'NOTE_ADDED',
          title: 'Broker Note Added',
          details: body.note,
        },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update lead' }, { status: 500 });
  }
}
