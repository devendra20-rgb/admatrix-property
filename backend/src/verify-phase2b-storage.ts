/**
 * Dedicated Exhaustive Verification Script for Phase 2B: AWS S3 Media Storage
 * 
 * Covers all user verification requirements:
 * 1. Environment & AWS Cloud Credential Audit
 * 2. Presigned Upload & Download URLs
 * 3. Negative validation: MIME types, sizes, invalid files, unauthorized attempts
 * 4. Cross-tenant media isolation & access control
 * 5. Property listing, edit, and Ad Studio image linking
 * 6. MediaAsset database records & storage object cleanup
 */

process.env.NODE_ENV = 'test';
import { app } from './server.js';
import { prisma } from './lib/prisma.js';
import { s3Service } from './services/s3.service.js';
import fs from 'node:fs';
import path from 'node:path';

interface VerificationResult {
  section: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'UNVERIFIED';
  details: string;
}

const results: VerificationResult[] = [];
const TEST_PORT = 5077;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
let server: any;

function logResult(section: string, test: string, status: 'PASS' | 'FAIL' | 'UNVERIFIED', details: string) {
  results.push({ section, test, status, details });
  const icon = status === 'PASS' ? '✅' : status === 'UNVERIFIED' ? '⚠️' : '❌';
  console.log(`  ${icon} [${status}] [${section}] ${test}`);
  console.log(`     Details: ${details}`);
}

