import { prisma } from './prisma';
import { SAMPLE_ORGANIZATION, SAMPLE_USERS, SAMPLE_PROPERTIES, SAMPLE_CAMPAIGNS, SAMPLE_LEADS } from './sample-data';

export async function ensureDbSeeded() {
  try {
    const orgCount = await prisma.organization.count();
    if (orgCount > 0) {
      return { seeded: false, message: 'Database already initialized with data.' };
    }

    console.log('Seeding initial Admatrix Property records...');

    // 1. Organization
    await prisma.organization.create({
      data: SAMPLE_ORGANIZATION,
    });

    // 2. Users
    for (const u of SAMPLE_USERS) {
      await prisma.user.create({
        data: u,
      });
    }

    // 3. Properties
    for (const p of SAMPLE_PROPERTIES) {
      const { images, ...rest } = p;
      await prisma.property.create({
        data: {
          ...rest,
          images,
        },
      });

      // Also create compliance log
      await prisma.complianceLog.create({
        data: {
          propertyId: p.id,
          status: p.complianceStatus,
          reason: p.complianceNotes,
          performedBy: 'Compliance Automated Engine',
        },
      });
    }

    // 4. Campaigns
    for (const c of SAMPLE_CAMPAIGNS) {
      await prisma.campaign.create({
        data: c,
      });
    }

    // 5. Leads
    for (const l of SAMPLE_LEADS) {
      const createdLead = await prisma.lead.create({
        data: l,
      });

      // Sample activity
      await prisma.leadActivity.create({
        data: {
          leadId: createdLead.id,
          type: 'STATUS_CHANGE',
          title: `Lead captured via ${l.sourcePlatform} Ad`,
          details: `Source campaign: ${l.campaignId || 'Direct'}. Initial inquiry logged.`,
        },
      });

      if (l.status !== 'NEW') {
        await prisma.leadActivity.create({
          data: {
            leadId: createdLead.id,
            type: 'NOTE_ADDED',
            title: 'Agent Follow-up Logged',
            details: l.notes,
          },
        });
      }
    }

    console.log('Database successfully seeded!');
    return { seeded: true, message: 'Database initialized with realistic Dubai properties and campaigns.' };
  } catch (error) {
    console.error('Error seeding database:', error);
    return { seeded: false, error: String(error) };
  }
}
