import { apiClient, ApiError } from './api-client';

export interface MediaAsset {
  id: string;
  key: string;
  bucket: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  url: string;
  propertyId?: string | null;
  creativeId?: string | null;
  createdAt: string;
}

export interface UploadOptions {
  propertyId?: string;
  creativeId?: string;
  onProgress?: (percent: number) => void;
}

const ALLOWED_MIME_TYPES: Record<string, number> = {
  'image/jpeg': 10 * 1024 * 1024,
  'image/jpg': 10 * 1024 * 1024,
  'image/png': 10 * 1024 * 1024,
  'image/webp': 10 * 1024 * 1024,
  'application/pdf': 20 * 1024 * 1024,
};

/**
 * Validates a file before upload
 */
export function validateUploadFile(file: File): { valid: boolean; error?: string } {
  const maxLimit = ALLOWED_MIME_TYPES[file.type.toLowerCase()];
  if (!maxLimit) {
    return {
      valid: false,
      error: `Unsupported file format (${file.type || 'unknown'}). Allowed: JPEG, PNG, WebP, PDF.`,
    };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'File is empty.' };
  }

  if (file.size > maxLimit) {
    const maxMb = Math.round(maxLimit / (1024 * 1024));
    return { valid: false, error: `File size exceeds the ${maxMb}MB limit.` };
  }

  return { valid: true };
}

/**
 * Uploads a file using AWS S3 presigned PUT URL with progress tracking
 * and registers the confirmed MediaAsset in PostgreSQL.
 */
export async function uploadMediaFile(
  file: File,
  category: 'PROPERTY_COVER' | 'PROPERTY_IMAGE' | 'AD_CREATIVE' | 'COMPLIANCE_DOC',
  options?: UploadOptions
): Promise<MediaAsset> {
  // 1. Client-side validation
  const validation = validateUploadFile(file);
  if (!validation.valid) {
    throw new ApiError(validation.error || 'Invalid file', 400);
  }

  // 2. Request presigned upload URL from backend
  const presignRes = await apiClient<{
    success: boolean;
    data: {
      uploadUrl: string;
      downloadUrl: string;
      key: string;
      bucket: string;
      expiresIn: number;
    };
  }>('/api/media/presign-upload', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      category,
    }),
  });

  const { uploadUrl, key, bucket } = presignRes.data;

  // 3. Direct binary PUT upload to S3 / local emulator via XMLHttpRequest for accurate progress
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);

    if (options?.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          options.onProgress!(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (options?.onProgress) options.onProgress(100);
        resolve();
      } else {
        reject(new ApiError(`Upload failed with HTTP ${xhr.status}`, xhr.status));
      }
    };

    xhr.onerror = () => {
      reject(new ApiError('Network error during file upload', 0));
    };

    xhr.send(file);
  });

  // 4. Confirm upload and persist to PostgreSQL
  const confirmRes = await apiClient<{ success: boolean; data: MediaAsset }>('/api/media/confirm', {
    method: 'POST',
    body: JSON.stringify({
      key,
      bucket,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      category,
      propertyId: options?.propertyId,
      creativeId: options?.creativeId,
    }),
  });

  return confirmRes.data;
}

/**
 * Deletes a media asset from S3 and PostgreSQL
 */
export async function deleteMediaFile(assetId: string): Promise<boolean> {
  const res = await apiClient<{ success: boolean }>(`/api/media/${assetId}`, {
    method: 'DELETE',
  });
  return res.success;
}

