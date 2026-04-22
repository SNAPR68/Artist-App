/**
 * Event Company OS pivot (2026-04-22) — Media transcode pipeline.
 *
 * Runs after confirmUpload stores the media_items row. Two paths:
 *   - Image: Sharp → 400px thumbnail + 1600px webp preview, reuploaded alongside original.
 *   - Video: ffmpeg (ffmpeg-static binary) → poster frame at 2s + 720p mp4 preview.
 *
 * Designed to run in-process (MVP). When usage grows, lift transcodeImage /
 * transcodeVideo into a BullMQ worker — the service surface stays identical.
 */
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../../config/index.js';
import { mediaRepository } from './media.repository.js';
import sharp from 'sharp';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';

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

async function downloadOriginal(s3Key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: config.S3_BUCKET_MEDIA, Key: s3Key }));
  const body = res.Body as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function uploadDerivative(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: config.S3_BUCKET_MEDIA,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return `${config.CDN_BASE_URL}/${key}`;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error('FFMPEG_NOT_FOUND'));
    const proc = spawn(ffmpegPath as unknown as string, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
    });
    proc.on('error', reject);
  });
}

export class TranscodeService {
  /**
   * Entry point — dispatches by media_type. Idempotent: re-running on an
   * already-completed item overwrites derivatives.
   */
  async transcodeMediaItem(mediaId: string) {
    const item = await mediaRepository.findById(mediaId);
    if (!item) return null;

    try {
      if (item.media_type === 'image') {
        return await this.transcodeImage(item);
      }
      if (item.media_type === 'video') {
        return await this.transcodeVideo(item);
      }
      return null;
    } catch (err) {
      await mediaRepository.updateTranscodeStatus(mediaId, 'failed');
      throw err;
    }
  }

  private async transcodeImage(item: any) {
    const source = await downloadOriginal(item.s3_key);
    const baseKey = item.s3_key.replace(/\.[^.]+$/, '');

    const thumbBuf = await sharp(source)
      .rotate() // respect EXIF orientation
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 78 })
      .toBuffer();

    const previewBuf = await sharp(source)
      .rotate()
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const [thumbUrl, previewUrl] = await Promise.all([
      uploadDerivative(`${baseKey}.thumb.webp`, thumbBuf, 'image/webp'),
      uploadDerivative(`${baseKey}.preview.webp`, previewBuf, 'image/webp'),
    ]);

    return mediaRepository.updateTranscodeStatus(item.id, 'completed', {
      thumbnail_url: thumbUrl,
      preview_url: previewUrl,
      cdn_url: previewUrl,
    });
  }

  private async transcodeVideo(item: any) {
    const source = await downloadOriginal(item.s3_key);
    const workdir = await mkdtemp(path.join(tmpdir(), 'grid-transcode-'));
    const inputPath = path.join(workdir, 'in' + path.extname(item.s3_key));
    const posterPath = path.join(workdir, 'poster.jpg');
    const previewPath = path.join(workdir, 'preview.mp4');

    try {
      await writeFile(inputPath, source);

      // Poster frame at 2s — fall back to frame 0 if clip is shorter.
      await runFfmpeg([
        '-y', '-ss', '2', '-i', inputPath,
        '-frames:v', '1', '-q:v', '3', posterPath,
      ]).catch(async () => {
        await runFfmpeg(['-y', '-i', inputPath, '-frames:v', '1', '-q:v', '3', posterPath]);
      });

      // 720p h.264 mp4 preview, faststart for web streaming.
      await runFfmpeg([
        '-y', '-i', inputPath,
        '-vf', 'scale=-2:720',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart',
        previewPath,
      ]);

      const posterBuf = await readFile(posterPath);
      const previewBuf = await readFile(previewPath);

      const baseKey = item.s3_key.replace(/\.[^.]+$/, '');
      const [posterUrl, previewUrl] = await Promise.all([
        uploadDerivative(`${baseKey}.poster.jpg`, posterBuf, 'image/jpeg'),
        uploadDerivative(`${baseKey}.preview.mp4`, previewBuf, 'video/mp4'),
      ]);

      return mediaRepository.updateTranscodeStatus(item.id, 'completed', {
        thumbnail_url: posterUrl,
        preview_url: previewUrl,
        cdn_url: previewUrl,
      });
    } finally {
      await rm(workdir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export const transcodeService = new TranscodeService();
