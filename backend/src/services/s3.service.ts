import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

export interface PresignedUploadResult {
  uploadUrl: string;
  downloadUrl: string;
  key: string;
  bucket: string;
  expiresIn: number;
}

export interface PresignedDownloadResult {
  downloadUrl: string;
  expiresIn: number;
}

export interface ObjectVerificationResult {
  valid: boolean;
  actualSize?: number;
  detectedMimeType?: string;
  error?: string;
}

// Media constraints
export const ALLOWED_MIME_TYPES: Record<string, number> = {
  'image/jpeg': 10 * 1024 * 1024, // 10MB
  'image/jpg': 10 * 1024 * 1024,  // 10MB
  'image/png': 10 * 1024 * 1024,  // 10MB
  'image/webp': 10 * 1024 * 1024, // 10MB
  'application/pdf': 20 * 1024 * 1024, // 20MB for compliance docs
};

export const ALLOWED_CATEGORIES = [
  'PROPERTY_COVER',
  'PROPERTY_IMAGE',
  'AD_CREATIVE',
  'COMPLIANCE_DOC',
] as const;

export type MediaCategory = typeof ALLOWED_CATEGORIES[number];

export class S3Service {
  private s3Client: S3Client | null = null;
  private bucket: string;
  private region: string;
  private driver: 's3' | 'local';
  private localUploadsDir: string;
  private hmacSecret: string;
  private baseUrl: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'me-central-1';
    this.bucket = process.env.AWS_S3_BUCKET || 'admatrix-property-media';
    this.baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    this.hmacSecret = process.env.JWT_ACCESS_SECRET || 'admatrix_media_local_hmac_secret_2026';
    this.localUploadsDir = path.resolve(process.cwd(), 'uploads');

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    // Use AWS S3 if valid cloud credentials are provided and not placeholders
    if (accessKeyId && secretAccessKey && accessKeyId !== 'local' && accessKeyId !== 'test') {
      this.driver = 's3';
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        endpoint: process.env.AWS_S3_ENDPOINT || undefined,
        forcePathStyle: !!process.env.AWS_S3_ENDPOINT,
      });
      console.log(`[S3Service] Configured with AWS S3 Cloud Driver (Bucket: ${this.bucket}, Region: ${this.region})`);
    } else {
      this.driver = 'local';
      if (!fs.existsSync(this.localUploadsDir)) {
        fs.mkdirSync(this.localUploadsDir, { recursive: true });
      }
      console.log(`[S3Service] Configured with Local Storage Emulator (Uploads dir: ${this.localUploadsDir})`);
    }
  }

  public getBucket(): string {
    return this.bucket;
  }

  public getDriver(): 's3' | 'local' {
    return this.driver;
  }

  public isLocal(): boolean {
    return this.driver === 'local';
  }

  public getLocalUploadsDir(): string {
    return this.localUploadsDir;
  }

  /**
   * Validate MIME type and file size against platform constraints
   */
  public validateMedia(mimeType: string, fileSize: number): { valid: boolean; error?: string } {
    const maxLimit = ALLOWED_MIME_TYPES[mimeType.toLowerCase()];
    if (!maxLimit) {
      return {
        valid: false,
        error: `Unsupported file type: ${mimeType}. Allowed formats: JPEG, PNG, WebP, PDF.`,
      };
    }

    if (fileSize <= 0) {
      return {
        valid: false,
        error: 'File size must be greater than 0 bytes.',
      };
    }

    if (fileSize > maxLimit) {
      const maxMb = Math.round(maxLimit / (1024 * 1024));
      return {
        valid: false,
        error: `File size exceeds the ${maxMb}MB limit for ${mimeType}.`,
      };
    }

    return { valid: true };
  }

  /**
   * Detect binary file type from header magic bytes
   */
  public detectMimeFromBytes(headerBytes: Buffer): string | null {
    if (headerBytes.length < 4) return null;

    // JPEG: FF D8 FF
    if (headerBytes[0] === 0xff && headerBytes[1] === 0xd8 && headerBytes[2] === 0xff) {
      return 'image/jpeg';
    }

    // PNG: 89 50 4E 47
    if (
      headerBytes[0] === 0x89 &&
      headerBytes[1] === 0x50 &&
      headerBytes[2] === 0x4e &&
      headerBytes[3] === 0x47
    ) {
      return 'image/png';
    }

    // WebP: RIFF ... WEBP
    if (
      headerBytes.length >= 12 &&
      headerBytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      headerBytes.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return 'image/webp';
    }

    // PDF: %PDF (25 50 44 46)
    if (headerBytes.subarray(0, 4).toString('ascii') === '%PDF') {
      return 'application/pdf';
    }

    return null;
  }

  /**
   * Verify actual uploaded file existence, byte size, and header magic bytes in storage
   */
  public async verifyObjectUpload(
    key: string,
    expectedMimeType?: string
  ): Promise<ObjectVerificationResult> {
    try {
      if (this.driver === 'local' || !this.s3Client) {
        const filePath = path.join(this.localUploadsDir, key);
        if (!fs.existsSync(filePath)) {
          return { valid: false, error: 'Uploaded object not found in storage destination.' };
        }

        const stat = fs.statSync(filePath);
        if (stat.size === 0) {
          return { valid: false, error: 'Uploaded file is 0 bytes (empty payload).' };
        }

        // Read first 32 bytes for magic number verification
        const fd = fs.openSync(filePath, 'r');
        const headerBuf = Buffer.alloc(32);
        const bytesRead = fs.readSync(fd, headerBuf, 0, 32, 0);
        fs.closeSync(fd);

        const detectedMime = this.detectMimeFromBytes(headerBuf.subarray(0, bytesRead));

        if (expectedMimeType) {
          const normalizedExpected = expectedMimeType.toLowerCase() === 'image/jpg' ? 'image/jpeg' : expectedMimeType.toLowerCase();
          if (detectedMime !== normalizedExpected) {
            return {
              valid: false,
              actualSize: stat.size,
              detectedMimeType: detectedMime || 'unknown',
              error: `File signature mismatch. Expected ${expectedMimeType}, but binary magic bytes indicate ${detectedMime || 'unrecognized binary format'}.`,
            };
          }
        }

        return {
          valid: true,
          actualSize: stat.size,
          detectedMimeType: detectedMime || expectedMimeType,
        };
      }

      // AWS S3 Cloud Verification
      const headCmd = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const headRes = await this.s3Client.send(headCmd);

      if (!headRes.ContentLength || headRes.ContentLength === 0) {
        return { valid: false, error: 'S3 object exists but ContentLength is 0.' };
      }

      // Read initial 32 bytes to verify magic signature
      let detectedMime: string | null = null;
      try {
        const getCmd = new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Range: 'bytes=0-31',
        });
        const getRes = await this.s3Client.send(getCmd);
        if (getRes.Body) {
          const chunks: Uint8Array[] = [];
          for await (const chunk of getRes.Body as any) {
            chunks.push(chunk);
          }
          const headerBuf = Buffer.concat(chunks);
          detectedMime = this.detectMimeFromBytes(headerBuf);
        }
      } catch (rangeErr) {
        // Fallback to ContentType from HeadObject if range request fails
        detectedMime = headRes.ContentType || null;
      }

      if (expectedMimeType) {
        const normalizedExpected = expectedMimeType.toLowerCase() === 'image/jpg' ? 'image/jpeg' : expectedMimeType.toLowerCase();
        if (detectedMime !== normalizedExpected) {
          return {
            valid: false,
            actualSize: headRes.ContentLength,
            detectedMimeType: detectedMime || 'unknown',
            error: `File signature mismatch. Declared ${expectedMimeType}, but S3 object header indicates ${detectedMime || 'unrecognized binary format'}.`,
          };
        }
      }

      return {
        valid: true,
        actualSize: headRes.ContentLength,
        detectedMimeType: detectedMime || headRes.ContentType || expectedMimeType,
      };
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return { valid: false, error: 'Object not found in S3 bucket. Ensure upload was completed before confirmation.' };
      }
      return { valid: false, error: `Storage verification failed: ${err.message}` };
    }
  }

  /**
   * Generate tenant-partitioned object key
   * Format: organizations/{organizationId}/{category.toLowerCase()}/{timestamp}-{randomHex}-{sanitizedFileName}
   */
  public generateKey(organizationId: string, category: MediaCategory, originalFileName: string): string {
    const sanitizedName = originalFileName
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/-+/g, '-');
    const timestamp = Date.now();
    const randomHex = crypto.randomBytes(6).toString('hex');
    const folder = category.toLowerCase().replace(/_/g, '-');

    return `organizations/${organizationId}/${folder}/${timestamp}-${randomHex}-${sanitizedName}`;
  }

  /**
   * Sign a local storage URL with HMAC for local emulation
   */
  public signLocalToken(key: string, action: 'put' | 'get', expiresAt: number): string {
    const data = `${action}:${key}:${expiresAt}`;
    return crypto.createHmac('sha256', this.hmacSecret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature for local storage emulator requests
   */
  public verifyLocalToken(key: string, action: 'put' | 'get', expiresAt: number, token: string): boolean {
    if (Date.now() > expiresAt) {
      return false;
    }
    const expected = this.signLocalToken(key, action, expiresAt);
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  }

  /**
   * Generate Presigned PUT upload URL and corresponding GET download URL
   */
  public async getPresignedUploadUrl(
    key: string,
    mimeType: string,
    expiresInSeconds: number = 900 // 15 minutes
  ): Promise<PresignedUploadResult> {
    if (this.driver === 'local' || !this.s3Client) {
      const expiresAt = Date.now() + expiresInSeconds * 1000;
      const putToken = this.signLocalToken(key, 'put', expiresAt);
      const getToken = this.signLocalToken(key, 'get', expiresAt);

      const uploadUrl = `${this.baseUrl}/api/media/storage/${encodeURIComponent(key)}?action=put&token=${putToken}&expires=${expiresAt}`;
      const downloadUrl = `${this.baseUrl}/api/media/storage/${encodeURIComponent(key)}?action=get&token=${getToken}&expires=${expiresAt}`;

      return {
        uploadUrl,
        downloadUrl,
        key,
        bucket: this.bucket,
        expiresIn: expiresInSeconds,
      };
    }

    // AWS S3 Presigned URL
    const putCommand = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });

    const getCommand = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const [uploadUrl, downloadUrl] = await Promise.all([
      getSignedUrl(this.s3Client, putCommand, { expiresIn: expiresInSeconds }),
      getSignedUrl(this.s3Client, getCommand, { expiresIn: expiresInSeconds }),
    ]);

    return {
      uploadUrl,
      downloadUrl,
      key,
      bucket: this.bucket,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Generate Presigned GET download URL for an existing object
   */
  public async getPresignedDownloadUrl(
    key: string,
    expiresInSeconds: number = 900
  ): Promise<PresignedDownloadResult> {
    if (this.driver === 'local' || !this.s3Client) {
      const expiresAt = Date.now() + expiresInSeconds * 1000;
      const getToken = this.signLocalToken(key, 'get', expiresAt);
      const downloadUrl = `${this.baseUrl}/api/media/storage/${encodeURIComponent(key)}?action=get&token=${getToken}&expires=${expiresAt}`;
      return { downloadUrl, expiresIn: expiresInSeconds };
    }

    const getCommand = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const downloadUrl = await getSignedUrl(this.s3Client, getCommand, { expiresIn: expiresInSeconds });
    return { downloadUrl, expiresIn: expiresInSeconds };
  }

  /**
   * Delete an object from S3 or local storage
   */
  public async deleteObject(key: string): Promise<boolean> {
    if (this.driver === 'local' || !this.s3Client) {
      const localFilePath = path.join(this.localUploadsDir, key);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
      return true;
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
    return true;
  }

  /**
   * Safe deletion with exponential backoff retries to prevent orphaned storage objects
   */
  public async deleteObjectWithRetry(key: string, maxRetries: number = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.deleteObject(key);
        return true;
      } catch (err: any) {
        console.warn(`[S3Service] Delete attempt ${attempt}/${maxRetries} failed for ${key}: ${err.message}`);
        if (attempt === maxRetries) {
          console.error(`[S3Service] Critical: Failed to delete storage object ${key} after ${maxRetries} attempts.`);
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 100));
      }
    }
    return false;
  }
}

export const s3Service = new S3Service();
