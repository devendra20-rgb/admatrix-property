import { prisma } from './lib/prisma.js';
import { SAMPLE_ORGANIZATION, SAMPLE_USERS, SAMPLE_PROPERTIES, SAMPLE_CAMPAIGNS, SAMPLE_LEADS } from './lib/sample-data.js';
import { AuthService } from './services/auth.service.js';

export async function ensureDbSeeded() {
  try {
    const orgCount = await prisma.organization.count();
    const defaultPasswordHash = await AuthService.hashPassword('Password123!');

    // 1. Ensure primary organization exists
    let mainOrg = await prisma.organization.findFirst({
      where: { id: SAMPLE_ORGANIZATION.id },
    });
    if (!mainOrg) {
      mainOrg = await prisma.organization.create({
        data: SAMPLE_ORGANIZATION,
      });
    }

    // 2. Ensure standard 4-role persona accounts exist for testing
    const standardUsers = [
      {
        email: 'superadmin@admatrixplatform.ae',
        name: 'Platform Super Admin',
        role: 'SUPER_ADMIN',
        organizationId: mainOrg.id,
      },
      {
        email: 'admin@apexrealty.ae',
        name: 'Hamdan Al Maktoum',
        role: 'BROKERAGE_ADMIN',
        phone: '+971 50 123 4567',
        organizationId: mainOrg.id,
      },
      {
        email: 'sarah@apexrealty.ae',
        name: 'Sarah Jenkins',
        role: 'BROKER',
        phone: '+971 52 987 6543',
        organizationId: mainOrg.id,
      },
      {
        email: 'junior@apexrealty.ae',
        name: 'Tariq Al Nuaimi',
        role: 'AGENT',
        phone: '+971 55 456 7890',
        organizationId: mainOrg.id,
      },
    ];

    for (const u of standardUsers) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (!existing) {
        await prisma.user.create({
          data: {
            ...u,
            passwordHash: defaultPasswordHash,
          },
        });
      } else if (!existing.passwordHash) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash: defaultPasswordHash },
        });
      }
    }

    if (orgCount > 0) {
      return { seeded: false, message: 'Database already initialized with data.' };
    }

    console.log('Seeding initial Admatrix Property records...');

    // 1. Organization
    await prisma.organization.create({
      data: SAMPLE_ORGANIZATION,
    });

    // 2. Users (with Argon2id password hash)
    for (const u of SAMPLE_USERS) {
      await prisma.user.create({
        data: {
          ...u,
          passwordHash: defaultPasswordHash,
        },
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

    console.log('Database successfully seeded with Argon2id passwords!');
    return { seeded: true, message: 'Database initialized with realistic Dubai properties and campaigns.' };
  } catch (error) {
    console.error('Error seeding database:', error);
    return { seeded: false, error: String(error) };
  }
}

// When executed directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('seed')) {
  ensureDbSeeded()
    .then(console.log)
    .catch(console.error);
}
