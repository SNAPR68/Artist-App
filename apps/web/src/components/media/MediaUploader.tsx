'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { apiClient } from '../../lib/api-client';

interface MediaItem {
  id: string;
  media_type: 'image' | 'video';
  original_url: string;
  thumbnail_url?: string;
  transcode_status: string;
  sort_order: number;
}

interface MediaUploaderProps {
  media: MediaItem[];
  onUpdate: () => void;
}

export function MediaUploader({ media, onUpdate }: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      // Step 1: Get pre-signed URL
      const urlRes = await apiClient<{ upload_url: string; s3_key: string }>('/v1/media/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          content_type: file.type,
          file_size_bytes: file.size,
        }),
      });

      if (!urlRes.success) {
        alert(urlRes.errors[0]?.message ?? 'Failed to get upload URL');
        return;
      }

      // Step 2: Upload to S3
      setProgress(30);
      await fetch(urlRes.data.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      // Step 3: Confirm upload
      setProgress(80);
      const confirmRes = await apiClient('/v1/media/confirm', {
        method: 'POST',
        body: JSON.stringify({
          s3_key: urlRes.data.s3_key,
          media_type: file.type.startsWith('video/') ? 'video' : 'image',
          content_type: file.type,
          file_size_bytes: file.size,
        }),
      });

      if (confirmRes.success) {
        setProgress(100);
        onUpdate();
      }
    } catch {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this media item?')) return;

    const res = await apiClient(`/v1/media/${id}`, { method: 'DELETE' });
    if (res.success) onUpdate();
  };

  return (
    <div className="space-y-4">
      {/* Media Grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {media.map((item) => (
            <div key={item.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden">
              {item.media_type === 'image' ? (
                <Image
                  src={item.thumbnail_url ?? item.original_url}
                  alt="Media"
                  fill
                  sizes="(max-width: 768px) 33vw, 150px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-sm">
                  {item.transcode_status === 'completed' ? '▶ Video' : 'Processing...'}
                </div>
              )}
              <button
                onClick={() => handleDelete(item.id)}
                className="absolute top-1 right-1 bg-black/50 text-white w-6 h-6 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-300 hover:text-primary-500 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <span>Uploading... {progress}%</span>
          ) : (
            <span>+ Upload Photo or Video</span>
          )}
        </button>
      </div>
    </div>
  );
}
