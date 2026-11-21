import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTrakheesiCompliance } from '@/lib/compliance-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        property: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    // Strict Trakheesi Compliance Validation
    const compliance = validateTrakheesiCompliance(campaign.property);

    if (!compliance.canLaunchCampaign) {
      // Per engineering rule #16: Never bypass compliance checks
      await prisma.campaign.update({
        where: { id: params.id },
        data: { status: 'COMPLIANCE_FAILED' },
      });

      return NextResponse.json({
        success: false,
        blocked: true,
        error: `Cannot launch campaign. Trakheesi compliance check failed: ${compliance.issues.join('; ')}`,
        compliance,
      }, { status: 422 });
    }

    // Simulate API publishing handshake with Meta / Google
    const externalAdId = campaign.platform === 'META'
      ? `meta_act_782910_${Date.now()}`
      : `goog_ad_549102_${Date.now()}`;

    const updated = await prisma.campaign.update({
      where: { id: params.id },
      data: {
        status: 'ACTIVE',
      },
      include: { property: true },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully verified compliance and published campaign to ${campaign.platform} Ads API!`,
      externalCampaignId: externalAdId,
      campaign: updated,
    });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json({ success: false, error: 'Failed to publish campaign' }, { status: 500 });
  }
}
