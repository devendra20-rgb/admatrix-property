/**
 * Phase 2B: AWS S3 Media Storage Comprehensive Automated Test Suite
 * 
 * Verifies:
 * 1. S3 Presigned PUT upload and GET download URL generation
 * 2. MIME type, file size (<= 10MB for images, <= 20MB for PDFs), and category validation
 * 3. Actual binary PUT streaming and byte-for-byte integrity check
 * 4. Object existence and magic byte verification during confirmation
 * 5. Failed upload cleanup tracking (PURGED vs CLEANUP_FAILED with explicit error logging)
 * 6. Concurrent upload rejection during property deletion (HTTP 409)
 * 7. Multi-Tenant isolation across upload, confirm, download, and delete
 * 8. Partial property deletion consistency:
 *    - Failure on FIRST asset (0 deleted, DB records intact)
 *    - Failure on MIDDLE asset (prior asset removed from DB, remaining assets & property preserved)
 *    - Failure on LAST asset (prior assets removed from DB, remaining asset & property preserved)
 *    - Normal retry success (final asset removed, property deleted, zero orphaned files)
 */

process.env.NODE_ENV = 'test';
import { app } from './server.js';
import { prisma } from './lib/prisma.js';
import { s3Service } from './services/s3.service.js';
import { PropertyLockService } from './services/property-lock.service.js';
import fs from 'node:fs';
import path from 'node:path';

let server: any;
let baseUrl = 'http://127.0.0.1:5066';

let orgAToken: string;
let orgAId: string;
let orgAUserId: string;

let orgBToken: string;
let orgBId: string;
let orgBUserId: string;

let superAdminToken: string;

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function request(
  method: string,
  urlPath: string,
  body?: any,
  token?: string,
  headers: Record<string, string> = {}
) {
  const reqHeaders: Record<string, string> = { ...headers };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  reqHeaders['x-bypass-ratelimit'] = 'test-runner-secret';

  let reqBody: any = undefined;
  if (body) {
    if (Buffer.isBuffer(body)) {
      reqBody = body;
    } else if (typeof body === 'object') {
      reqHeaders['Content-Type'] = 'application/json';
      reqBody = JSON.stringify(body);
    } else {
      reqBody = body;
    }
  }

  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: reqHeaders,
    body: reqBody,
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const arrayBuf = await res.arrayBuffer();
    data = Buffer.from(arrayBuf);
  }

  return { status: res.status, data, headers: res.headers };
}

async function setup() {
  const TEST_PORT = 5066;
  baseUrl = `http://127.0.0.1:${TEST_PORT}`;
  process.env.BACKEND_URL = baseUrl;
  server = app.listen(TEST_PORT);
  await new Promise((r) => setTimeout(r, 400));

  console.log(`\n===============================================================`);
  console.log(`🧪 Testing S3 Media Storage on ${baseUrl}`);
  console.log(`===============================================================\n`);

  // 1. Log in Org A Admin (Apex Luxury)
  const resA = await request('POST', '/api/auth/login', {
    email: 'admin@apexrealty.ae',
    password: 'Password123!',
  });
  orgAToken = resA.data.accessToken;
  orgAId = resA.data.user.organizationId;
  orgAUserId = resA.data.user.id;

  // 2. Set up Org B (create or fetch second test org)
  let orgB = await prisma.organization.findFirst({
    where: { name: 'Emaar Distinct Agency' },
  });
  if (!orgB) {
    orgB = await prisma.organization.create({
      data: {
        name: 'Emaar Distinct Agency',
        tradeLicense: 'DED-EMAAR-9922',
        reraNumber: 'ORN-88192',
      },
    });
  }
  orgBId = orgB.id;

  // Register or find Org B user
  let userB = await prisma.user.findFirst({
    where: { email: 'broker@emaardistinct.ae' },
  });
  if (!userB) {
    const argon2 = await import('argon2');
    const hash = await argon2.hash('Password123!', { type: argon2.argon2id });
    userB = await prisma.user.create({
      data: {
        email: 'broker@emaardistinct.ae',
        passwordHash: hash,
        name: 'Tariq Mansoor',
        role: 'BROKER',
        organizationId: orgBId,
      },
    });
  }
  orgBUserId = userB.id;

  const resB = await request('POST', '/api/auth/login', {
    email: 'broker@emaardistinct.ae',
    password: 'Password123!',
  });
  orgBToken = resB.data.accessToken;

  // 3. Log in Super Admin
  const resSuper = await request('POST', '/api/auth/login', {
    email: 'superadmin@admatrixplatform.ae',
    password: 'Password123!',
  });
  superAdminToken = resSuper.data.accessToken;
}

