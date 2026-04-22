import { mediaRepository } from './media.repository.js';
import { transcodeService } from './transcode.service.js';
import { artistRepository } from '../artist/artist.repository.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../../config/index.js';
import crypto from 'crypto';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_MEDIA_PER_ARTIST = 20;

// Supabase Storage uses S3-compatible API
// In dev: LocalStack on localhost:4566
// In prod: Supabase Storage S3 endpoint
const s3 = new S3Client({
  region: config.STORAGE_REGION,
  ...(config.NODE_ENV === 'development'
    ? {
        endpoint: 'http://localhost:4566',
        forcePathStyle: true,
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      }
    : {
        endpoint: config.STORAGE_ENDPOINT,
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.STORAGE_ACCESS_KEY,
          secretAccessKey: config.STORAGE_SECRET_KEY,
        },
      }),
});

export class MediaService {
  async requestUploadUrl(userId: string, data: { content_type: string; file_size_bytes: number }) {
    const artist = await artistRepository.findByUserId(userId);
    if (!artist) {
      throw new MediaError('PROFILE_NOT_FOUND', 'Artist profile not found', 404);
    }

    if (!ALLOWED_TYPES[data.content_type]) {
      throw new MediaError('INVALID_TYPE', `Content type ${data.content_type} not allowed`, 400);
    }

    if (data.file_size_bytes > MAX_FILE_SIZE) {
      throw new MediaError('FILE_TOO_LARGE', 'Maximum file size is 500MB', 400);
    }

    const count = await mediaRepository.countByArtist(artist.id);
    if (count >= MAX_MEDIA_PER_ARTIST) {
      throw new MediaError('LIMIT_REACHED', `Maximum ${MAX_MEDIA_PER_ARTIST} media items allowed`, 400);
    }

    const ext = ALLOWED_TYPES[data.content_type];
    const key = `artists/${artist.id}/media/${crypto.randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: config.S3_BUCKET_MEDIA,
      Key: key,
      ContentType: data.content_type,
      ContentLength: data.file_size_bytes,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 min

    return {
      upload_url: uploadUrl,
      s3_key: key,
      expires_in_seconds: 900,
    };
  }

  async confirmUpload(userId: string, data: { s3_key: string; media_type: 'image' | 'video'; content_type: string; file_size_bytes: number }) {
    const artist = await artistRepository.findByUserId(userId);
    if (!artist) {
      throw new MediaError('PROFILE_NOT_FOUND', 'Artist profile not found', 404);
    }

    // Verify s3_key belongs to this artist
    if (!data.s3_key.startsWith(`artists/${artist.id}/`)) {
      throw new MediaError('UNAUTHORIZED', 'S3 key does not belong to this artist', 403);
    }

    const count = await mediaRepository.countByArtist(artist.id);

    const item = await mediaRepository.create({
      artist_id: artist.id,
      media_type: data.media_type,
      original_url: `${config.CDN_BASE_URL}/${data.s3_key}`,
      s3_key: data.s3_key,
      file_size_bytes: data.file_size_bytes,
      content_type: data.content_type,
      sort_order: count,
    });

    // Fire-and-forget transcode. Never block upload confirmation on it — a
    // failed transcode leaves the row in 'failed' state for manual retrigger.
    transcodeService.transcodeMediaItem(item.id).catch(() => {});

    return item;
  }

  async retriggerTranscode(userId: string, mediaId: string) {
    const artist = await artistRepository.findByUserId(userId);
    if (!artist) {
      throw new MediaError('PROFILE_NOT_FOUND', 'Artist profile not found', 404);
    }
    const item = await mediaRepository.findById(mediaId);
    if (!item || item.artist_id !== artist.id) {
      throw new MediaError('NOT_FOUND', 'Media item not found', 404);
    }
    return transcodeService.transcodeMediaItem(mediaId);
  }

  async deleteMedia(userId: string, mediaId: string) {
    const artist = await artistRepository.findByUserId(userId);
    if (!artist) {
      throw new MediaError('PROFILE_NOT_FOUND', 'Artist profile not found', 404);
    }

    const item = await mediaRepository.findById(mediaId);
    if (!item || item.artist_id !== artist.id) {
      throw new MediaError('NOT_FOUND', 'Media item not found', 404);
    }

    return mediaRepository.softDelete(mediaId);
  }

  async reorderMedia(userId: string, itemIds: string[]) {
    const artist = await artistRepository.findByUserId(userId);
    if (!artist) {
      throw new MediaError('PROFILE_NOT_FOUND', 'Artist profile not found', 404);
    }

    await mediaRepository.reorder(artist.id, itemIds);
    return mediaRepository.findByArtistId(artist.id);
  }

  async getArtistMedia(artistId: string) {
    return mediaRepository.findByArtistId(artistId);
  }
}

export class MediaError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'MediaError';
  }
}

export const mediaService = new MediaService();
