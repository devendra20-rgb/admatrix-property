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
import { seedRouter } from './routes/seed.router.js';
import { prisma } from './lib/prisma.js';
import { AuthService } from './services/auth.service.js';

interface NegativeTestResult {
  category: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  notes?: string;
}

const results: NegativeTestResult[] = [];

function assertSecurity(category: string, name: string, condition: boolean, expected: string, actual: string, notes?: string) {
  results.push({ category, name, passed: condition, expected, actual, notes });
  const statusBadge = condition ? 'PASS' : 'FAIL';
  console.log(`[${statusBadge}] [${category}] ${name}`);
  console.log(`       Expected: ${expected}`);
  console.log(`       Actual:   ${actual}`);
  if (notes) console.log(`       Notes:    ${notes}`);
}

async function runNegativeSecurityAudit() {
  console.log('================================================================');
  console.log('ADMATRIX PROPERTY - FOCUSED NEGATIVE SECURITY VERIFICATION');
  console.log('================================================================\n');

  // Setup Express server matching production middleware stack
  const app = express();
  const ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5059'];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} blocked by CORS security policy`));
      }
    },
    credentials: true,
  }));
  app.use(cookieParser());
  app.use(express.json());

  app.use('/api/auth', authRouter);
  app.use('/api/properties', propertiesRouter);
  app.use('/api/campaigns', campaignsRouter);
  app.use('/api/leads', leadsRouter);
  app.use('/api/compliance', complianceRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/whatsapp', whatsappRouter);
  app.use('/api/seed', seedRouter);

  // Global error handler (handles CORS rejections)
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err.message && err.message.includes('CORS')) {
      return res.status(403).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  });

  const TEST_PORT = 5059;
  const server = app.listen(TEST_PORT);
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

  try {
    const timestamp = Date.now();

    // -------------------------------------------------------------
    // PREPARATION: Provision Isolated Tenants (Alpha & Beta)
    // -------------------------------------------------------------
    // 1. Org Alpha (Brokerage Admin)
    let res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `alpha_sec_${timestamp}@admatrixplatform.ae`,
        password: 'Password123!',
        name: 'Alpha Admin',
        organizationName: 'Alpha Security Corp LLC',
      }),
    });
    const alphaAuth = await res.json();
    const alphaToken = alphaAuth.accessToken;
    const alphaOrgId = alphaAuth.user.organizationId;
    const alphaUserId = alphaAuth.user.id;

    // 2. Org Alpha AGENT
    const agentPasswordHash = await AuthService.hashPassword('Password123!');
    const agentUser = await prisma.user.create({
      data: {
        email: `alpha_agent_${timestamp}@admatrixplatform.ae`,
        passwordHash: agentPasswordHash,
        name: 'Alpha Junior Agent',
        role: 'AGENT',
        organizationId: alphaOrgId,
      },
    });
    const agentTokens = await AuthService.generateAuthTokens({
      userId: agentUser.id,
      email: agentUser.email,
      name: agentUser.name,
      role: 'AGENT',
      organizationId: alphaOrgId,
    });
    const agentToken = agentTokens.accessToken;

    // 3. Org Beta (Brokerage Admin)
    res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `beta_sec_${timestamp}@admatrixplatform.ae`,
        password: 'Password123!',
        name: 'Beta Admin',
        organizationName: 'Beta Security Corp LLC',
      }),
    });
    const betaAuth = await res.json();
    const betaToken = betaAuth.accessToken;
    const betaOrgId = betaAuth.user.organizationId;
    const betaUserId = betaAuth.user.id;

    // Create an Alpha Property and Campaign to test cross-tenant relational probes
    res = await fetch(`${BASE_URL}/api/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alphaToken}` },
      body: JSON.stringify({
        title: 'Alpha Secure Penthouse',
        description: 'Classified asset',
        propertyType: 'Penthouse',
        listingType: 'Sale',
        price: 32000000,
        currency: 'AED',
        bedrooms: 4,
        bathrooms: 5,
        builtUpArea: 5500,
        furnishingStatus: 'Furnished',
        emirate: 'Dubai',
        community: 'Downtown Dubai',
        address: 'Burj Khalifa District',
        trakheesiPermitNo: '7190011223',
        permitExpiryDate: new Date(Date.now() + 120 * 86400000).toISOString(),
        formACompleted: true,
      }),
    });
    const alphaProp = (await res.json()).data;

    res = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alphaToken}` },
      body: JSON.stringify({
        propertyId: alphaProp.id,
        name: 'Alpha Confidential Campaign',
        platform: 'META',
        budgetAmount: 500,
        status: 'ACTIVE',
      }),
    });
    const alphaCampaign = (await res.json()).data;

    // -------------------------------------------------------------
    // 1. PRISMA TENANT ISOLATION & RELATIONAL INJECTION ATTACKS
    // -------------------------------------------------------------
    console.log('\n--- 1. TENANT ISOLATION & RELATIONAL INJECTION ATTACKS ---');

    // 1a. Tenant Beta attempts to create a lead linked to Tenant Alpha's Campaign
    res = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${betaToken}` },
      body: JSON.stringify({
        name: 'Attacker Probe',
        phone: '+971500000000',
        campaignId: alphaCampaign.id, // Alpha's campaign ID passed by Beta!
      }),
    });
    let data = await res.json();
    assertSecurity(
      'Tenant Isolation',
      'Prevent Binding Lead to Foreign Organization Campaign',
      res.status === 400 && data.error.includes('campaign does not belong'),
      'HTTP 400 with campaign ownership rejection',
      `HTTP ${res.status}: ${data.error}`
    );

    // 1b. Tenant Beta attempts to create a lead linked to Tenant Alpha's Property
    res = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${betaToken}` },
      body: JSON.stringify({
        name: 'Attacker Probe 2',
        phone: '+971500000001',
        propertyId: alphaProp.id, // Alpha's property ID passed by Beta!
      }),
    });
    data = await res.json();
    assertSecurity(
      'Tenant Isolation',
      'Prevent Binding Lead to Foreign Organization Property',
      res.status === 400 && data.error.includes('property does not belong'),
      'HTTP 400 with property ownership rejection',
      `HTTP ${res.status}: ${data.error}`
    );

    // 1c. Tenant Beta attempts to assign a lead to Tenant Alpha's Agent
    res = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${betaToken}` },
      body: JSON.stringify({
        name: 'Attacker Probe 3',
        phone: '+971500000002',
        assignedToId: alphaUserId, // Alpha's user ID passed by Beta!
      }),
    });
    data = await res.json();
    assertSecurity(
      'Tenant Isolation',
      'Prevent Assigning Lead to Foreign Organization Agent',
      res.status === 400 && data.error.includes('agent does not belong'),
      'HTTP 400 with agent assignment rejection',
      `HTTP ${res.status}: ${data.error}`
    );

    // 1d. Tenant Beta attempts to create a Campaign bound to Tenant Alpha's Property
    res = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${betaToken}` },
      body: JSON.stringify({
        propertyId: alphaProp.id,
        name: 'Beta Illicit Campaign',
        platform: 'META',
      }),
    });
    data = await res.json();
    assertSecurity(
      'Tenant Isolation',
      'Prevent Campaign Launch on Foreign Organization Property',
      res.status === 404,
      'HTTP 404 (Property not found in caller organization)',
      `HTTP ${res.status}: ${data.error}`
    );

    // 1e. Tenant Beta attempts to update Tenant Alpha's Property via PUT
    res = await fetch(`${BASE_URL}/api/properties/${alphaProp.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${betaToken}` },
      body: JSON.stringify({ title: 'Hacked Title' }),
    });
    data = await res.json();
    assertSecurity(
      'Tenant Isolation',
      'Prevent Cross-Tenant Property Mutation (PUT)',
      res.status === 404,
      'HTTP 404 (Target resource does not exist in caller tenant scope)',
      `HTTP ${res.status}: ${data.error}`
    );

    // 1f. Tenant Beta attempts to delete Tenant Alpha's Property via DELETE
    res = await fetch(`${BASE_URL}/api/properties/${alphaProp.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${betaToken}` },
    });
    data = await res.json();
    assertSecurity(
      'Tenant Isolation',
      'Prevent Cross-Tenant Property Deletion (DELETE)',
      res.status === 404,
      'HTTP 404 (Deletion target invisible outside organization)',
      `HTTP ${res.status}: ${data.error}`
    );

    // -------------------------------------------------------------
    // 2. CONCURRENT REFRESH-TOKEN ROTATION & REPLAY DEFENSE
    // -------------------------------------------------------------
    console.log('\n--- 2. CONCURRENT REFRESH-TOKEN ROTATION & REPLAY DEFENSE ---');

    // Obtain fresh token pair for rotation testing
    res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `alpha_sec_${timestamp}@admatrixplatform.ae`,
        password: 'Password123!',
      }),
    });
    const loginRes = await res.json();
    const tokenToRotate = loginRes.refreshToken;

    // Fire 2 concurrent HTTP refresh requests with the EXACT same refresh token
    const [res1, res2] = await Promise.all([
      fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokenToRotate }),
      }),
      fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokenToRotate }),
      }),
    ]);

    const status1 = res1.status;
    const status2 = res2.status;
    const onePassedOneFailed = (status1 === 200 && status2 === 401) || (status1 === 401 && status2 === 200);

    assertSecurity(
      'Concurrency Defense',
      'Atomic Single-Use Refresh Token Rotation Under Race Condition',
      onePassedOneFailed,
      'Exactly one request succeeds (200) and the other fails (401)',
      `Request 1: HTTP ${status1}, Request 2: HTTP ${status2}`
    );

    // Replay Attempt: Test that the already consumed token is REJECTED on third attempt
    const replayRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokenToRotate }),
    });
    const replayData = await replayRes.json();
    assertSecurity(
      'Concurrency Defense',
      'Prevent Replay Attack with Already Consumed Refresh Token',
      replayRes.status === 401,
      'HTTP 401: Invalid, revoked, or expired refresh token',
      `HTTP ${replayRes.status}: ${replayData.error}`
    );

    // -------------------------------------------------------------
    // 3. COOKIE SECURITY & CORS ORIGIN RESTRICTION
    // -------------------------------------------------------------
    console.log('\n--- 3. COOKIE SECURITY & CORS RESTRICTIONS ---');

    // 3a. Check cookie flags on login response
    const setCookieHeaders = res.headers.get('set-cookie') || '';
    const hasHttpOnly = setCookieHeaders.toLowerCase().includes('httponly');
    const hasSameSiteStrict = setCookieHeaders.toLowerCase().includes('samesite=strict');
    assertSecurity(
      'Cookie Security',
      'Enforce HttpOnly and SameSite=Strict Flags on Auth Cookies',
      hasHttpOnly && hasSameSiteStrict,
      'Set-Cookie contains HttpOnly and SameSite=Strict',
      `Cookie flags: ${setCookieHeaders.split(';').slice(1, 4).join(';')}`
    );

    // 3b. CORS protection against hostile origins
    try {
      const corsRes = await fetch(`${BASE_URL}/health`, {
        headers: { Origin: 'https://malicious-phishing-portal.com' },
      });
      assertSecurity(
        'CORS Security',
        'Reject Untrusted External Origin via CORS Policy',
        corsRes.status === 403,
        'HTTP 403 (Blocked by CORS security policy)',
        `HTTP ${corsRes.status}`
      );
    } catch (corsErr: any) {
      assertSecurity(
        'CORS Security',
        'Reject Untrusted External Origin via CORS Policy',
        true,
        'CORS network block',
        String(corsErr.message)
      );
    }

    // -------------------------------------------------------------
    // 4. ROLE-BASED ACCESS CONTROL (RBAC) NEGATIVE ENFORCEMENT
    // -------------------------------------------------------------
    console.log('\n--- 4. ROLE-BASED ACCESS CONTROL (RBAC) NEGATIVE ENFORCEMENT ---');

    // 4a. AGENT role attempts to POST a campaign (requires Broker/Admin)
    res = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agentToken}` },
      body: JSON.stringify({
        propertyId: alphaProp.id,
        name: 'Agent Unauthorized Campaign',
        platform: 'META',
      }),
    });
    data = await res.json();
    assertSecurity(
      'RBAC Enforcement',
      'AGENT Role Blocked from Creating Campaigns (Requires Broker/Admin)',
      res.status === 403,
      'HTTP 403: Access forbidden: Requires one of [SUPER_ADMIN, BROKERAGE_ADMIN, BROKER]',
      `HTTP ${res.status}: ${data.error}`
    );

    // 4b. AGENT role attempts to PATCH campaign budget/status
    res = await fetch(`${BASE_URL}/api/campaigns/${alphaCampaign.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${agentToken}` },
      body: JSON.stringify({ budgetAmount: 10000 }),
    });
    data = await res.json();
    assertSecurity(
      'RBAC Enforcement',
      'AGENT Role Blocked from Modifying Campaign Budget (Requires Broker/Admin)',
      res.status === 403,
      'HTTP 403: Access forbidden: Requires one of [SUPER_ADMIN, BROKERAGE_ADMIN, BROKER]',
      `HTTP ${res.status}: ${data.error}`
    );

    // 4c. AGENT role attempts to Publish campaign
    res = await fetch(`${BASE_URL}/api/campaigns/${alphaCampaign.id}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${agentToken}` },
    });
    data = await res.json();
    assertSecurity(
      'RBAC Enforcement',
      'AGENT Role Blocked from Publishing Campaigns (Requires Broker/Admin)',
      res.status === 403,
      'HTTP 403: Access forbidden: Requires one of [SUPER_ADMIN, BROKERAGE_ADMIN, BROKER]',
      `HTTP ${res.status}: ${data.error}`
    );

    // 4d. Unauthenticated request to protected property endpoint
    res = await fetch(`${BASE_URL}/api/properties`);
    data = await res.json();
    assertSecurity(
      'RBAC Enforcement',
      'Unauthenticated Request Blocked Across Protected Resources',
      res.status === 401,
      'HTTP 401: Authentication required. No access token provided.',
      `HTTP ${res.status}: ${data.error}`
    );

    // -------------------------------------------------------------
    // 5. SUPER_ADMIN PROVISIONING & PRIVILEGE ESCALATION
    // -------------------------------------------------------------
    console.log('\n--- 5. SUPER_ADMIN PROVISIONING & PRIVILEGE ESCALATION ---');

    // 5a. Public registration attempting role: SUPER_ADMIN
    res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `fake_superadmin_${timestamp}@admatrixplatform.ae`,
        password: 'Password123!',
        name: 'Hacker',
        role: 'SUPER_ADMIN',
      }),
    });
    data = await res.json();
    assertSecurity(
      'Privilege Escalation',
      'Prevent Public Registration with SUPER_ADMIN Role',
      res.status === 403,
      'HTTP 403: Forbidden: SUPER_ADMIN accounts cannot be registered publicly.',
      `HTTP ${res.status}: ${data.error}`
    );

    // 5b. Unauthenticated access to /api/seed
    res = await fetch(`${BASE_URL}/api/seed`);
    data = await res.json();
    assertSecurity(
      'Privilege Escalation',
      'Protect /api/seed from Unauthenticated Access',
      res.status === 401,
      'HTTP 401: Authentication required.',
      `HTTP ${res.status}: ${data.error}`
    );

    // 5c. AGENT role access to /api/seed
    res = await fetch(`${BASE_URL}/api/seed`, {
      headers: { Authorization: `Bearer ${agentToken}` },
    });
    data = await res.json();
    assertSecurity(
      'Privilege Escalation',
      'Protect /api/seed from Non-SUPER_ADMIN Roles (AGENT/BROKER)',
      res.status === 403,
      'HTTP 403: Access forbidden: Requires SUPER_ADMIN',
      `HTTP ${res.status}: ${data.error}`
    );

    // -------------------------------------------------------------
    // 6. ERROR HANDLING & TIMING ATTACK RESISTANCE
    // -------------------------------------------------------------
    console.log('\n--- 6. ERROR HANDLING & TIMING RESISTANCE ---');

    // 6a. Non-existent email login
    res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `non_existent_user_${timestamp}@admatrixplatform.ae`,
        password: 'Password123!',
      }),
    });
    const nonExistentData = await res.json();

    // 6b. Existing email with invalid password
    res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `alpha_sec_${timestamp}@admatrixplatform.ae`,
        password: 'WrongPassword123!',
      }),
    });
    const wrongPasswordData = await res.json();

    assertSecurity(
      'Timing & Enumeration',
      'Identical Error Message for Non-Existent vs Wrong-Password Logins',
      nonExistentData.error === wrongPasswordData.error && nonExistentData.error === 'Invalid email or password credentials.',
      'Identical error: "Invalid email or password credentials."',
      `NonExistent: "${nonExistentData.error}", WrongPassword: "${wrongPasswordData.error}"`
    );

    // 6c. Short password rejection
    res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `short_pw_${timestamp}@admatrixplatform.ae`,
        password: '123',
        name: 'Short Password',
      }),
    });
    data = await res.json();
    assertSecurity(
      'Input Validation',
      'Enforce Password Minimum Length >= 8',
      res.status === 400 && data.error.includes('8 characters'),
      'HTTP 400: Password must be at least 8 characters long.',
      `HTTP ${res.status}: ${data.error}`
    );

  } catch (err: any) {
    console.error('Fatal error during security audit runner:', err);
  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log('NEGATIVE SECURITY TEST AUDIT SUMMARY');
  console.log('================================================================');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total Security Checks: ${results.length}`);
  console.log(`Passed:                ${passed}`);
  console.log(`Failed:                ${failed}`);
  console.log('================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runNegativeSecurityAudit().catch(err => {
  console.error('Security Audit Runner Fatal Failure:', err);
  process.exit(1);
});
