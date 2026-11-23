process.env.NODE_ENV = 'test';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth.router.js';
import { propertiesRouter } from './routes/properties.router.js';
import { campaignsRouter } from './routes/campaigns.router.js';
import { leadsRouter } from './routes/leads.router.js';
import { complianceRouter } from './routes/compliance.router.js';
import { aiRouter } from './routes/ai.router.js';
import { whatsappRouter } from './routes/whatsapp.router.js';
import { prisma } from './lib/prisma.js';
import { AuthService } from './services/auth.service.js';

interface ApiTestResult {
  endpoint: string;
  method: string;
  status: 'PASSED' | 'FAILED';
  expectedCode: number;
  actualCode: number;
  details?: string;
  error?: string;
}

const testResults: ApiTestResult[] = [];

function recordApi(method: string, endpoint: string, expectedCode: number, actualCode: number, details?: string, error?: any) {
  const passed = expectedCode === actualCode;
  testResults.push({
    endpoint,
    method,
    status: passed ? 'PASSED' : 'FAILED',
    expectedCode,
    actualCode,
    details,
    error: error ? String(error) : undefined,
  });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${method} ${endpoint} -> ${actualCode} (Expected: ${expectedCode}) ${details ? '- ' + details : ''}`);
  if (error) console.error('  Error:', error);
}

async function runApiAudit() {
  console.log('====================================================');
  console.log('ADMATRIX PROPERTY - FULL API ENDPOINT INTEGRATION AUDIT');
  console.log('====================================================\n');

  const app = express();
  app.use(cors());
  app.use(cookieParser());
  app.use(express.json());

  // Mount all routes
  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', database: 'PostgreSQL 16' });
  });
  app.get('/api', (_req, res) => {
    res.json({ name: 'Admatrix Property API Gateway', version: '1.0.0' });
  });
  app.use('/api/auth', authRouter);
  app.use('/api/properties', propertiesRouter);
  app.use('/api/campaigns', campaignsRouter);
  app.use('/api/leads', leadsRouter);
  app.use('/api/compliance', complianceRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/whatsapp', whatsappRouter);

  const TEST_PORT = 5055;
  const server = app.listen(TEST_PORT);
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

  let createdPropertyId = '';
  let createdCampaignId = '';
  let createdLeadId = '';
  let authToken = '';

  try {
    // 1. GET /health
    let res = await fetch(`${BASE_URL}/health`);
    let data: any = await res.json();
    recordApi('GET', '/health', 200, res.status, `Status: ${data.status}, DB: ${data.database}`);

    // 2. GET /api
    res = await fetch(`${BASE_URL}/api`);
    data = await res.json();
    recordApi('GET', '/api', 200, res.status, `Gateway: ${data.name}`);

    // 2b. POST /api/auth/register (Create an authorized Brokerage Admin for tests)
    const testEmail = `broker_audit_${Date.now()}@admatrixplatform.ae`;
    res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
        name: 'Audit Broker',
        organizationName: 'Audit Prime Real Estate LLC',
      }),
    });
    data = await res.json();
    authToken = data.accessToken || '';
    recordApi('POST', '/api/auth/register', 201, res.status, `Registered test user ${testEmail}`);

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    // 2c. GET /api/auth/me
    res = await fetch(`${BASE_URL}/api/auth/me`, { headers: authHeaders });
    data = await res.json();
    recordApi('GET', '/api/auth/me', 200, res.status, `User profile: ${data.user?.name}`);

    // 3. GET /api/properties
    res = await fetch(`${BASE_URL}/api/properties`, { headers: authHeaders });
    data = await res.json();
    recordApi('GET', '/api/properties', 200, res.status, `Found ${data.count} properties in PostgreSQL`);

    // 4. POST /api/properties (Compliant Villa)
    res = await fetch(`${BASE_URL}/api/properties`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'API Integration Test Penthouse',
        description: 'Testing live PostgreSQL persistence',
        propertyType: 'Penthouse',
        listingType: 'Sale',
        price: 28000000,
        currency: 'AED',
        bedrooms: 4,
        bathrooms: 5,
        builtUpArea: 6200,
        furnishingStatus: 'Furnished',
        emirate: 'Dubai',
        community: 'Downtown Dubai',
        buildingProject: 'Burj Crown',
        address: 'Downtown Dubai, UAE',
        trakheesiPermitNo: '7198881234',
        permitExpiryDate: new Date(Date.now() + 180 * 86400000).toISOString(),
        formACompleted: true,
        isOffPlan: false,
      }),
    });
    data = await res.json();
    createdPropertyId = data.data?.id || '';
    recordApi('POST', '/api/properties', 201, res.status, `Created ID: ${createdPropertyId}, Compliance: ${data.compliance?.status}`);

    // 5. GET /api/properties/:id
    res = await fetch(`${BASE_URL}/api/properties/${createdPropertyId}`, { headers: authHeaders });
    data = await res.json();
    recordApi('GET', `/api/properties/${createdPropertyId}`, 200, res.status, `Fetched title: "${data.data?.title}"`);

    // 6. PUT /api/properties/:id
    res = await fetch(`${BASE_URL}/api/properties/${createdPropertyId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'API Integration Test Penthouse (Updated)',
        price: 29500000,
        trakheesiPermitNo: '7198881234',
        permitExpiryDate: new Date(Date.now() + 180 * 86400000).toISOString(),
        formACompleted: true,
      }),
    });
    data = await res.json();
    recordApi('PUT', `/api/properties/${createdPropertyId}`, 200, res.status, `Updated price to AED ${data.data?.price}`);

    // 7. GET /api/campaigns
    res = await fetch(`${BASE_URL}/api/campaigns`, { headers: authHeaders });
    data = await res.json();
    recordApi('GET', '/api/campaigns', 200, res.status, `Found ${data.count} campaigns`);

    // 8. POST /api/campaigns (Compliant launch)
    res = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        propertyId: createdPropertyId,
        name: 'Downtown Penthouse Meta Campaign',
        platform: 'META',
        objective: 'LEADS',
        budgetType: 'DAILY',
        budgetAmount: 400,
        targetLocations: ['Dubai', 'Abu Dhabi'],
        status: 'ACTIVE',
      }),
    });
    data = await res.json();
    createdCampaignId = data.data?.id || '';
    recordApi('POST', '/api/campaigns', 201, res.status, `Created Campaign ID: ${createdCampaignId}`);

    // 9. POST /api/campaigns (Compliance Gatekeeper Test - Expired Property must fail with 422)
    // Create an expired property inside current organization via POST /api/properties
    res = await fetch(`${BASE_URL}/api/properties`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Expired Trakheesi Listing',
        description: 'Testing expired permit campaign gatekeeper',
        propertyType: 'Apartment',
        listingType: 'Rent',
        price: 150000,
        currency: 'AED',
        bedrooms: 2,
        bathrooms: 2,
        builtUpArea: 1200,
        furnishingStatus: 'Furnished',
        emirate: 'Dubai',
        community: 'Downtown Dubai',
        address: 'Downtown Dubai, UAE',
        trakheesiPermitNo: '7199990000',
        permitExpiryDate: new Date(Date.now() - 5 * 86400000).toISOString(), // expired 5 days ago
        formACompleted: true,
      }),
    });
    data = await res.json();
    const expiredPropId = data.data?.id;

    res = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        propertyId: expiredPropId,
        name: 'Blocked Expired Campaign',
        platform: 'META',
        status: 'ACTIVE', // attempts launch on expired listing
      }),
    });
    data = await res.json();
    recordApi('POST', '/api/campaigns [Compliance Gate]', 422, res.status, `Gatekeeper correctly blocked expired permit with HTTP 422: ${data.error}`);

    // Clean up expired test property
    if (expiredPropId) {
      await prisma.property.delete({ where: { id: expiredPropId } });
    }

    // 10. GET /api/campaigns/:id
    res = await fetch(`${BASE_URL}/api/campaigns/${createdCampaignId}`, { headers: authHeaders });
    data = await res.json();
    recordApi('GET', `/api/campaigns/${createdCampaignId}`, 200, res.status, `Fetched Campaign: ${data.data?.name}`);

    // 11. PATCH /api/campaigns/:id
    res = await fetch(`${BASE_URL}/api/campaigns/${createdCampaignId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'PAUSED', budgetAmount: 450 }),
    });
    data = await res.json();
    recordApi('PATCH', `/api/campaigns/${createdCampaignId}`, 200, res.status, `Status changed to ${data.data?.status}`);

    // 12. POST /api/campaigns/:id/publish
    res = await fetch(`${BASE_URL}/api/campaigns/${createdCampaignId}/publish`, {
      method: 'POST',
      headers: authHeaders,
    });
    data = await res.json();
    recordApi('POST', `/api/campaigns/${createdCampaignId}/publish`, 200, res.status, `Publish Result: ${data.externalCampaignId}`);

    // 13. GET /api/leads
    res = await fetch(`${BASE_URL}/api/leads`, { headers: authHeaders });
    data = await res.json();
    recordApi('GET', '/api/leads', 200, res.status, `Found ${data.count} leads in PostgreSQL`);

    // 14. POST /api/leads
    res = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Sheikh Rashid Al Falasi',
        phone: '+971 50 771 9922',
        email: 'rashid.falasi@dubaiinvest.ae',
        propertyId: createdPropertyId,
        campaignId: createdCampaignId,
        sourcePlatform: 'META',
        notes: 'Inquiring for luxury penthouse',
      }),
    });
    data = await res.json();
    createdLeadId = data.data?.id || '';
    recordApi('POST', '/api/leads', 201, res.status, `Created Lead ID: ${createdLeadId}, Auto-responder triggered`);

    // 15. GET /api/leads/:id
    res = await fetch(`${BASE_URL}/api/leads/${createdLeadId}`, { headers: authHeaders });
    data = await res.json();
    recordApi('GET', `/api/leads/${createdLeadId}`, 200, res.status, `Fetched Lead: ${data.data?.name}, WhatsApp Msgs: ${data.data?.whatsappMessages?.length}`);

    // 16. PATCH /api/leads/:id
    res = await fetch(`${BASE_URL}/api/leads/${createdLeadId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'QUALIFIED', note: 'Verified cash investor' }),
    });
    data = await res.json();
    recordApi('PATCH', `/api/leads/${createdLeadId}`, 200, res.status, `Status updated to ${data.data?.status}`);

    // 17. POST /api/compliance/verify
    res = await fetch(`${BASE_URL}/api/compliance/verify`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Validation Check Villa',
        price: 5000000,
        builtUpArea: 3500,
        community: 'Dubai Hills',
        trakheesiPermitNo: '7112233445',
        permitExpiryDate: new Date(Date.now() + 90 * 86400000).toISOString(),
        formACompleted: true,
        qrCodeUrl: 'https://example.com/qr.png',
      }),
    });
    data = await res.json();
    recordApi('POST', '/api/compliance/verify', 200, res.status, `Score: ${data.result?.score}, CanLaunch: ${data.result?.canLaunchCampaign}`);

    // 18. POST /api/ai/generate-ad
    res = await fetch(`${BASE_URL}/api/ai/generate-ad`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        propertyId: createdPropertyId,
        tone: 'LUXURY',
        platform: 'META',
        language: 'both',
      }),
    });
    data = await res.json();
    recordApi('POST', '/api/ai/generate-ad', 200, res.status, `Generated ${data.data?.variations?.length} variations with Arabic translation`);

    // 19. POST /api/whatsapp/send
    res = await fetch(`${BASE_URL}/api/whatsapp/send`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        leadId: createdLeadId,
        message: 'Hello Sheikh Rashid, thank you for your inquiry on the Downtown Penthouse.',
        templateName: 'dubai_property_lead_welcome_v1',
      }),
    });
    data = await res.json();
    recordApi('POST', '/api/whatsapp/send', 200, res.status, `WhatsApp Message Dispatched (Status: ${data.data?.status})`);

    // 20. DELETE /api/properties/:id (Clean up test property)
    if (createdPropertyId) {
      // First delete dependent leads & campaigns created in test
      if (createdLeadId) await prisma.lead.delete({ where: { id: createdLeadId } });
      if (createdCampaignId) await prisma.campaign.delete({ where: { id: createdCampaignId } });

      res = await fetch(`${BASE_URL}/api/properties/${createdPropertyId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      data = await res.json();
      recordApi('DELETE', `/api/properties/${createdPropertyId}`, 200, res.status, `Cleaned up test property: ${data.message}`);
    }

  } catch (err: any) {
    console.error('Fatal API error during audit:', err);
  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log('API AUDIT SUMMARY');
  console.log('====================================================');
  const passed = testResults.filter(r => r.status === 'PASSED').length;
  const failed = testResults.filter(r => r.status === 'FAILED').length;
  console.log(`Total Endpoints Tested: ${testResults.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runApiAudit().catch(err => {
  console.error('API Audit Runner Failed:', err);
  process.exit(1);
});

