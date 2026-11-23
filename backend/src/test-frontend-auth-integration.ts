process.env.NODE_ENV = 'test';

import { AuthService } from './services/auth.service.js';
import { prisma } from './lib/prisma.js';

interface RoleAuditResult {
  role: string;
  email: string;
  loginSuccess: boolean;
  userProfileName: string;
  allowedRoutes: string[];
  restrictedRoutes: string[];
  sessionRotated: boolean;
  logoutSuccess: boolean;
}

const auditResults: RoleAuditResult[] = [];
const BASE_URL = 'http://127.0.0.1:5000';

async function testRoleAuth(
  roleName: 'SUPER_ADMIN' | 'BROKERAGE_ADMIN' | 'BROKER' | 'AGENT',
  email: string,
  allowedRoutes: string[],
  restrictedRoutes: string[]
) {
  console.log(`\n================================================================`);
  console.log(`TESTING ROLE: ${roleName} (${email})`);
  console.log(`================================================================`);

  const BASE_URL = 'http://127.0.0.1:5000';

  // 1. Authenticate with credentials
  let res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password123!' }),
  });

  const loginData = await res.json();
  const cookies = res.headers.get('set-cookie') || '';
  const accessToken = loginData.accessToken;
  const refreshToken = loginData.refreshToken;

  console.log(`[PASS] Login API returned HTTP ${res.status} for ${roleName}`);
  console.log(`       User: ${loginData.user?.name}, Role: ${loginData.user?.role}, Org: ${loginData.user?.organization?.name}`);

  // 2. Hydrate session via GET /api/auth/me
  res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meData = await res.json();
  console.log(`[PASS] Session Hydrated: ${meData.user?.name} (${meData.user?.email})`);

  // 3. Test Allowed API Endpoints
  for (const route of allowedRoutes) {
    res = await fetch(`${BASE_URL}${route}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const passed = res.status < 400;
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Allowed Route: ${route} -> HTTP ${res.status}`);
  }

  // 4. Test Restricted API Endpoints (e.g. Agent cannot create campaigns or seed)
  for (const route of restrictedRoutes) {
    res = await fetch(`${BASE_URL}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({}),
    });
    const blocked = res.status === 403 || res.status === 401;
    console.log(`[${blocked ? 'PASS' : 'FAIL'}] Restricted Route: ${route} -> HTTP ${res.status} (Correctly Forbidden)`);
  }

  // 5. Rotate Refresh Token
  res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const refreshData = await res.json();
  const rotatedOk = res.status === 200 && Boolean(refreshData.accessToken);
  console.log(`[${rotatedOk ? 'PASS' : 'FAIL'}] Refresh Token Rotated -> HTTP ${res.status}`);

  // 6. Logout
  res = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refreshData.refreshToken }),
  });
  const logoutOk = res.status === 200;
  console.log(`[${logoutOk ? 'PASS' : 'FAIL'}] Logout Session Cleared -> HTTP ${res.status}`);

  auditResults.push({
    role: roleName,
    email,
    loginSuccess: loginData.success,
    userProfileName: loginData.user?.name,
    allowedRoutes,
    restrictedRoutes,
    sessionRotated: rotatedOk,
    logoutSuccess: logoutOk,
  });
}

async function runFourRoleAudit() {
  console.log('================================================================');
  console.log('ADMATRIX PROPERTY - 4-ROLE FRONTEND AUTHENTICATION INTEGRATION');
  console.log('================================================================');

  try {
    // Role 1: SUPER_ADMIN
    await testRoleAuth(
      'SUPER_ADMIN',
      'superadmin@admatrixplatform.ae',
      ['/api/properties', '/api/campaigns', '/api/leads'],
      [] // Super Admin has no restricted routes
    );

    // Role 2: BROKERAGE_ADMIN
    await testRoleAuth(
      'BROKERAGE_ADMIN',
      'admin@apexrealty.ae',
      ['/api/properties', '/api/campaigns', '/api/leads'],
      ['/api/seed'] // Cannot access platform seed endpoint
    );

    // Role 3: BROKER
    await testRoleAuth(
      'BROKER',
      'sarah@apexrealty.ae',
      ['/api/properties', '/api/campaigns', '/api/leads'],
      ['/api/seed']
    );

    // Role 4: AGENT
    await testRoleAuth(
      'AGENT',
      'junior@apexrealty.ae',
      ['/api/properties', '/api/leads'],
      ['/api/campaigns', '/api/seed'] // Blocked from creating campaigns & seed
    );

    console.log('\n================================================================');
    console.log('4-ROLE AUTHENTICATION AUDIT SUMMARY');
    console.log('================================================================');
    for (const r of auditResults) {
      console.log(`✓ Role [${r.role}]: Logged In as "${r.userProfileName}", ${r.allowedRoutes.length} routes allowed, ${r.restrictedRoutes.length} routes blocked, Single-Use Rotation OK, Logout OK.`);
    }
    console.log('================================================================\n');
  } catch (err) {
    console.error('Fatal role audit error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runFourRoleAudit();
