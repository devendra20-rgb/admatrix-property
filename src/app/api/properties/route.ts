import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTrakheesiCompliance } from '@/lib/compliance-engine';
import { ensureDbSeeded } from '@/lib/seed';

export async function GET(request: NextRequest) {
  try {
    await ensureDbSeeded();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const compliance = searchParams.get('compliance') || '';
    const type = searchParams.get('type') || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { community: { contains: search } },
        { trakheesiPermitNo: { contains: search } },
        { buildingProject: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (compliance) {
      where.complianceStatus = compliance;
    }

    if (type) {
      where.propertyType = type;
    }

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

    return NextResponse.json({ success: true, count: properties.length, data: properties });
  } catch (error) {
    console.error('Failed to fetch properties:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch properties' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDbSeeded();
    const body = await request.json();

    // Run Trakheesi compliance validation
    const complianceResult = validateTrakheesiCompliance(body);

    // Get default org & user if not provided
    let org = await prisma.organization.findFirst();
    if (!org) {
      await ensureDbSeeded();
      org = await prisma.organization.findFirst();
    }
    const user = await prisma.user.findFirst({ where: { organizationId: org!.id } });

    // Generate Madmoun QR code if permit provided and no QR
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
        images: body.images ? JSON.stringify(body.images) : null,
        organizationId: org!.id,
        createdById: user!.id,
      },
    });

    // Record compliance log
    await prisma.complianceLog.create({
      data: {
        propertyId: property.id,
        status: complianceResult.status,
        reason: complianceResult.issues.length > 0 ? complianceResult.issues.join('; ') : 'Compliant',
        performedBy: user!.name,
      },
    });

    return NextResponse.json({
      success: true,
      data: property,
      compliance: complianceResult,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create property:', error);
    return NextResponse.json({ success: false, error: 'Failed to create property: ' + String(error) }, { status: 500 });
  }
}
