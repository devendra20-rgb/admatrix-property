'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, X, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadMediaFile, validateUploadFile, MediaAsset } from '@/lib/media-upload';

interface ImageUploadProps {
  label?: string;
  category: 'PROPERTY_COVER' | 'PROPERTY_IMAGE' | 'AD_CREATIVE' | 'COMPLIANCE_DOC';
  propertyId?: string;
  multiple?: boolean;
  maxFiles?: number;
  initialUrls?: string[];
  onUploadSuccess: (urls: string[], assets: MediaAsset[]) => void;
  onRemove?: (url: string) => void;
}

interface UploadingFileState {
  id: string;
  name: string;
  progress: number;
  error?: string;
  previewUrl?: string;
}

export function ImageUpload({
  label = 'Upload Media',
  category,
  propertyId,
  multiple = false,
  maxFiles = 10,
  initialUrls = [],
  onUploadSuccess,
  onRemove,
}: ImageUploadProps) {
  const [activeUploads, setActiveUploads] = useState<UploadingFileState[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(initialUrls);
  const [uploadedAssets, setUploadedAssets] = useState<MediaAsset[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setGlobalError(null);

    const fileArray = Array.from(files);

    if (!multiple && fileArray.length > 1) {
      setGlobalError('Please select only a single cover photo.');
      return;
    }

    if (multiple && uploadedUrls.length + fileArray.length > maxFiles) {
      setGlobalError(`You can upload a maximum of ${maxFiles} images.`);
      return;
    }

    for (const file of fileArray) {
      const validation = validateUploadFile(file);
      if (!validation.valid) {
        setGlobalError(`${file.name}: ${validation.error}`);
        return;
      }
    }

    // Process files
    const newUploadStates: UploadingFileState[] = fileArray.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      progress: 0,
      previewUrl: URL.createObjectURL(file),
    }));

    setActiveUploads((prev) => [...prev, ...newUploadStates]);

    const successfullyUploaded: MediaAsset[] = [];
    const newUrls: string[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const uploadState = newUploadStates[i];

      try {
        const asset = await uploadMediaFile(file, category, {
          propertyId,
          onProgress: (percent) => {
            setActiveUploads((prev) =>
              prev.map((item) =>
                item.id === uploadState.id ? { ...item, progress: percent } : item
              )
            );
          },
        });

        successfullyUploaded.push(asset);
        newUrls.push(asset.url);

        // Remove from active uploads after brief success state
        setTimeout(() => {
          setActiveUploads((prev) => prev.filter((item) => item.id !== uploadState.id));
        }, 800);
      } catch (err: any) {
        console.error('File upload error:', err);
        setActiveUploads((prev) =>
          prev.map((item) =>
            item.id === uploadState.id
              ? { ...item, error: err.message || 'Upload failed' }
              : item
          )
        );
      }
    }

    if (newUrls.length > 0) {
      const updatedUrls = multiple ? [...uploadedUrls, ...newUrls] : newUrls;
      const updatedAssets = multiple ? [...uploadedAssets, ...successfullyUploaded] : successfullyUploaded;
      setUploadedUrls(updatedUrls);
      setUploadedAssets(updatedAssets);
      onUploadSuccess(updatedUrls, updatedAssets);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (url: string) => {
    const updated = uploadedUrls.filter((u) => u !== url);
    setUploadedUrls(updated);
    if (onRemove) onRemove(url);
    onUploadSuccess(updated, uploadedAssets.filter((a) => a.url !== url));
  };

  return (
    <div className="space-y-3">
      {label && <label className="text-xs font-medium text-[#151923] block">{label}</label>}

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-[#635BFF] bg-[#F0EFFF]'
            : 'border-[#E8EAF0] hover:border-[#635BFF] bg-[#F7F8FA] hover:bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-[#E8EAF0] flex items-center justify-center text-[#635BFF]">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#151923]">
              Click to upload or drag & drop
            </p>
            <p className="text-[11px] text-[#737B8C] mt-0.5">
              JPEG, PNG, WebP up to 10MB {multiple ? `(Max ${maxFiles} images)` : '(Single cover photo)'}
            </p>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {globalError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Active Uploads with Progress Bars */}
      {activeUploads.length > 0 && (
        <div className="space-y-2">
          {activeUploads.map((upload) => (
            <div
              key={upload.id}
              className="p-3 bg-white border border-[#E8EAF0] rounded-xl flex items-center gap-3 shadow-sm"
            >
              {upload.previewUrl ? (
                <img
                  src={upload.previewUrl}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover border border-[#E8EAF0]"
                />
              ) : (
                <ImageIcon className="w-5 h-5 text-[#737B8C]" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-[#151923] truncate">{upload.name}</span>
                  <span className="font-semibold text-[#635BFF]">
                    {upload.error ? 'Failed' : upload.progress === 100 ? 'Complete' : `${upload.progress}%`}
                  </span>
                </div>

                {upload.error ? (
                  <p className="text-[11px] text-red-600">{upload.error}</p>
                ) : (
                  <div className="w-full bg-[#E8EAF0] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#635BFF] h-full transition-all duration-200"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {upload.progress === 100 && !upload.error && (
                <CheckCircle2 className="w-4 h-4 text-[#16A36A] shrink-0" />
              )}
              {upload.progress < 100 && !upload.error && (
                <Loader2 className="w-4 h-4 text-[#635BFF] animate-spin shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Previews */}
      {uploadedUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
          {uploadedUrls.map((url, idx) => (
            <div
              key={url + idx}
              className="relative group rounded-xl overflow-hidden border border-[#E8EAF0] bg-slate-100 aspect-video shadow-sm"
            >
              <img src={url} alt={`Uploaded ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 hover:bg-black text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {idx === 0 && !multiple && (
                <span className="absolute bottom-1.5 left-1.5 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur font-medium">
                  Cover Photo
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