async function runTests() {
  await setup();

  try {
    console.log(`\n--- TEST GROUP 1: Presigned URL Generation & Input Validation ---`);

    // 1.1 Successful presigned upload URL generation
    const presignRes = await request(
      'POST',
      '/api/media/presign-upload',
      {
        fileName: 'luxury_facade.jpg',
        fileSize: 1024 * 500, // 500 KB
        mimeType: 'image/jpeg',
        category: 'PROPERTY_COVER',
      },
      orgAToken
    );

    assert(presignRes.status === 200, 'Presign upload endpoint returns 200 OK');
    assert(presignRes.data?.success === true, 'Response indicates success = true');
    assert(Boolean(presignRes.data?.data?.uploadUrl), 'Returns presigned uploadUrl');
    assert(Boolean(presignRes.data?.data?.downloadUrl), 'Returns presigned downloadUrl');
    assert(presignRes.data?.data?.key.startsWith(`organizations/${orgAId}/property-cover/`), 'S3 key is tenant-partitioned under organizations/{orgId}/property-cover/');

    // 1.2 Validation: Reject unsupported MIME type
    const invalidMimeRes = await request(
      'POST',
      '/api/media/presign-upload',
      {
        fileName: 'malicious.exe',
        fileSize: 1024 * 50,
        mimeType: 'application/x-msdownload',
        category: 'PROPERTY_IMAGE',
      },
      orgAToken
    );
    assert(invalidMimeRes.status === 400, 'Rejects unsupported MIME type with 400 Bad Request');
    assert(invalidMimeRes.data?.error?.includes('Unsupported file type'), 'Returns informative MIME validation error');

    // 1.3 Validation: Reject file exceeding 10MB limit
    const oversizedRes = await request(
      'POST',
      '/api/media/presign-upload',
      {
        fileName: 'huge_raw_photo.png',
        fileSize: 15 * 1024 * 1024, // 15MB (> 10MB limit)
        mimeType: 'image/png',
        category: 'PROPERTY_IMAGE',
      },
      orgAToken
    );
    assert(oversizedRes.status === 400, 'Rejects file > 10MB with 400 Bad Request');
    assert(oversizedRes.data?.error?.includes('exceeds the 10MB limit'), 'Returns size limit error message');

    // 1.4 Validation: Reject zero-byte file
    const zeroByteRes = await request(
      'POST',
      '/api/media/presign-upload',
      {
        fileName: 'empty.jpg',
        fileSize: 0,
        mimeType: 'image/jpeg',
        category: 'PROPERTY_IMAGE',
      },
      orgAToken
    );
    assert(zeroByteRes.status === 400, 'Rejects zero-byte file with 400 Bad Request');

    // 1.5 Validation: Reject invalid category
    const invalidCatRes = await request(
      'POST',
      '/api/media/presign-upload',
      {
        fileName: 'photo.jpg',
        fileSize: 1024 * 100,
        mimeType: 'image/jpeg',
        category: 'INVALID_CATEGORY',
      },
      orgAToken
    );
    assert(invalidCatRes.status === 400, 'Rejects invalid category with 400 Bad Request');

    console.log(`\n--- TEST GROUP 2: Confirmation Object Verification & Magic Bytes ---`);

    const uploadUrl = presignRes.data.data.uploadUrl;
    const s3Key = presignRes.data.data.key;
    const bucket = presignRes.data.data.bucket;

    // 2.1 Attempt confirmation BEFORE uploading to storage -> Must reject (Object not found)
    const prematureConfirm = await request(
      'POST',
      '/api/media/confirm',
      {
        key: s3Key,
        bucket,
        fileName: 'luxury_facade.jpg',
        fileSize: 1024 * 500,
        mimeType: 'image/jpeg',
        category: 'PROPERTY_COVER',
      },
      orgAToken
    );
    assert(prematureConfirm.status === 400, 'Rejects confirmation if object was not uploaded (400 Bad Request)');
    assert(prematureConfirm.data?.error?.includes('Storage verification failed'), 'Error specifies storage verification failure');

    // 2.2 Attempt uploading corrupted / spoofed magic bytes (e.g. text uploaded as JPEG)
    const spoofedBytes = Buffer.from('PLAIN_TEXT_CONTENT_DISGUISED_AS_JPEG_FILE');
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: spoofedBytes,
    });

    const spoofedConfirm = await request(
      'POST',
      '/api/media/confirm',
      {
        key: s3Key,
        bucket,
        fileName: 'luxury_facade.jpg',
        fileSize: spoofedBytes.length,
        mimeType: 'image/jpeg',
        category: 'PROPERTY_COVER',
      },
      orgAToken
    );
    assert(spoofedConfirm.status === 400, 'Rejects confirmation when magic bytes do not match declared MIME');
    assert(spoofedConfirm.data?.error?.includes('File signature mismatch'), 'Returns explicit file signature mismatch error');
    assert(spoofedConfirm.data?.cleanupStatus === 'PURGED', 'Rejected upload was safely purged from storage (cleanupStatus: PURGED)');

    // Verify physical file was purged from disk
    const localUploadsDir = s3Service.getLocalUploadsDir();
    const spoofedFilePath = path.join(localUploadsDir, s3Key);
    assert(!fs.existsSync(spoofedFilePath), 'Rejected spoofed file was verified unlinked from disk');

    // 2.3 Direct HTTP PUT of valid JPEG binary payload
    const validJpegBytes = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
      Buffer.from('ADMATRIX_REAL_JPEG_IMAGE_PAYLOAD_VALID_MAGIC_BYTES_DUBAI_2026'),
    ]);

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: validJpegBytes,
    });
    assert(uploadRes.status === 200, `Presigned binary PUT upload succeeds with HTTP ${uploadRes.status}`);

    console.log(`\n--- TEST GROUP 3: Upload Confirmation & PostgreSQL Persistence ---`);

    // Confirm upload with valid binary payload
    const confirmRes = await request(
      'POST',
      '/api/media/confirm',
      {
        key: s3Key,
        bucket,
        fileName: 'luxury_facade.jpg',
        fileSize: validJpegBytes.length,
        mimeType: 'image/jpeg',
        category: 'PROPERTY_COVER',
      },
      orgAToken
    );

    assert(confirmRes.status === 201, 'Confirm endpoint creates MediaAsset with 201 Created');
    const createdAsset = confirmRes.data.data;
    assert(createdAsset.key === s3Key, 'MediaAsset key matches presigned S3 key');
    assert(createdAsset.organizationId === orgAId, 'MediaAsset belongs to Org A');

    console.log(`\n--- TEST GROUP 4: Presigned Download & Binary Integrity ---`);

    // Request fresh presigned download URL
    const downloadMetaRes = await request(
      'GET',
      `/api/media/presign-download/${createdAsset.id}`,
      undefined,
      orgAToken
    );

    assert(downloadMetaRes.status === 200, 'Presign download returns 200 OK');
    const freshDownloadUrl = downloadMetaRes.data?.data?.downloadUrl;
    assert(Boolean(freshDownloadUrl), 'Returns fresh downloadUrl');

    // Fetch binary contents from downloadUrl
    const downloadBinaryRes = await fetch(freshDownloadUrl);
    assert(downloadBinaryRes.status === 200, 'Binary download succeeds with HTTP 200 OK');
    const downloadedBuffer = Buffer.from(await downloadBinaryRes.arrayBuffer());
    assert(downloadedBuffer.equals(validJpegBytes), 'Downloaded bytes exactly match uploaded binary bytes (Zero corruption)');

    console.log(`\n--- TEST GROUP 5: Multi-Tenant Isolation & Cross-Tenant Rejection ---`);

    // 5.1 Org B attempts to download Org A's media asset metadata -> Must be 404/Denied
    const crossTenantGet = await request(
      'GET',
      `/api/media/presign-download/${createdAsset.id}`,
      undefined,
      orgBToken
    );
    assert(crossTenantGet.status === 404, 'Cross-tenant GET download denied (404 Not Found / Access Denied)');

    // 5.2 Org B attempts to confirm a key belonging to Org A -> Must be 403 Forbidden
    const crossTenantConfirm = await request(
      'POST',
      '/api/media/confirm',
      {
        key: `organizations/${orgAId}/property-cover/stolen.jpg`,
        bucket,
        fileName: 'stolen.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        category: 'PROPERTY_COVER',
      },
      orgBToken
    );
    assert(crossTenantConfirm.status === 403, 'Cross-tenant key confirmation rejected with 403 Forbidden');

    // 5.3 Org B attempts to delete Org A's media asset -> Must be 404/Denied
    const crossTenantDelete = await request(
      'DELETE',
      `/api/media/${createdAsset.id}`,
      undefined,
      orgBToken
    );
    assert(crossTenantDelete.status === 404, 'Cross-tenant DELETE rejected with 404 Not Found / Access Denied');

    // 5.4 Super Admin CAN access Org A's media asset
    const superAdminGet = await request(
      'GET',
      `/api/media/presign-download/${createdAsset.id}`,
      undefined,
      superAdminToken
    );
    assert(superAdminGet.status === 200, 'SUPER_ADMIN can access media asset across organizations');

    console.log(`\n--- TEST GROUP 6: Failed Upload Cleanup Tracking ---`);

    // Simulate S3 cleanup failure during rejected upload confirmation
    const badPresign = await request(
      'POST',
      '/api/media/presign-upload',
      {
        fileName: 'corrupted_sample.png',
        fileSize: 1024,
        mimeType: 'image/png',
        category: 'PROPERTY_IMAGE',
      },
      orgAToken
    );
    // Put bad text bytes
    await fetch(badPresign.data.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: Buffer.from('NOT_A_PNG_FILE_CORRUPTED'),
    });

    const origDeleteWithRetry = s3Service.deleteObjectWithRetry.bind(s3Service);
    // Temporarily mock deletion failure
    s3Service.deleteObjectWithRetry = async () => {
      throw new Error('Simulated S3 network timeout during cleanup');
    };

    const failedCleanupConfirm = await request(
      'POST',
      '/api/media/confirm',
      {
        key: badPresign.data.data.key,
        bucket: badPresign.data.data.bucket,
        fileName: 'corrupted_sample.png',
        fileSize: 24,
        mimeType: 'image/png',
        category: 'PROPERTY_IMAGE',
      },
      orgAToken
    );

    assert(failedCleanupConfirm.status === 400, 'Rejects corrupted confirmation');
    assert(failedCleanupConfirm.data?.cleanupStatus === 'CLEANUP_FAILED', 'Explicitly reports cleanupStatus: CLEANUP_FAILED (Does not claim purged)');
    assert(failedCleanupConfirm.data?.orphanedStorageKey === badPresign.data.data.key, 'Returns orphanedStorageKey for tracking and recovery');

    // Restore delete function & manually clean up test file
    s3Service.deleteObjectWithRetry = origDeleteWithRetry;
    await s3Service.deleteObject(badPresign.data.data.key);

    console.log(`\n--- TEST GROUP 7: Deletion Safety & Concurrent Operations Blocking ---`);

    // Create a property to test concurrent locking
    const testProp = await prisma.property.create({
      data: {
        title: 'Concurrent Lock Penthouse',
        description: 'Test property for concurrency guards',
        propertyType: 'Penthouse',
        listingType: 'Sale',
        price: 22000000,
        bedrooms: 4,
        bathrooms: 5,
        builtUpArea: 5000,
        furnishingStatus: 'Furnished',
        community: 'Palm Jumeirah',
        address: 'Crescent West, Palm Jumeirah',
        status: 'DELETING', // Simulate property undergoing deletion
        organizationId: orgAId,
        createdById: orgAUserId,
      },
    });

    // 7.1 Presign upload URL request with propertyId for DELETING property -> Must reject with 409 Conflict
    const presignOnDeleting = await request(
      'POST',
      '/api/media/presign-upload',
      {
        fileName: 'upload_attempt.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        category: 'PROPERTY_IMAGE',
        propertyId: testProp.id,
      },
      orgAToken
    );
    assert(presignOnDeleting.status === 409, 'Rejects presigned upload generation for property in DELETING status (409 Conflict)');
    assert(presignOnDeleting.data?.error?.includes('Property is undergoing deletion'), 'Returns informative presign guard error');

    // 7.2 Property update (PUT /api/properties/:id) on DELETING property -> Must reject with 409 Conflict
    const updateOnDeleting = await request(
      'PUT',
      `/api/properties/${testProp.id}`,
      {
        title: 'Attempted Title Update While Deleting',
        price: 25000000,
      },
      orgAToken
    );
    assert(updateOnDeleting.status === 409, 'Rejects property update (PUT) while deletion is in progress (409 Conflict)');
    assert(updateOnDeleting.data?.error?.includes('Deletion is in progress'), 'Returns informative property update guard error');

    // 7.3 Already-issued upload URL confirmation:
    // Generate upload URL without propertyId first (simulating URL issued before deletion started)
    const racePresign = await request(
      'POST',
      '/api/media/presign-upload',
      {
        fileName: 'race_condition_asset.jpg',
        fileSize: validJpegBytes.length,
        mimeType: 'image/jpeg',
        category: 'PROPERTY_IMAGE',
      },
      orgAToken
    );
    // Upload physical binary to storage
    await fetch(racePresign.data.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: validJpegBytes,
    });
    const raceStorageFile = path.join(s3Service.getLocalUploadsDir(), racePresign.data.data.key);
    assert(fs.existsSync(raceStorageFile), 'Binary uploaded to storage before confirmation attempt');

    // Attempt to confirm an upload to a property undergoing deletion -> Must reject with 409 Conflict AND purge storage
    const concurrentAttach = await request(
      'POST',
      '/api/media/confirm',
      {
        key: racePresign.data.data.key,
        bucket: racePresign.data.data.bucket,
        fileName: 'race_condition_asset.jpg',
        fileSize: validJpegBytes.length,
        mimeType: 'image/jpeg',
        category: 'PROPERTY_IMAGE',
        propertyId: testProp.id,
      },
      orgAToken
    );
    assert(concurrentAttach.status === 409, 'Rejects media attachment to property in DELETING status with 409 Conflict');
    assert(concurrentAttach.data?.cleanupStatus === 'PURGED', 'Purges already-uploaded S3 object to prevent untracked orphan');
    assert(!fs.existsSync(raceStorageFile), 'Verified uploaded file was unlinked from storage on 409 rejection');

    // Clean up testProp
    await prisma.property.delete({ where: { id: testProp.id } });

    console.log(`\n--- TEST GROUP 8: Partial Property Deletion Failure Scenarios ---`);

    // Helper: Create a property with 3 real binary assets in S3 & PostgreSQL
    async function createMultiAssetProperty(title: string) {
      const prop = await prisma.property.create({
        data: {
          title,
          description: 'Multi-asset consistency test listing',
          propertyType: 'Penthouse',
          listingType: 'Sale',
          price: 30000000,
          bedrooms: 4,
          bathrooms: 5,
          builtUpArea: 5200,
          furnishingStatus: 'Furnished',
          community: 'Downtown Dubai',
          address: 'Sheikh Mohammed Bin Rashid Blvd',
          organizationId: orgAId,
          createdById: orgAUserId,
        },
      });

      const assetIds: string[] = [];
      const assetKeys: string[] = [];

      for (let i = 1; i <= 3; i++) {
        const presign = await request(
          'POST',
          '/api/media/presign-upload',
          {
            fileName: `asset_${i}.jpg`,
            fileSize: validJpegBytes.length,
            mimeType: 'image/jpeg',
            category: i === 1 ? 'PROPERTY_COVER' : 'PROPERTY_IMAGE',
          },
          orgAToken
        );

        await fetch(presign.data.data.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'image/jpeg' },
          body: validJpegBytes,
        });

        const confirm = await request(
          'POST',
          '/api/media/confirm',
          {
            key: presign.data.data.key,
            bucket: presign.data.data.bucket,
            fileName: `asset_${i}.jpg`,
            fileSize: validJpegBytes.length,
            mimeType: 'image/jpeg',
            category: i === 1 ? 'PROPERTY_COVER' : 'PROPERTY_IMAGE',
            propertyId: prop.id,
          },
          orgAToken
        );

        assetIds.push(confirm.data.data.id);
        assetKeys.push(presign.data.data.key);
      }

      return { propId: prop.id, assetIds, assetKeys };
    }

    // -------------------------------------------------------------------------
    // 8.1 FAILURE ON FIRST ASSET (Asset 1 fails S3 deletion)
    // -------------------------------------------------------------------------
    console.log('\n  [Scenario A] Failure on FIRST asset (Asset 1 fails S3 deletion)...');
    const scenA = await createMultiAssetProperty('Scenario A Property');

    // Mock failure on asset 1
    s3Service.deleteObjectWithRetry = async (key: string) => {
      if (key === scenA.assetKeys[0]) {
        throw new Error(`Simulated S3 failure on FIRST asset: ${key}`);
      }
      return origDeleteWithRetry(key);
    };

    const resA_del = await request('DELETE', `/api/properties/${scenA.propId}`, undefined, orgAToken);
    assert(resA_del.status === 502, 'Scenario A: Returns 502 Bad Gateway when FIRST asset fails S3 deletion');
    assert(resA_del.data?.deletedCount === 0, 'Scenario A: 0 assets deleted');

    // Verify all 3 MediaAsset records and Property remain intact in PostgreSQL
    const dbAssetsA = await prisma.mediaAsset.findMany({ where: { propertyId: scenA.propId } });
    assert(dbAssetsA.length === 3, 'Scenario A: All 3 MediaAsset records remain intact in database');
    const dbPropA = await prisma.property.findUnique({ where: { id: scenA.propId } });
    assert(dbPropA !== null && dbPropA.status === 'ACTIVE', 'Scenario A: Property preserved and reverted to ACTIVE status');

    // -------------------------------------------------------------------------
    // 8.2 FAILURE ON MIDDLE ASSET (Asset 2 fails S3 deletion)
    // -------------------------------------------------------------------------
    console.log('\n  [Scenario B] Failure on MIDDLE asset (Asset 2 fails S3 deletion)...');
    const scenB = await createMultiAssetProperty('Scenario B Property');

    s3Service.deleteObjectWithRetry = async (key: string) => {
      if (key === scenB.assetKeys[1]) {
        throw new Error(`Simulated S3 failure on MIDDLE asset: ${key}`);
      }
      return origDeleteWithRetry(key);
    };

    const resB_del = await request('DELETE', `/api/properties/${scenB.propId}`, undefined, orgAToken);
    assert(resB_del.status === 502, 'Scenario B: Returns 502 Bad Gateway when MIDDLE asset fails S3 deletion');
    assert(resB_del.data?.deletedCount === 1, 'Scenario B: Exactly 1 prior asset successfully deleted');

    // Verify Asset 1 DB record is DELETED (Never points to missing S3 object!)
    const asset1CheckB = await prisma.mediaAsset.findUnique({ where: { id: scenB.assetIds[0] } });
    assert(asset1CheckB === null, 'Scenario B: Asset 1 DB record was deleted (No DB record pointing to missing S3 file!)');

    // Verify Asset 2 and Asset 3 DB records REMAIN IN DATABASE
    const remainingAssetsB = await prisma.mediaAsset.findMany({ where: { propertyId: scenB.propId } });
    assert(remainingAssetsB.length === 2, 'Scenario B: Exactly 2 remaining assets preserved in database');
    assert(remainingAssetsB.some((a) => a.id === scenB.assetIds[1]), 'Scenario B: Failed Asset 2 remains in database');
    assert(remainingAssetsB.some((a) => a.id === scenB.assetIds[2]), 'Scenario B: Unreached Asset 3 remains in database');

    const dbPropB = await prisma.property.findUnique({ where: { id: scenB.propId } });
    assert(dbPropB !== null && dbPropB.status === 'ACTIVE', 'Scenario B: Property preserved in database with remaining 2 assets');

    // -------------------------------------------------------------------------
    // 8.3 FAILURE ON LAST ASSET (Asset 3 fails S3 deletion)
    // -------------------------------------------------------------------------
    console.log('\n  [Scenario C] Failure on LAST asset (Asset 3 fails S3 deletion)...');
    const scenC = await createMultiAssetProperty('Scenario C Property');

    s3Service.deleteObjectWithRetry = async (key: string) => {
      if (key === scenC.assetKeys[2]) {
        throw new Error(`Simulated S3 failure on LAST asset: ${key}`);
      }
      return origDeleteWithRetry(key);
    };

    const resC_del = await request('DELETE', `/api/properties/${scenC.propId}`, undefined, orgAToken);
    assert(resC_del.status === 502, 'Scenario C: Returns 502 Bad Gateway when LAST asset fails S3 deletion');
    assert(resC_del.data?.deletedCount === 2, 'Scenario C: Exactly 2 prior assets successfully deleted');

    // Verify Asset 1 and Asset 2 DB records are DELETED
    const asset1CheckC = await prisma.mediaAsset.findUnique({ where: { id: scenC.assetIds[0] } });
    const asset2CheckC = await prisma.mediaAsset.findUnique({ where: { id: scenC.assetIds[1] } });
    assert(asset1CheckC === null && asset2CheckC === null, 'Scenario C: Prior assets 1 & 2 DB records deleted');

    // Verify Asset 3 and Property REMAIN IN DATABASE
    const remainingAssetsC = await prisma.mediaAsset.findMany({ where: { propertyId: scenC.propId } });
    assert(remainingAssetsC.length === 1 && remainingAssetsC[0].id === scenC.assetIds[2], 'Scenario C: Failed Asset 3 preserved in database');
    const dbPropC = await prisma.property.findUnique({ where: { id: scenC.propId } });
    assert(dbPropC !== null && dbPropC.status === 'ACTIVE', 'Scenario C: Property preserved in database with remaining 1 asset');

    // -------------------------------------------------------------------------
    // 8.4 RETRY & FULL CLEANUP RECOVERY (S3 Restored)
    // -------------------------------------------------------------------------
    console.log('\n  [Scenario D] Retry & Full Recovery with S3 restored...');
    s3Service.deleteObjectWithRetry = origDeleteWithRetry;

    // Retry deleting Scenario A, B, and C properties now that S3 is operational
    for (const scen of [scenA, scenB, scenC]) {
      const retryDel = await request('DELETE', `/api/properties/${scen.propId}`, undefined, orgAToken);
      assert(retryDel.status === 200, `Recovery: Property ${scen.propId} deleted successfully on retry`);
      const checkProp = await prisma.property.findUnique({ where: { id: scen.propId } });
      assert(checkProp === null, `Recovery: Property ${scen.propId} fully removed from database`);
      const checkAssets = await prisma.mediaAsset.findMany({ where: { propertyId: scen.propId } });
      assert(checkAssets.length === 0, `Recovery: All child MediaAsset records fully removed from database`);
    }

    // Clean up createdAsset
    await request('DELETE', `/api/media/${createdAsset.id}`, undefined, orgAToken);

    console.log(`\n--- TEST GROUP 9: Edge Cases (DB Failure After S3, Crash Recovery & Schema Verification) ---`);

    // 9.1 Database failure after S3 deletion:
    console.log('\n  [Scenario E] Database failure after S3 deletion...');
    const scenE = await createMultiAssetProperty('Scenario E DB Failure Property');
    
    // Monkey patch prisma.mediaAsset.delete to fail on first attempt
    const origMediaAssetDelete = prisma.mediaAsset.delete;
    let dbDeleteFailed = false;
    (prisma.mediaAsset as any).delete = async (args: any) => {
      if (!dbDeleteFailed && args?.where?.id === scenE.assetIds[0]) {
        dbDeleteFailed = true;
        throw new Error('Simulated PostgreSQL connection drop during MediaAsset record deletion');
      }
      return origMediaAssetDelete.call(prisma.mediaAsset, args);
    };

    const resE_del = await request('DELETE', `/api/properties/${scenE.propId}`, undefined, orgAToken);
    assert(resE_del.status === 502, 'Scenario E: Returns 502 Bad Gateway when DB deletion fails after S3 object is unlinked');
    assert(resE_del.data?.error?.includes('Storage-database sync failure'), 'Scenario E: Reports storage-database sync failure diagnostic');
    
    // Check that property was reverted to ACTIVE
    const propE_check = await prisma.property.findUnique({ where: { id: scenE.propId } });
    assert(propE_check?.status === 'ACTIVE', 'Scenario E: Property reverted to ACTIVE status so it can be reconciled');
    
    // S3 object was physically deleted, but DB record still exists
    const assetE_db = await prisma.mediaAsset.findUnique({ where: { id: scenE.assetIds[0] } });
    assert(assetE_db !== null, 'Scenario E: MediaAsset DB record preserved when DB delete fails');
    const assetE_disk = fs.existsSync(path.join(s3Service.getLocalUploadsDir(), scenE.assetKeys[0]));
    assert(!assetE_disk, 'Scenario E: Physical S3 file was already deleted');

    // Restore prisma.mediaAsset.delete
    (prisma.mediaAsset as any).delete = origMediaAssetDelete;

    // Retry DELETE /api/properties/:id -> Should succeed idempotently even though file is already gone
    const resE_retry = await request('DELETE', `/api/properties/${scenE.propId}`, undefined, orgAToken);
    assert(resE_retry.status === 200, 'Scenario E Recovery: Re-running deletion reconciles the dangling record idempotently');
    const propE_final = await prisma.property.findUnique({ where: { id: scenE.propId } });
    assert(propE_final === null, 'Scenario E Recovery: Property fully deleted from database on retry');
    const assetsE_final = await prisma.mediaAsset.findMany({ where: { propertyId: scenE.propId } });
    assert(assetsE_final.length === 0, 'Scenario E Recovery: All child assets fully deleted from database on retry');

    // 9.2 Interrupted deletion recovery (Server Crash simulation):
    console.log('\n  [Scenario F] Interrupted deletion recovery (Server crash simulation)...');
    const scenF = await createMultiAssetProperty('Scenario F Crash Recovery Property');
    
    // Simulate server crashing right after setting property to DELETING (Redis lock expired/cleared)
    await prisma.property.update({
      where: { id: scenF.propId },
      data: { status: 'DELETING' },
    });

    // Calling DELETE safely acquires a fresh lock, resumes and completes the interrupted deletion
    const resumeDelete = await request('DELETE', `/api/properties/${scenF.propId}`, undefined, orgAToken);
    assert(resumeDelete.status === 200, 'Interrupted Deletion: Resumed deletion completes with 200 OK');
    const propF_final = await prisma.property.findUnique({ where: { id: scenF.propId } });
    assert(propF_final === null, 'Interrupted Deletion: Property cleanly removed after crash recovery');
    const assetsF_final = await prisma.mediaAsset.findMany({ where: { propertyId: scenF.propId } });
    assert(assetsF_final.length === 0, 'Interrupted Deletion: All child assets cleanly removed after crash recovery');

    // 9.3 Schema verification:
    console.log('\n  [Scenario G] Schema verification for DELETING status...');
    const schemaTestProp = await prisma.property.create({
      data: {
        title: 'Schema Verification Property',
        description: 'Verify status column accepts DELETING',
        propertyType: 'Apartment',
        listingType: 'Rent',
        price: 150000,
        bedrooms: 2,
        bathrooms: 2,
        builtUpArea: 1200,
        furnishingStatus: 'Furnished',
        community: 'Downtown Dubai',
        address: 'Downtown Blvd',
        status: 'DELETING',
        organizationId: orgAId,
        createdById: orgAUserId,
      },
    });
    assert(schemaTestProp.status === 'DELETING', 'Schema: PostgreSQL and Prisma natively persist and return DELETING status');
    await prisma.property.delete({ where: { id: schemaTestProp.id } });

    console.log(`\n--- TEST GROUP 10: Advanced Concurrency & Race Condition Elimination ---`);

    // 10.1 Simultaneous DELETE requests race condition test:
    console.log('\n  [10.1] Simultaneous DELETE race condition...');
    const simulProp = await createMultiAssetProperty('Simultaneous Delete Race Property');
    
    // Launch two simultaneous DELETE requests with Promise.all
    const [simul1, simul2] = await Promise.all([
      request('DELETE', `/api/properties/${simulProp.propId}`, undefined, orgAToken),
      request('DELETE', `/api/properties/${simulProp.propId}`, undefined, orgAToken),
    ]);

    // Exactly one must acquire the lock and succeed (200), the other must be rejected (409)
    const successCount = [simul1, simul2].filter((r) => r.status === 200).length;
    const conflictCount = [simul1, simul2].filter((r) => r.status === 409).length;
    assert(successCount === 1, 'Simultaneous DELETE: Exactly one request acquires the atomic lock and succeeds with 200 OK');
    assert(conflictCount === 1, 'Simultaneous DELETE: Exactly one request is rejected with 409 Conflict (Zero race condition)');

    // Verify property and assets are completely deleted
    const simulCheckProp = await prisma.property.findUnique({ where: { id: simulProp.propId } });
    assert(simulCheckProp === null, 'Simultaneous DELETE: Property is fully deleted from database');
    const simulCheckAssets = await prisma.mediaAsset.findMany({ where: { propertyId: simulProp.propId } });
    assert(simulCheckAssets.length === 0, 'Simultaneous DELETE: All child assets cleanly deleted');

    // 10.2 Forced retry during an active deletion:
    console.log('\n  [10.2] Forced retry (?retry=true / ?force=true) during an active deletion...');
    const activeProp = await createMultiAssetProperty('Active Lock Property');
    
    // Simulate an ongoing active deletion process holding the lock
    const activeLock = await PropertyLockService.acquireLock(activeProp.propId, 30000);
    assert(activeLock.acquired === true, 'Lock acquired for simulated active deletion');

    // Attempt DELETE with ?retry=true and ?force=true while lock is actively held
    const retryAttempt = await request('DELETE', `/api/properties/${activeProp.propId}?retry=true`, undefined, orgAToken);
    assert(retryAttempt.status === 409, 'Forced retry (?retry=true) is rejected with 409 Conflict while deletion is actively executing');
    assert(retryAttempt.data?.error?.includes('actively in progress'), 'Returns active deletion error message');

    const forceAttempt = await request('DELETE', `/api/properties/${activeProp.propId}?force=true`, undefined, orgAToken);
    assert(forceAttempt.status === 409, 'Forced retry (?force=true) is rejected with 409 Conflict while deletion is actively executing');

    // Release simulated lock and perform clean deletion
    await PropertyLockService.releaseLock(activeProp.propId, activeLock.lockToken);
    const cleanActiveDel = await request('DELETE', `/api/properties/${activeProp.propId}`, undefined, orgAToken);
    assert(cleanActiveDel.status === 200, 'Property deleted cleanly once lock is released');

    // 10.3 Slow deletion exceeding 30 seconds (Heartbeat extension):
    console.log('\n  [10.3] Slow deletion exceeding 30 seconds (Heartbeat lock extension)...');
    const slowProp = await createMultiAssetProperty('Slow Deletion Property');
    
    // Acquire lock with short initial TTL
    const slowLock = await PropertyLockService.acquireLock(slowProp.propId, 2000);
    
    // Simulate heartbeat extension (as happens during slow asset processing)
    const extended = await PropertyLockService.extendLock(slowProp.propId, slowLock.lockToken, 30000);
    assert(extended === true, 'Heartbeat successfully extended lock TTL to 30s');

    // Attempt to steal lock from another request
    const stealAttempt = await request('DELETE', `/api/properties/${slowProp.propId}`, undefined, orgAToken);
    assert(stealAttempt.status === 409, 'Slow deletion: Active lock cannot be stolen by another request even during slow operations');

    // Release and clean up
    await PropertyLockService.releaseLock(slowProp.propId, slowLock.lockToken);
    const slowDelCleanup = await request('DELETE', `/api/properties/${slowProp.propId}`, undefined, orgAToken);
    assert(slowDelCleanup.status === 200, 'Slow property cleaned up successfully');

    // 10.4 Upload occurring after a previous confirmation cleanup:
    console.log('\n  [10.4] Upload occurring after a previous confirmation cleanup...');
    const cleanupProp = await prisma.property.create({
      data: {
        title: 'Confirmation Cleanup Property',
        description: 'Testing subsequent upload cleanup',
        propertyType: 'Villa',
        listingType: 'Sale',
        price: 18000000,
        bedrooms: 3,
        bathrooms: 4,
        builtUpArea: 4000,
        furnishingStatus: 'Furnished',
        community: 'Dubai Hills',
        address: 'Parkway Vistas',
        status: 'DELETING',
        organizationId: orgAId,
        createdById: orgAUserId,
      },
    });

    // Client pre-issued presigned upload URL
    const preIssuedPresign = await request(
      'POST',
      '/api/media/presign-upload',
      {
        fileName: 'repeated_upload.jpg',
        fileSize: validJpegBytes.length,
        mimeType: 'image/jpeg',
        category: 'PROPERTY_IMAGE',
      },
      orgAToken
    );

    // First upload & confirmation attempt
    await fetch(preIssuedPresign.data.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: validJpegBytes,
    });
    const firstConfirm = await request(
      'POST',
      '/api/media/confirm',
      {
        key: preIssuedPresign.data.data.key,
        bucket: preIssuedPresign.data.data.bucket,
        fileName: 'repeated_upload.jpg',
        fileSize: validJpegBytes.length,
        mimeType: 'image/jpeg',
        category: 'PROPERTY_IMAGE',
        propertyId: cleanupProp.id,
      },
      orgAToken
    );
    assert(firstConfirm.status === 409, 'First confirmation on DELETING property rejected with 409');
    assert(firstConfirm.data?.cleanupStatus === 'PURGED', 'First upload was purged');

    // Second upload using the same pre-issued key after the first cleanup
    await fetch(preIssuedPresign.data.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: validJpegBytes,
    });
    const diskFileAfterUpload2 = path.join(s3Service.getLocalUploadsDir(), preIssuedPresign.data.data.key);
    assert(fs.existsSync(diskFileAfterUpload2), 'Second binary uploaded to storage after first cleanup');

    // Second confirmation attempt -> Must also reject AND purge again!
    const secondConfirm = await request(
      'POST',
      '/api/media/confirm',
      {
        key: preIssuedPresign.data.data.key,
        bucket: preIssuedPresign.data.data.bucket,
        fileName: 'repeated_upload.jpg',
        fileSize: validJpegBytes.length,
        mimeType: 'image/jpeg',
        category: 'PROPERTY_IMAGE',
        propertyId: cleanupProp.id,
      },
      orgAToken
    );
    assert(secondConfirm.status === 409, 'Second confirmation rejected with 409');
    assert(secondConfirm.data?.cleanupStatus === 'PURGED', 'Second upload was also safely purged');
    assert(!fs.existsSync(diskFileAfterUpload2), 'Verified zero orphaned files remain in storage after repeated upload cleanup');

    // Clean up property
    await prisma.property.delete({ where: { id: cleanupProp.id } });

    // 10.5 Expired presigned upload URL rejection test:
    console.log('\n  [10.5] Expired presigned URL rejection...');
    const expiredTimestamp = Date.now() - 10000;
    const expiredKey = `organizations/${orgAId}/property-image/expired_test.jpg`;
    const expiredToken = s3Service.signLocalToken(expiredKey, 'put', expiredTimestamp);
    const expiredUploadUrl = `${baseUrl}/api/media/storage/${encodeURIComponent(expiredKey)}?action=put&token=${expiredToken}&expires=${expiredTimestamp}`;
    
    const expiredUploadRes = await fetch(expiredUploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: validJpegBytes,
    });
    assert(expiredUploadRes.status === 403, 'Storage engine directly rejects uploads to expired presigned URLs with 403 Forbidden');

    // 10.6 Fail-Closed: Redis Unavailable Prevents Property Deletion
    console.log('\n  [10.6] Strictly Fail-Closed: Redis unavailable blocks deletion...');
    const failClosedProp = await createMultiAssetProperty('Fail Closed Redis Down Property');
    
    // Import redis to mock failure
    const { redis } = await import('./lib/redis.js');
    const origRedisSet = redis.set;
    (redis as any).set = async () => {
      throw new Error('Connection lost to Redis cluster (ECONNREFUSED 6381)');
    };

    const redisDownDel = await request('DELETE', `/api/properties/${failClosedProp.propId}`, undefined, orgAToken);
    assert(redisDownDel.status === 503, 'Fail-Closed: Returns 503 Service Unavailable when Redis lock store is down');
    assert(redisDownDel.data?.error?.includes('fail-closed policy'), 'Fail-Closed: Error specifies blocked by fail-closed policy');
    
    // Property must still exist in database
    const failClosedCheck = await prisma.property.findUnique({ where: { id: failClosedProp.propId } });
    assert(failClosedCheck !== null, 'Fail-Closed: Property deletion was strictly blocked; record remains intact');

    // Restore redis.set
    (redis as any).set = origRedisSet;

    // 10.7 Fail-Closed: Heartbeat Failure Halts Deletion
    console.log('\n  [10.7] Strictly Fail-Closed: Heartbeat extension failure halts deletion...');
    const origExtendLock = PropertyLockService.extendLock;
    PropertyLockService.extendLock = async () => false; // Simulate heartbeat extension failure

    const heartbeatFailDel = await request('DELETE', `/api/properties/${failClosedProp.propId}`, undefined, orgAToken);
    assert(heartbeatFailDel.status === 503, 'Fail-Closed: Returns 503 when lock heartbeat extension fails');
    assert(heartbeatFailDel.data?.error?.includes('Lock heartbeat extension failed'), 'Fail-Closed: Explains heartbeat failure halted deletion');

    const checkPropReverted = await prisma.property.findUnique({ where: { id: failClosedProp.propId } });
    assert(checkPropReverted !== null && checkPropReverted.status === 'ACTIVE', 'Fail-Closed: Property reverted to ACTIVE on heartbeat failure');

    // Restore extendLock and clean up property
    PropertyLockService.extendLock = origExtendLock;
    const cleanFailClosed = await request('DELETE', `/api/properties/${failClosedProp.propId}`, undefined, orgAToken);
    assert(cleanFailClosed.status === 200, 'Fail-Closed: Property successfully cleaned up with healthy Redis');

    // 10.8 Lock Release Ownership Verification
    console.log('\n  [10.8] Lock Release Ownership Verification...');
    const testOwnershipLock = await PropertyLockService.acquireLock('test-ownership-prop-id', 30000);
    assert(testOwnershipLock.acquired === true, 'Lock acquired with token A');

    // Attempt release with unauthorized token B
    const releaseWithWrongToken = await PropertyLockService.releaseLock('test-ownership-prop-id', 'wrong-token-uuid-1234');
    assert(releaseWithWrongToken === false, 'Cannot release lock with mismatched token');

    const stillActive = await PropertyLockService.isLockActive('test-ownership-prop-id');
    assert(stillActive === true, 'Lock remains active in Redis after failed release attempt with wrong token');

    // Release with correct token A
    const releaseWithCorrectToken = await PropertyLockService.releaseLock('test-ownership-prop-id', testOwnershipLock.lockToken);
    assert(releaseWithCorrectToken === true, 'Lock successfully released with matching token');
    const noLongerActive = await PropertyLockService.isLockActive('test-ownership-prop-id');
    assert(noLongerActive === false, 'Lock verified deleted from Redis after authorized release');

    console.log(`\n===============================================================`);
    console.log(`🏁 Phase 2B Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`===============================================================\n`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

runTests();
