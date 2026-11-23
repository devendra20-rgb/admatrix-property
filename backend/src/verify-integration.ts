import { prisma } from './lib/prisma.js';
import dotenv from 'dotenv';
dotenv.config();

interface TestResult {
  suite: string;
  test: string;
  status: 'PASSED' | 'FAILED';
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function record(suite: string, test: string, passed: boolean, details?: string, error?: any) {
  results.push({
    suite,
    test,
    status: passed ? 'PASSED' : 'FAILED',
    details,
    error: error ? (error.message || String(error)) : undefined,
  });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] [${suite}] ${test} ${details ? '- ' + details : ''}`);
  if (error) console.error('  Error:', error);
}

async function runVerification() {
  console.log('====================================================');
  console.log('ADMATRIX PROPERTY - POSTGRESQL INTEGRATION AUDIT');
  console.log('====================================================\n');

  // 1. Connection & DB Info
  try {
    const rawVersion: any = await prisma.$queryRaw`SELECT version() as ver, current_database() as db, current_schema() as schema`;
    record('1. Database Engine', 'PostgreSQL Connectivity', true, `Connected to ${rawVersion[0].db} (${rawVersion[0].ver.split(' ')[0]} ${rawVersion[0].ver.split(' ')[1]}), schema: ${rawVersion[0].schema}`);
  } catch (err) {
    record('1. Database Engine', 'PostgreSQL Connectivity', false, 'Failed to connect to PostgreSQL', err);
    return;
  }

  // 2. Verify Seed Records Across All Models
  let org: any = null;
  let user: any = null;
  try {
    const orgs = await prisma.organization.findMany();
    const users = await prisma.user.findMany();
    const properties = await prisma.property.findMany();
    const campaigns = await prisma.campaign.findMany();
    const leads = await prisma.lead.findMany();
    const complianceLogs = await prisma.complianceLog.count();
    const leadActivities = await prisma.leadActivity.count();
    const waMessages = await prisma.whatsAppMessage.count();

    org = orgs[0];
    user = users[0];

    record('2. Seed Verification', 'Organizations seeded', orgs.length > 0, `Count: ${orgs.length} (${orgs[0]?.name})`);
    record('2. Seed Verification', 'Users seeded', users.length >= 2, `Count: ${users.length} (${users.map(u => u.name).join(', ')})`);
    record('2. Seed Verification', 'Properties seeded', properties.length >= 4, `Count: ${properties.length}`);
    record('2. Seed Verification', 'Campaigns seeded', campaigns.length >= 3, `Count: ${campaigns.length}`);
    record('2. Seed Verification', 'Leads seeded', leads.length >= 4, `Count: ${leads.length}`);
    record('2. Seed Verification', 'ComplianceLogs & Activities seeded', complianceLogs > 0 && leadActivities > 0, `Logs: ${complianceLogs}, Activities: ${leadActivities}, WhatsApp: ${waMessages}`);
  } catch (err) {
    record('2. Seed Verification', 'Seed data query', false, 'Failed to query seed data', err);
  }

  // 3. Relational Queries & Foreign-Key Integrity
  try {
    const propWithRelations = await prisma.property.findFirst({
      include: {
        organization: true,
        createdBy: true,
        campaigns: true,
        leads: true,
        complianceLogs: true,
      },
    });

    record(
      '3. Relational Queries',
      'Property nested joins',
      Boolean(propWithRelations && propWithRelations.organization && propWithRelations.createdBy),
      `Resolved Org: ${propWithRelations?.organization?.name}, CreatedBy: ${propWithRelations?.createdBy?.name}, Campaigns: ${propWithRelations?.campaigns?.length}`
    );
  } catch (err) {
    record('3. Relational Queries', 'Property nested joins', false, 'Failed relational join query', err);
  }

  // 4. Constraint Enforcement
  // 4a. Unique constraint on User email
  try {
    await prisma.user.create({
      data: {
        name: 'Duplicate Email User',
        email: user.email, // duplicate
        organizationId: org.id,
      },
    });
    record('4. Constraints', 'Unique constraint on User.email', false, 'Allowed duplicate email violation');
  } catch (err: any) {
    const isP2002 = err.code === 'P2002' || String(err).includes('Unique constraint');
    record('4. Constraints', 'Unique constraint on User.email', isP2002, `Successfully rejected duplicate email (Code: ${err.code})`);
  }

  // 4b. Foreign key constraint violation on Property.organizationId
  try {
    await prisma.property.create({
      data: {
        title: 'FK Test Invalid Org',
        description: 'Test',
        propertyType: 'Apartment',
        listingType: 'Sale',
        price: 1000000,
        bedrooms: 2,
        bathrooms: 2,
        builtUpArea: 1200,
        furnishingStatus: 'Furnished',
        community: 'Downtown',
        address: 'Test',
        organizationId: '00000000-0000-0000-0000-000000000000', // Non-existent org
        createdById: user.id,
      },
    });
    record('4. Constraints', 'Foreign Key constraint on Property.organizationId', false, 'Allowed invalid organizationId');
  } catch (err: any) {
    const isP2003 = err.code === 'P2003' || String(err).includes('foreign key constraint');
    record('4. Constraints', 'Foreign Key constraint on Property.organizationId', isP2003, `Successfully enforced foreign key (Code: ${err.code})`);
  }

  // 5. CRUD Mutation Cycle
  let testPropId = '';
  try {
    // Create
    const created = await prisma.property.create({
      data: {
        title: 'PostgreSQL Audit Test Villa',
        description: 'Automated integration test property',
        propertyType: 'Villa',
        listingType: 'Sale',
        price: 12500000,
        bedrooms: 4,
        bathrooms: 5,
        builtUpArea: 5500,
        furnishingStatus: 'Furnished',
        community: 'Palm Jumeirah',
        address: 'Frond G, Palm Jumeirah',
        trakheesiPermitNo: '7199990001',
        permitExpiryDate: new Date(Date.now() + 180 * 86400000),
        formACompleted: true,
        complianceStatus: 'COMPLIANT',
        organizationId: org.id,
        createdById: user.id,
      },
    });
    testPropId = created.id;
    record('5. CRUD Cycle', 'Property CREATE', Boolean(created.id), `ID: ${created.id}`);

    // Create related compliance log
    const log = await prisma.complianceLog.create({
      data: {
        propertyId: testPropId,
        status: 'COMPLIANT',
        reason: 'Automated test verification',
        performedBy: 'Test Runner',
      },
    });
    record('5. CRUD Cycle', 'ComplianceLog CREATE', Boolean(log.id), `Log ID: ${log.id}`);

    // Update
    const updated = await prisma.property.update({
      where: { id: testPropId },
      data: { price: 13000000, complianceStatus: 'ACTION_REQUIRED' },
    });
    record('5. CRUD Cycle', 'Property UPDATE', updated.price === 13000000 && updated.complianceStatus === 'ACTION_REQUIRED', `Updated Price: AED ${updated.price}`);

    // Delete (with Cascade on ComplianceLog)
    await prisma.property.delete({
      where: { id: testPropId },
    });
    const logCheck = await prisma.complianceLog.findFirst({ where: { propertyId: testPropId } });
    record('5. CRUD Cycle', 'Property DELETE with Cascade', logCheck === null, 'Property deleted and related ComplianceLog cascaded cleanly');
  } catch (err) {
    record('5. CRUD Cycle', 'CRUD lifecycle', false, 'Failed during CRUD cycle', err);
    if (testPropId) {
      try { await prisma.property.delete({ where: { id: testPropId } }); } catch {}
    }
  }

  // 6. SQLite Codebase Audit
  try {
    const fs = await import('fs');
    const path = await import('path');
    const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
    const isPostgresDatasource = schemaContent.includes('provider = "postgresql"');
    const hasSqliteInSchema = schemaContent.includes('provider = "sqlite"');

    record('6. SQLite Dependency Audit', 'Prisma Datasource is PostgreSQL', isPostgresDatasource && !hasSqliteInSchema, 'schema.prisma uses provider = "postgresql"');
  } catch (err) {
    record('6. SQLite Dependency Audit', 'Schema check', false, 'Failed to inspect schema', err);
  }

  console.log('\n====================================================');
  console.log('AUDIT SUMMARY');
  console.log('====================================================');
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  console.log(`Total Checks: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('====================================================');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runVerification().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});

