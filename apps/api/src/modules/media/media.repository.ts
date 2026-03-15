import { db } from '../../infrastructure/database.js';

export interface CreateMediaItemData {
  artist_id: string;
  media_type: 'image' | 'video';
  original_url: string;
  s3_key: string;
  file_size_bytes: number;
  content_type: string;
  sort_order: number;
}

export class MediaRepository {
  async create(data: CreateMediaItemData) {
    const [item] = await db('media_items')
      .insert({
        artist_id: data.artist_id,
        media_type: data.media_type,
        original_url: data.original_url,
        s3_key: data.s3_key,
        file_size_bytes: data.file_size_bytes,
        content_type: data.content_type,
        sort_order: data.sort_order,
        transcode_status: data.media_type === 'video' ? 'pending' : 'completed',
      })
      .returning('*');
    return item;
  }

  async findByArtistId(artistId: string) {
    return db('media_items')
      .where({ artist_id: artistId, deleted_at: null })
      .orderBy('sort_order', 'asc');
  }

  async findById(id: string) {
    return db('media_items')
      .where({ id, deleted_at: null })
      .first();
  }

  async updateTranscodeStatus(id: string, status: string, urls?: Record<string, string>) {
    const updateData: Record<string, unknown> = { transcode_status: status };
    if (urls) {
      if (urls.thumbnail_url) updateData.thumbnail_url = urls.thumbnail_url;
      if (urls.preview_url) updateData.preview_url = urls.preview_url;
      if (urls.cdn_url) updateData.cdn_url = urls.cdn_url;
    }

    const [updated] = await db('media_items')
      .where({ id })
      .update(updateData)
      .returning('*');
    return updated;
  }

  async softDelete(id: string) {
    const [deleted] = await db('media_items')
      .where({ id })
      .update({ deleted_at: new Date() })
      .returning('*');
    return deleted;
  }

  async reorder(artistId: string, itemIds: string[]) {
    await db.transaction(async (trx) => {
      for (let i = 0; i < itemIds.length; i++) {
        await trx('media_items')
          .where({ id: itemIds[i], artist_id: artistId, deleted_at: null })
          .update({ sort_order: i });
      }
    });
  }

  async countByArtist(artistId: string) {
    const result = await db('media_items')
      .where({ artist_id: artistId, deleted_at: null })
      .count('id as count')
      .first();
    return Number(result?.count ?? 0);
  }
}

export const mediaRepository = new MediaRepository();
