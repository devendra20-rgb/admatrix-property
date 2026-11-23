process.env.NODE_ENV = 'test';
import { app } from './server.js';
import { prisma } from './lib/prisma.js';
import { redis } from './lib/redis.js';
import { AuthService } from './services/auth.service.js';

interface TestAssertion {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const assertions: TestAssertion[] = [];

function assertTest(category: string, name: string, passed: boolean, details?: string, error?: any) {
  assertions.push({
    category,
    name,
    passed,
    details,
    error: error ? String(error) : undefined,
  });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] [${category}] ${name} ${details ? '- ' + details : ''}`);
  if (error) console.error('  Error detail:', error);
}

async function runAuthRbacTenancySuite() {
  console.log('================================================================');
  console.log('PHASE 1B: AUTHENTICATION, RBAC, AND MULTI-TENANCY TEST SUITE');
  console.log('================================================================\n');

  const TEST_PORT = 5066;
  const server = app.listen(TEST_PORT);
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

  let alphaTokens: { accessToken: string; refreshToken: string } = { accessToken: '', refreshToken: '' };
  let betaTokens: { accessToken: string; refreshToken: string } = { accessToken: '', refreshToken: '' };
  let agentTokens: { accessToken: string; refreshToken: string } = { accessToken: '', refreshToken: '' };
  let superAdminTokens: { accessToken: string; refreshToken: string } = { accessToken: '', refreshToken: '' };

  let alphaPropId = '';
  let betaPropId = '';
  let alphaLeadId = '';

  try {
    // -------------------------------------------------------------
    // 1. REGISTRATION TESTS
    // -------------------------------------------------------------
    console.log('\n--- 1. REGISTRATION & INPUT VALIDATION ---');

    // 1a. Attempt public SUPER_ADMIN registration (MUST BE BLOCKED)
    let res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'malicious_super_admin@hack.com',
        password: 'Password123!',
        name: 'Attacker',
        role: 'SUPER_ADMIN', // prohibited public escalation
      }),
    });
    let data: any = await res.json();
    assertTest('Registration', 'Block Public SUPER_ADMIN Registration', res.status === 403, `HTTP ${res.status}: ${data.error}`);

    // 1b. Attempt weak password (< 8 chars)
    res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'weakpass@test.com',
        password: '123',
        name: 'Weak Pass',
      }),
    });
    data = await res.json();
    assertTest('Registration', 'Enforce Password Length >= 8', res.status === 400, `HTTP ${res.status}: ${data.error}`);

    // 1c. Register Organization Alpha (Brokerage Admin)
    const alphaEmail = `alpha_admin_${Date.now()}@alpharealty.ae`;
    res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: alphaEmail,
        password: 'Password123!',
        name: 'Tariq Al Habtoor',
        organizationName: 'Alpha Luxury Realty LLC',
        phone: '+971 4 555 1000',
      }),
    });
    data = await res.json();
    alphaTokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
    const alphaOrgId = data.user?.organizationId;
    assertTest(
      'Registration',
      'Register Organization Alpha Admin',
      res.status === 201 && data.user?.role === 'BROKERAGE_ADMIN' && Boolean(data.accessToken),
      `Org: ${data.user?.organization?.name}, Role: ${data.user?.role}`
    );

    // 1d. Attempt duplicate email
    res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: alphaEmail, // duplicate
        password: 'Password123!',
        name: 'Duplicate Guy',
      }),
    });
    data = await res.json();
    assertTest('Registration', 'Reject Duplicate Email with HTTP 409', res.status === 409, `HTTP ${res.status}: ${data.error}`);

    // 1e. Register Organization Beta (Separate Tenant)
    const betaEmail = `beta_broker_${Date.now()}@betaproperties.ae`;
    res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: betaEmail,
        password: 'Password123!',
        name: 'Elena Rostova',
        organizationName: 'Beta Real Estate Group',
        phone: '+971 4 777 2000',
      }),
    });
    data = await res.json();
    betaTokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
    const betaOrgId = data.user?.organizationId;
    assertTest(
      'Registration',
      'Register Organization Beta Admin',
      res.status === 201 && Boolean(betaOrgId) && betaOrgId !== alphaOrgId,
      `Different Tenant ID: ${betaOrgId} !== ${alphaOrgId}`
    );

    // 1f. Register an AGENT under Alpha
    const agentEmail = `alpha_agent_${Date.now()}@alpharealty.ae`;
    const agentPasswordHash = await AuthService.hashPassword('Password123!');
    const agentUser = await prisma.user.create({
      data: {
        email: agentEmail,
        passwordHash: agentPasswordHash,
        name: 'Junior Agent Mark',
        role: 'AGENT',
        organizationId: alphaOrgId,
      },
    });
    const agentTokenRes = await AuthService.generateAuthTokens({
      userId: agentUser.id,
      email: agentUser.email,
      name: agentUser.name,
      role: 'AGENT',
      organizationId: alphaOrgId,
    });
    agentTokens = { accessToken: agentTokenRes.accessToken, refreshToken: agentTokenRes.refreshToken };
    assertTest('Registration', 'Create AGENT in Organization Alpha', Boolean(agentTokens.accessToken), `Agent ID: ${agentUser.id}, Role: AGENT`);

    // 1g. Create a SUPER_ADMIN user
    const superAdminEmail = `superadmin_${Date.now()}@admatrixplatform.ae`;
    const superAdminUser = await prisma.user.create({
      data: {
        email: superAdminEmail,
        passwordHash: agentPasswordHash,
        name: 'Platform Super Admin',
        role: 'SUPER_ADMIN',
        organizationId: alphaOrgId,
      },
    });
    const superAdminTokenRes = await AuthService.generateAuthTokens({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      name: superAdminUser.name,
      role: 'SUPER_ADMIN',
      organizationId: alphaOrgId,
    });
    superAdminTokens = { accessToken: superAdminTokenRes.accessToken, refreshToken: superAdminTokenRes.refreshToken };
    assertTest('Registration', 'Create Verified SUPER_ADMIN', Boolean(superAdminTokens.accessToken), `Role: SUPER_ADMIN`);

    // -------------------------------------------------------------
    // 2. LOGIN & ARGON2ID VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- 2. LOGIN & ARGON2ID AUTHENTICATION ---');

    // 2a. Login with invalid password
    res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: alphaEmail,
        password: 'WrongPassword!',
      }),
    });
    data = await res.json();
    assertTest('Login', 'Reject Invalid Password with HTTP 401', res.status === 401, `HTTP ${res.status}: ${data.error}`);

    // 2b. Login with valid password (Argon2id verified)
    res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: alphaEmail,
        password: 'Password123!',
      }),
    });
    data = await res.json();
    const cookiesHeader = res.headers.get('set-cookie') || '';
    const loginAccessToken = data.accessToken;
    const loginRefreshToken = data.refreshToken;
    assertTest(
      'Login',
      'Successful Login with Argon2id Verification',
      res.status === 200 && Boolean(data.accessToken) && cookiesHeader.includes('accessToken'),
      `Returned Access Token & Set-Cookie headers`
    );

    // 2c. GET /api/auth/me (Protected Route)
    res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${loginAccessToken}` },
    });
    data = await res.json();
    assertTest('Login', 'GET /api/auth/me Returns Identity', res.status === 200 && data.user?.email === alphaEmail, `User: ${data.user?.name}`);

    // -------------------------------------------------------------
    // 3. REFRESH TOKEN ROTATION & SESSION REVOCATION (REDIS)
    // -------------------------------------------------------------
    console.log('\n--- 3. REFRESH TOKEN ROTATION & REDIS SESSIONS ---');

    const originalRefreshToken = loginRefreshToken;

    // 3a. Rotate tokens
    res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: originalRefreshToken }),
    });
    data = await res.json();
    const rotatedRefreshToken = data.refreshToken;
    const rotatedAccessToken = data.accessToken;
    assertTest(
      'Session Rotation',
      'Rotate Refresh Token Successfully',
      res.status === 200 && Boolean(rotatedAccessToken) && rotatedRefreshToken !== originalRefreshToken,
      `New refresh token issued`
    );

    // 3b. Attempt Replay Attack with OLD refresh token (MUST BE REJECTED)
    res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: originalRefreshToken }),
    });
    data = await res.json();
    assertTest('Session Rotation', 'Prevent Token Replay (Old Token Revoked in Redis)', res.status === 401, `HTTP ${res.status}: ${data.error}`);

    // 3c. Logout and Session Invalidation
    res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rotatedRefreshToken }),
    });
    data = await res.json();
    assertTest('Session Rotation', 'Logout Revokes Active Session', res.status === 200, `Message: ${data.message}`);

    // Verify revoked token cannot be refreshed anymore
    res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rotatedRefreshToken }),
    });
    assertTest('Session Rotation', 'Revoked Token Rejected After Logout', res.status === 401, 'Correctly rejected');

    // -------------------------------------------------------------
    // 4. CROSS-TENANT DATA ISOLATION (ALPHA VS BETA)
    // -------------------------------------------------------------
    console.log('\n--- 4. CROSS-TENANT DATA ISOLATION (ZERO LEAKAGE) ---');

    // 4a. Org Alpha creates a Property
    res = await fetch(`${BASE_URL}/api/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alphaTokens.accessToken}`,
      },
      body: JSON.stringify({
        title: 'Alpha Frond N Confidential Villa',
        description: 'Private listing owned strictly by Alpha Realty',
        propertyType: 'Villa',
        listingType: 'Sale',
        price: 45000000,
        bedrooms: 6,
        bathrooms: 7,
        builtUpArea: 9000,
        furnishingStatus: 'Furnished',
        community: 'Palm Jumeirah',
        address: 'Frond N, Palm Jumeirah, Dubai',
        trakheesiPermitNo: '7199991111',
        permitExpiryDate: new Date(Date.now() + 180 * 86400000).toISOString(),
        formACompleted: true,
      }),
    });
    data = await res.json();
    alphaPropId = data.data?.id;
    assertTest('Tenant Isolation', 'Org Alpha Creates Property', res.status === 201 && Boolean(alphaPropId), `Alpha Property ID: ${alphaPropId}`);

    // 4b. Org Beta creates its own Property
    res = await fetch(`${BASE_URL}/api/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${betaTokens.accessToken}`,
      },
      body: JSON.stringify({
        title: 'Beta Marina Tower Penthouse',
        description: 'Listing owned strictly by Beta Real Estate',
        propertyType: 'Penthouse',
        listingType: 'Sale',
        price: 22000000,
        bedrooms: 3,
        bathrooms: 4,
        builtUpArea: 4000,
        furnishingStatus: 'Furnished',
        community: 'Dubai Marina',
        address: 'Marina Promenade',
        trakheesiPermitNo: '7199992222',
        permitExpiryDate: new Date(Date.now() + 180 * 86400000).toISOString(),
        formACompleted: true,
      }),
    });
    data = await res.json();
    betaPropId = data.data?.id;
    assertTest('Tenant Isolation', 'Org Beta Creates Property', res.status === 201 && Boolean(betaPropId), `Beta Property ID: ${betaPropId}`);

    // 4c. SECURITY CHECK: Org Beta attempts to READ Org Alpha's property by ID
    res = await fetch(`${BASE_URL}/api/properties/${alphaPropId}`, {
      headers: { Authorization: `Bearer ${betaTokens.accessToken}` },
    });
    data = await res.json();
    assertTest('Tenant Isolation', 'Org Beta Blocked from Reading Org Alpha Property by ID', res.status === 404, `HTTP ${res.status}: Cross-tenant read prevented`);

    // 4d. SECURITY CHECK: Org Beta attempts to UPDATE Org Alpha's property by ID
    res = await fetch(`${BASE_URL}/api/properties/${alphaPropId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${betaTokens.accessToken}`,
      },
      body: JSON.stringify({ price: 100 }), // Malicious update attempt
    });
    data = await res.json();
    assertTest('Tenant Isolation', 'Org Beta Blocked from Updating Org Alpha Property by ID', res.status === 404, `HTTP ${res.status}: Cross-tenant update prevented`);

    // 4e. SECURITY CHECK: Org Beta attempts to DELETE Org Alpha's property by ID
    res = await fetch(`${BASE_URL}/api/properties/${alphaPropId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${betaTokens.accessToken}` },
    });
    data = await res.json();
    assertTest('Tenant Isolation', 'Org Beta Blocked from Deleting Org Alpha Property by ID', res.status === 404, `HTTP ${res.status}: Cross-tenant delete prevented`);

    // 4f. SECURITY CHECK: Org Beta lists properties (Must NOT see Alpha's properties)
    res = await fetch(`${BASE_URL}/api/properties`, {
      headers: { Authorization: `Bearer ${betaTokens.accessToken}` },
    });
    data = await res.json();
    const betaListingIds = (data.data || []).map((p: any) => p.id);
    const hasAlphaProperty = betaListingIds.includes(alphaPropId);
    assertTest('Tenant Isolation', 'Org Beta List Query Only Contains Beta Properties', !hasAlphaProperty && betaListingIds.includes(betaPropId), `Beta saw ${data.count} properties, Alpha property absent`);

    // 4g. SECURITY CHECK: Org Beta attempts to launch Campaign bound to Org Alpha's Property ID
    res = await fetch(`${BASE_URL}/api/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${betaTokens.accessToken}`,
      },
      body: JSON.stringify({
        propertyId: alphaPropId, // Cross-tenant property reference attempt
        name: 'Malicious Cross-Tenant Campaign',
        platform: 'META',
      }),
    });
    data = await res.json();
    assertTest('Tenant Isolation', 'Org Beta Blocked from Binding Campaign to Org Alpha Property', res.status === 404, `HTTP ${res.status}: ${data.error}`);

    // 4h. Org Alpha creates a Lead
    res = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alphaTokens.accessToken}`,
      },
      body: JSON.stringify({
        name: 'Private Client X',
        phone: '+971 50 111 9999',
        propertyId: alphaPropId,
      }),
    });
    data = await res.json();
    alphaLeadId = data.data?.id;
    assertTest('Tenant Isolation', 'Org Alpha Creates Lead', res.status === 201 && Boolean(alphaLeadId), `Lead ID: ${alphaLeadId}`);

    // 4i. SECURITY CHECK: Org Beta attempts to SEND WhatsApp to Org Alpha's Lead
    res = await fetch(`${BASE_URL}/api/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${betaTokens.accessToken}`,
      },
      body: JSON.stringify({
        leadId: alphaLeadId,
        message: 'Spam from Beta',
      }),
    });
    data = await res.json();
    assertTest('Tenant Isolation', 'Org Beta Blocked from Sending WhatsApp to Org Alpha Lead', res.status === 404, `HTTP ${res.status}: ${data.error}`);

    // -------------------------------------------------------------
    // 5. ROLE-BASED ACCESS CONTROL (RBAC) PERMISSION GATES
    // -------------------------------------------------------------
    console.log('\n--- 5. ROLE-BASED ACCESS CONTROL (RBAC) ---');

    // 5a. AGENT role attempts to DELETE a Property (Restricted to SUPER_ADMIN, BROKERAGE_ADMIN, BROKER)
    res = await fetch(`${BASE_URL}/api/properties/${alphaPropId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${agentTokens.accessToken}` },
    });
    data = await res.json();
    assertTest('RBAC', 'Agent Role Blocked from Deleting Property (Requires Broker/Admin)', res.status === 403, `HTTP ${res.status}: ${data.error}`);

    // 5b. AGENT role attempts to PUT a Property (Restricted)
    res = await fetch(`${BASE_URL}/api/properties/${alphaPropId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${agentTokens.accessToken}`,
      },
      body: JSON.stringify({ price: 46000000 }),
    });
    data = await res.json();
    assertTest('RBAC', 'Agent Role Blocked from Updating Property', res.status === 403, `HTTP ${res.status}: ${data.error}`);

    // 5c. BROKERAGE_ADMIN role CAN update the Property
    res = await fetch(`${BASE_URL}/api/properties/${alphaPropId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alphaTokens.accessToken}`,
      },
      body: JSON.stringify({ price: 46000000 }),
    });
    data = await res.json();
    assertTest('RBAC', 'Brokerage Admin Allowed to Update Property', res.status === 200, `Updated Price: AED ${data.data?.price}`);

    // 5d. SUPER_ADMIN can view all properties across organizations
    res = await fetch(`${BASE_URL}/api/properties`, {
      headers: { Authorization: `Bearer ${superAdminTokens.accessToken}` },
    });
    data = await res.json();
    const superAdminListingIds = (data.data || []).map((p: any) => p.id);
    assertTest('RBAC', 'Super Admin Can View Cross-Organization Properties', superAdminListingIds.includes(alphaPropId) && superAdminListingIds.includes(betaPropId), `Super Admin retrieved ${data.count} total platform properties`);

    // -------------------------------------------------------------
    // 6. PRESERVED BUSINESS LOGIC (COMPLIANCE GATEKEEPER)
    // -------------------------------------------------------------
    console.log('\n--- 6. PRESERVED COMPLIANCE & BUSINESS LOGIC ---');

    // 6a. Attempt to launch campaign with expired permit (Must still be blocked by compliance engine with HTTP 422)
    const expiredProp = await prisma.property.findFirst({ where: { complianceStatus: 'EXPIRED' } });
    if (expiredProp) {
      // Find or assign expiredProp to Org Alpha for testing
      await prisma.property.update({
        where: { id: expiredProp.id },
        data: { organizationId: alphaOrgId },
      });

      res = await fetch(`${BASE_URL}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${alphaTokens.accessToken}`,
        },
        body: JSON.stringify({
          propertyId: expiredProp.id,
          name: 'Expired Property Launch Attempt',
          platform: 'META',
          status: 'ACTIVE', // attempts launch
        }),
      });
      data = await res.json();
      assertTest('Compliance Gate', 'Campaign Gatekeeper Enforced under Multi-Tenant Context', res.status === 422, `HTTP ${res.status}: ${data.error}`);
    }

    // Clean up test properties
    if (alphaPropId) await prisma.property.delete({ where: { id: alphaPropId } });
    if (betaPropId) await prisma.property.delete({ where: { id: betaPropId } });
    if (alphaLeadId) await prisma.lead.delete({ where: { id: alphaLeadId } });

  } catch (err: any) {
    console.error('Test runner fatal error:', err);
  } finally {
    server.close();
    await prisma.$disconnect();
    redis.disconnect();
  }

  console.log('\n================================================================');
  console.log('TEST SUITE EXECUTION SUMMARY');
  console.log('================================================================');
  const total = assertions.length;
  const passed = assertions.filter(a => a.passed).length;
  const failed = assertions.filter(a => !a.passed).length;
  console.log(`Total Assertions: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runAuthRbacTenancySuite().catch(err => {
  console.error('Fatal Suite Error:', err);
  process.exit(1);
});