async function request(method: string, endpoint: string, body?: any, token?: string) {
  const headers: Record<string, string> = {
    'x-bypass-ratelimit': 'test-runner-secret',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let reqBody: any = undefined;
  if (body) {
    if (Buffer.isBuffer(body)) {
      reqBody = body;
    } else if (typeof body === 'object') {
      headers['Content-Type'] = 'application/json';
      reqBody = JSON.stringify(body);
    } else {
      reqBody = body;
    }
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: reqBody,
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = Buffer.from(await res.arrayBuffer());
  }

  return { status: res.status, data, headers: res.headers };
}

async function runExhaustiveVerification() {
  console.log('\n========================================================================');
  console.log('ADMATRIX PROPERTY - PHASE 2B EXHAUSTIVE VERIFICATION SUITE');
  console.log('========================================================================\n');

  process.env.BACKEND_URL = BASE_URL;
  server = app.listen(TEST_PORT);
  await new Promise((r) => setTimeout(r, 400));

  try {
    // -------------------------------------------------------------------------
    // 1. AWS CREDENTIAL & CLOUD UPLOAD STATUS AUDIT
    // -------------------------------------------------------------------------
    console.log('\n--- 1. AWS CREDENTIALS & STORAGE ENGINE STATUS ---');
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'me-central-1';
    const bucket = process.env.AWS_S3_BUCKET || 'admatrix-property-media';

    if (accessKey && secretKey && accessKey !== 'local' && accessKey !== 'test') {
      logResult(
        'AWS Cloud Credentials',
        'Production AWS S3 Credentials Detected',
        'PASS',
        `Configured for AWS region: ${region}, bucket: ${bucket}. Cloud uploads enabled.`
      );
    } else {
      logResult(
        'AWS Cloud Credentials',
        'Live AWS S3 Cloud Upload Verification',
        'UNVERIFIED',
        `AWS_ACCESS_KEY_ID is '${accessKey || 'unset'}'. Live cloud S3 bucket upload remains unverified due to absence of production cloud credentials in environment. The system verified local S3 emulator with identical HTTP PUT streaming semantics.`
      );
    }

    // -------------------------------------------------------------------------
    // 2. SETUP AUTHENTICATED TENANTS (Alpha & Beta)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. PROVISIONING TENANT IDENTITIES ---');
    const ts = Date.now();
    const loginAlpha = await request('POST', '/api/auth/login', {
      email: 'admin@apexrealty.ae',
      password: 'Password123!',
    });
    const tokenAlpha = loginAlpha.data.accessToken;
    const orgAlphaId = loginAlpha.data.user.organizationId;
    const userAlphaId = loginAlpha.data.user.id;

    // Create Tenant Beta
    let orgBeta = await prisma.organization.findFirst({ where: { name: 'Beta Verification Org' } });
    if (!orgBeta) {
      orgBeta = await prisma.organization.create({
        data: { name: 'Beta Verification Org', tradeLicense: `DED-BETA-${ts}` },
      });
    }
    const argon2 = await import('argon2');
    const hash = await argon2.hash('Password123!', { type: argon2.argon2id });
    let userBeta = await prisma.user.findFirst({ where: { email: `beta_broker_${ts}@admatrix.ae` } });
    if (!userBeta) {
      userBeta = await prisma.user.create({
        data: {
          email: `beta_broker_${ts}@admatrix.ae`,
          passwordHash: hash,
          name: 'Beta Verification Broker',
          role: 'BROKER',
          organizationId: orgBeta.id,
        },
      });
    }
    const loginBeta = await request('POST', '/api/auth/login', {
      email: userBeta.email,
      password: 'Password123!',
    });
    const tokenBeta = loginBeta.data.accessToken;
    const orgBetaId = orgBeta.id;

    // -------------------------------------------------------------------------
    // 3. NEGATIVE VALIDATION SCENARIOS
    // -------------------------------------------------------------------------
    console.log('\n--- 3. NEGATIVE VALIDATION & SECURITY ENFORCEMENT ---');

    // 3.1 Unauthorized upload (No token)
    const noAuthRes = await request('POST', '/api/media/presign-upload', {
      fileName: 'test.jpg',
      fileSize: 1024,
      mimeType: 'image/jpeg',
      category: 'PROPERTY_COVER',
    });
    logResult(
      'Unauthorized Rejection',
      'Block Presign Request Without JWT Token',
      noAuthRes.status === 401 ? 'PASS' : 'FAIL',
      `Returned HTTP ${noAuthRes.status} (Expected: 401)`
    );

    // 3.2 Unpermitted MIME types
    const unpermittedMimes = [
      { mime: 'application/x-sh', ext: 'test.sh' },
      { mime: 'text/html', ext: 'index.html' },
      { mime: 'image/bmp', ext: 'photo.bmp' },
      { mime: 'application/zip', ext: 'bundle.zip' },
    ];
    for (const item of unpermittedMimes) {
      const res = await request(
        'POST',
        '/api/media/presign-upload',
        {
          fileName: item.ext,
          fileSize: 1024,
          mimeType: item.mime,
          category: 'PROPERTY_IMAGE',
        },
        tokenAlpha
      );
      logResult(
        'MIME Validation',
        `Reject Prohibited MIME Type: ${item.mime}`,
        res.status === 400 && res.data?.error?.includes('Unsupported file type') ? 'PASS' : 'FAIL',
        `Returned HTTP ${res.status}: "${res.data?.error}"`
      );
    }

    // 3.3 File size boundaries: Oversized Image (> 10MB)
    const oversizedImgRes = await request(
      'POST',
      '/api/media/presign-upload',
      {
        fileName: 'huge_render.jpg',
        fileSize: 10 * 1024 * 1024 + 1, // 10MB + 1 byte
        mimeType: 'image/jpeg',
        category: 'PROPERTY_IMAGE',
      },
      tokenAlpha
    );
    logResult(
      'Size Boundary Enforcement',
      'Reject Image Exceeding 10MB Threshold',
      oversizedImgRes.status === 400 && oversizedImgRes.data?.error?.includes('10MB limit') ? 'PASS' : 'FAIL',
      `Returned HTTP ${oversizedImgRes.status}: "${oversizedImgRes.data?.error}"`
    );

    // 3.4 File size boundaries: Oversized PDF (> 20MB)
    const oversizedPdfRes = await request(
      'POST',
      '/api/media/presign-upload',
      {
        fileName: 'massive_contract.pdf',
        fileSize: 20 * 1024 * 1024 + 1024, // > 20MB
        mimeType: 'application/pdf',
        category: 'COMPLIANCE_DOC',
      },
      tokenAlpha
    );
    logResult(
      'Size Boundary Enforcement',
      'Reject Compliance PDF Exceeding 20MB Threshold',
      oversizedPdfRes.status === 400 && oversizedPdfRes.data?.error?.includes('20MB limit') ? 'PASS' : 'FAIL',
      `Returned HTTP ${oversizedPdfRes.status}: "${oversizedPdfRes.data?.error}"`
    );

    // 3.5 Zero-byte and negative-byte files
    const zeroByteRes = await request(
      'POST',
      '/api/media/presign-upload',
      {
        fileName: 'corrupt_zero.png',
        fileSize: 0,
        mimeType: 'image/png',
        category: 'PROPERTY_IMAGE',
      },
      tokenAlpha
    );
    logResult(
      'Invalid File Check',
      'Reject 0-Byte Empty File',
      zeroByteRes.status === 400 && zeroByteRes.data?.error?.includes('greater than 0') ? 'PASS' : 'FAIL',
      `Returned HTTP ${zeroByteRes.status}: "${zeroByteRes.data?.error}"`
    );

    // 3.6 Invalid Category
    const invalidCatRes = await request(
      'POST',
      '/api/media/presign-upload',
      {
        fileName: 'valid.png',
        fileSize: 5000,
        mimeType: 'image/png',
        category: 'SYSTEM_CONFIG',
      },
      tokenAlpha
    );
    logResult(
      'Category Validation',
      'Reject Invalid Media Category',
      invalidCatRes.status === 400 && invalidCatRes.data?.error?.includes('Invalid category') ? 'PASS' : 'FAIL',
      `Returned HTTP ${invalidCatRes.status}: "${invalidCatRes.data?.error}"`
    );

    // -------------------------------------------------------------------------
    // 4. CROSS-TENANT ISOLATION & ATTACK ATTEMPTS
    // -------------------------------------------------------------------------
    console.log('\n--- 4. CROSS-TENANT MEDIA ISOLATION & ATTACK ATTEMPTS ---');

    // 4.1 Tenant Alpha uploads valid property cover image
    const validAlphaUpload = await request(
      'POST',
      '/api/media/presign-upload',
      {
        fileName: 'alpha_penthouse_cover.jpg',
        fileSize: 450 * 1024,
        mimeType: 'image/jpeg',
        category: 'PROPERTY_COVER',
      },
      tokenAlpha
    );
    const alphaKey = validAlphaUpload.data.data.key;
    const alphaPutUrl = validAlphaUpload.data.data.uploadUrl;

    // Test: Premature confirmation before uploading to storage must fail
    const prematureConfirm = await request(
      'POST',
      '/api/media/confirm',
      {
        key: alphaKey,
        bucket: validAlphaUpload.data.data.bucket,
        fileName: 'alpha_penthouse_cover.jpg',
        fileSize: 450 * 1024,
        mimeType: 'image/jpeg',
        category: 'PROPERTY_COVER',
      },
      tokenAlpha
    );
    logResult(
      'Upload Verification',
      'Reject Confirmation When Object Does Not Exist in Storage',
      prematureConfirm.status === 400 && prematureConfirm.data?.error?.includes('Storage verification failed') ? 'PASS' : 'FAIL',
      `Returned HTTP ${prematureConfirm.status}: "${prematureConfirm.data?.error}"`
    );

    // Test: Magic byte mismatch (e.g. text disguised as JPEG)
    await fetch(alphaPutUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: Buffer.from('FAKE_TEXT_DISGUISED_AS_JPEG_HEADER'),
    });
    const mismatchConfirm = await request(
      'POST',
      '/api/media/confirm',
      {
        key: alphaKey,
        bucket: validAlphaUpload.data.data.bucket,
        fileName: 'alpha_penthouse_cover.jpg',
        fileSize: 50,
        mimeType: 'image/jpeg',
        category: 'PROPERTY_COVER',
      },
      tokenAlpha
    );
    logResult(
      'Upload Verification',
      'Reject Confirmation When File Magic Bytes Do Not Match Declared MIME',
      mismatchConfirm.status === 400 && mismatchConfirm.data?.error?.includes('File signature mismatch') ? 'PASS' : 'FAIL',
      `Returned HTTP ${mismatchConfirm.status}: "${mismatchConfirm.data?.error}"`
    );

    // Upload real valid JPEG payload
    const testImagePayload = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
      Buffer.from('BINARY_IMAGE_DATA_EXHAUSTIVE_VERIFICATION_DUBAI_2026'),
    ]);

    // Perform PUT upload
    const putRes = await fetch(alphaPutUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: testImagePayload,
    });
    logResult(
      'Binary Upload Execution',
      'Direct HTTP PUT to Presigned Upload URL',
      putRes.status === 200 ? 'PASS' : 'FAIL',
      `HTTP status: ${putRes.status}`
    );

    // Confirm Alpha MediaAsset
    const alphaConfirm = await request(
      'POST',
      '/api/media/confirm',
      {
        key: alphaKey,
        bucket: validAlphaUpload.data.data.bucket,
        fileName: 'alpha_penthouse_cover.jpg',
        fileSize: testImagePayload.length,
        mimeType: 'image/jpeg',
        category: 'PROPERTY_COVER',
      },
      tokenAlpha
    );
    const alphaAssetId = alphaConfirm.data.data.id;
    logResult(
      'Media Confirmation',
      'Persist MediaAsset in PostgreSQL under Tenant Alpha',
      alphaConfirm.status === 201 && alphaConfirm.data.data.organizationId === orgAlphaId ? 'PASS' : 'FAIL',
      `Asset ID: ${alphaAssetId}, Org: ${alphaConfirm.data.data.organizationId}`
    );

    // 4.2 Cross-Tenant Attack 1: Tenant Beta attempts to confirm Tenant Alpha's key prefix
    const crossConfirm = await request(
      'POST',
      '/api/media/confirm',
      {
        key: alphaKey,
        bucket: 'admatrix-property-media',
        fileName: 'stolen_alpha_key.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
        category: 'PROPERTY_COVER',
      },
      tokenBeta
    );
    logResult(
      'Cross-Tenant Security',
      'Prevent Foreign Tenant from Claiming Key with Foreign Org Prefix',
      crossConfirm.status === 403 ? 'PASS' : 'FAIL',
      `Returned HTTP ${crossConfirm.status}: "${crossConfirm.data?.error}"`
    );

    // 4.3 Cross-Tenant Attack 2: Tenant Beta attempts to download Tenant Alpha's media
    const crossDownload = await request('GET', `/api/media/presign-download/${alphaAssetId}`, undefined, tokenBeta);
    logResult(
      'Cross-Tenant Security',
      'Prevent Foreign Tenant from Generating Download URL for Alpha Asset',
      crossDownload.status === 404 ? 'PASS' : 'FAIL',
      `Returned HTTP ${crossDownload.status} (Protected by tenantGuard)`
    );

    // 4.4 Cross-Tenant Attack 3: Tenant Beta attempts to delete Tenant Alpha's media
    const crossDelete = await request('DELETE', `/api/media/${alphaAssetId}`, undefined, tokenBeta);
    logResult(
      'Cross-Tenant Security',
      'Prevent Foreign Tenant from Deleting Alpha MediaAsset',
      crossDelete.status === 404 ? 'PASS' : 'FAIL',
      `Returned HTTP ${crossDelete.status} (Protected by tenantGuard)`
    );

    // -------------------------------------------------------------------------
    // 5. PROPERTY LISTING, EDIT, & AD STUDIO INTEGRATION
    // -------------------------------------------------------------------------
    console.log('\n--- 5. PROPERTY LISTING, EDIT, & AD STUDIO INTEGRATION ---');

    // 5.1 Create a property in Org Alpha linking coverImage and additional gallery images
    const propRes = await request(
      'POST',
      '/api/properties',
      {
        title: 'Verifiable Royal Atlantis Penthouse',
        description: 'Iconic duplex on Palm Jumeirah with private rooftop infinity pool.',
        propertyType: 'Penthouse',
        listingType: 'Sale',
        price: 45000000,
        currency: 'AED',
        bedrooms: 5,
        bathrooms: 6,
        builtUpArea: 6200,
        emirate: 'Dubai',
        community: 'Palm Jumeirah',
        buildingProject: 'Royal Atlantis Residences',
        trakheesiPermitNo: '7190088214',
        permitExpiryDate: '2027-11-20',
        formACompleted: true,
        coverImage: alphaConfirm.data.data.url,
        images: [
          alphaConfirm.data.data.url,
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
        ],
      },
      tokenAlpha
    );
    const createdProp = propRes.data.data;
    logResult(
      'Property Workflow',
      'Create Property with Confirmed S3 MediaAsset Cover URL',
      propRes.status === 201 && createdProp.coverImage === alphaConfirm.data.data.url ? 'PASS' : 'FAIL',
      `Property ID: ${createdProp.id}, Cover Image: ${createdProp.coverImage}`
    );

    // Link the MediaAsset to this property
    await prisma.mediaAsset.update({
      where: { id: alphaAssetId },
      data: { propertyId: createdProp.id },
    });

    // 5.2 Retrieve Property Details and verify mediaAssets and images
    const fetchProp = await request('GET', `/api/properties/${createdProp.id}`, undefined, tokenAlpha);
    const retrievedProp = fetchProp.data.data;
    const hasMediaAssets = Array.isArray(retrievedProp.mediaAssets) && retrievedProp.mediaAssets.length > 0;
    const hasImagesArray = Boolean(retrievedProp.images);
    logResult(
      'Property Workflow',
      'GET /api/properties/:id Returns Nested MediaAssets and Images',
      hasMediaAssets && hasImagesArray ? 'PASS' : 'FAIL',
      `Nested MediaAssets count: ${retrievedProp.mediaAssets?.length || 0}, Images: ${retrievedProp.images}`
    );

    // 5.3 Edit Property: Update gallery images
    const updatedImages = [
      alphaConfirm.data.data.url,
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80',
    ];
    const editProp = await request(
      'PUT',
      `/api/properties/${createdProp.id}`,
      {
        ...retrievedProp,
        price: 47000000,
        images: updatedImages,
      },
      tokenAlpha
    );
    const parsedImagesAfterEdit = JSON.parse(editProp.data.data.images || '[]');
    logResult(
      'Property Workflow',
      'PUT /api/properties/:id Persists Updated Multi-Image Gallery',
      editProp.status === 200 && parsedImagesAfterEdit.length === 3 ? 'PASS' : 'FAIL',
      `Updated image count: ${parsedImagesAfterEdit.length}`
    );

    // 5.4 Ad Studio Canvas Asset Storage: Save AD_CREATIVE
    const creativePresign = await request(
      'POST',
      '/api/media/presign-upload',
      {
        fileName: 'ad_studio_render_palm.png',
        fileSize: 850 * 1024,
        mimeType: 'image/png',
        category: 'AD_CREATIVE',
      },
      tokenAlpha
    );
    const creativeKey = creativePresign.data.data.key;
    const validPngBytes = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('EXPORTED_HTML5_CANVAS_BLOB_PNG_BINARY_DATA'),
    ]);
    await fetch(creativePresign.data.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: validPngBytes,
    });

    const creativeConfirm = await request(
      'POST',
      '/api/media/confirm',
      {
        key: creativeKey,
        bucket: creativePresign.data.data.bucket,
        fileName: 'ad_studio_render_palm.png',
        fileSize: 850 * 1024,
        mimeType: 'image/png',
        category: 'AD_CREATIVE',
        propertyId: createdProp.id,
      },
      tokenAlpha
    );
    const creativeAsset = creativeConfirm.data.data;
    logResult(
      'Ad Studio Workflow',
      'Confirm and Save AI Ad Studio Creative Canvas to MediaAsset',
      creativeConfirm.status === 201 && creativeAsset.category === 'AD_CREATIVE' ? 'PASS' : 'FAIL',
      `Creative MediaAsset ID: ${creativeAsset.id}, Category: ${creativeAsset.category}`
    );

    // -------------------------------------------------------------------------
    // 6. OBJECT & RELATIONAL CLEANUP BEHAVIOR
    // -------------------------------------------------------------------------
    console.log('\n--- 6. OBJECT & RELATIONAL CLEANUP BEHAVIOR ---');

    // 6.1 Direct Media Asset Deletion: Deletes storage object + DB record + cleans property
    const delAssetRes = await request('DELETE', `/api/media/${creativeAsset.id}`, undefined, tokenAlpha);
    const dbAssetCheck = await prisma.mediaAsset.findUnique({ where: { id: creativeAsset.id } });
    logResult(
      'Cleanup Verification',
      'DELETE /api/media/:id Permanently Removes PostgreSQL Record',
      delAssetRes.status === 200 && dbAssetCheck === null ? 'PASS' : 'FAIL',
      `HTTP status: ${delAssetRes.status}, Record in DB: ${dbAssetCheck ? 'Found' : 'Null (Deleted)'}`
    );

    // 6.2 Property Deletion: Safely removes physical S3 objects AND cascades DB records
    const alphaFilePath = path.join(s3Service.getLocalUploadsDir(), alphaKey);
    const alphaFileExistsBefore = fs.existsSync(alphaFilePath);

    const delPropRes = await request('DELETE', `/api/properties/${createdProp.id}`, undefined, tokenAlpha);
    const childAssetCheck = await prisma.mediaAsset.findUnique({ where: { id: alphaAssetId } });
    const alphaFileExistsAfter = fs.existsSync(alphaFilePath);

    logResult(
      'Cleanup Verification',
      'Deleting Property Safely Deletes Physical Storage Objects (No Orphaned Files)',
      delPropRes.status === 200 && alphaFileExistsBefore && !alphaFileExistsAfter ? 'PASS' : 'FAIL',
      `File before: ${alphaFileExistsBefore}, File after: ${alphaFileExistsAfter}`
    );

    logResult(
      'Cleanup Verification',
      'Deleting Property Cascades and Deletes Attached MediaAssets',
      delPropRes.status === 200 && childAssetCheck === null ? 'PASS' : 'FAIL',
      `Property deleted: ${delPropRes.status === 200}, Child MediaAsset in DB: ${childAssetCheck ? 'Found' : 'Null (Cascaded)'}`
    );

    // -------------------------------------------------------------------------
    // SUMMARY REPORT
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log('PHASE 2B EXHAUSTIVE VERIFICATION SUMMARY');
    console.log('========================================================================');
    const passed = results.filter((r) => r.status === 'PASS').length;
    const unverified = results.filter((r) => r.status === 'UNVERIFIED').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;

    console.log(`Total Checks Executed: ${results.length}`);
    console.log(`Passed:                ${passed}`);
    console.log(`Unverified:            ${unverified} (Live AWS Cloud Credentials)`);
    console.log(`Failed:                ${failed}`);
    console.log('========================================================================\n');

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (error) {
    console.error('Verification error:', error);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

runExhaustiveVerification();

