import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTrakheesiCompliance } from '@/lib/compliance-engine';
import { ensureDbSeeded } from '@/lib/seed';

export async function GET(request: NextRequest) {
  try {
    await ensureDbSeeded();
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');

    const where: any = {};
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

    return NextResponse.json({ success: true, count: campaigns.length, data: campaigns });
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbSeeded();
    const body = await request.json();

    if (!body.propertyId) {
      return NextResponse.json({ success: false, error: 'Property ID is required' }, { status: 400 });
    }

    // Check Property and compliance
    const property = await prisma.property.findUnique({
      where: { id: body.propertyId },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: 'Selected property does not exist' }, { status: 404 });
    }

    const compliance = validateTrakheesiCompliance(property);
    
    // Enforcement rule: Must not be expired or lacking permit if attempting to launch directly
    let initialStatus = body.status || 'DRAFT';
    if (!compliance.canLaunchCampaign && initialStatus === 'ACTIVE') {
      return NextResponse.json({
        success: false,
        error: `Cannot launch campaign: ${compliance.issues.join('; ')}`,
        compliance,
      }, { status: 422 });
    }

    const org = await prisma.organization.findFirst();
    const user = await prisma.user.findFirst();

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
        organizationId: org!.id,
        createdById: user!.id,
        spend: 0,
        impressions: 0,
        clicks: 0,
        leadsCount: 0,
      },
      include: {
        property: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: campaign,
      compliance,
      message: 'Campaign created successfully.',
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create campaign:', error);
    return NextResponse.json({ success: false, error: 'Failed to create campaign: ' + String(error) }, { status: 500 });
  }
}
