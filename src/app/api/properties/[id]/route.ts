import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTrakheesiCompliance } from '@/lib/compliance-engine';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        campaigns: true,
        leads: {
          orderBy: { createdAt: 'desc' },
        },
        adCreatives: true,
        complianceLogs: {
          orderBy: { checkedAt: 'desc' },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    const compliance = validateTrakheesiCompliance(property);

    return NextResponse.json({ success: true, data: property, compliance });
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch property' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const complianceResult = validateTrakheesiCompliance(body);

    const updated = await prisma.property.update({
      where: { id: params.id },
      data: {
        title: body.title,
        description: body.description,
        propertyType: body.propertyType,
        listingType: body.listingType,
        price: body.price ? parseFloat(body.price) : undefined,
        currency: body.currency,
        bedrooms: body.bedrooms ? parseInt(body.bedrooms) : undefined,
        bathrooms: body.bathrooms ? parseInt(body.bathrooms) : undefined,
        builtUpArea: body.builtUpArea ? parseFloat(body.builtUpArea) : undefined,
        furnishingStatus: body.furnishingStatus,
        community: body.community,
        buildingProject: body.buildingProject,
        address: body.address,
        trakheesiPermitNo: body.trakheesiPermitNo,
        permitExpiryDate: body.permitExpiryDate ? new Date(body.permitExpiryDate) : undefined,
        qrCodeUrl: body.qrCodeUrl,
        formACompleted: body.formACompleted,
        complianceStatus: complianceResult.status,
        complianceNotes: complianceResult.issues.join(' | ') || 'Compliant with DLD regulations',
        isOffPlan: body.isOffPlan,
        developerName: body.developerName,
        escrowNumber: body.escrowNumber,
        completionDate: body.completionDate ? new Date(body.completionDate) : undefined,
        coverImage: body.coverImage,
        images: body.images ? (typeof body.images === 'string' ? body.images : JSON.stringify(body.images)) : undefined,
      },
    });

    // Log update
    await prisma.complianceLog.create({
      data: {
        propertyId: params.id,
        status: complianceResult.status,
        reason: 'Property updated and re-validated.',
      },
    });

    return NextResponse.json({ success: true, data: updated, compliance: complianceResult });
  } catch (error) {
    console.error('Error updating property:', error);
    return NextResponse.json({ success: false, error: 'Failed to update property' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.property.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Error deleting property:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete property' }, { status: 500 });
  }
}
