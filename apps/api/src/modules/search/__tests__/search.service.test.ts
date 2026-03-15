import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../infrastructure/database.js', () => ({
  db: vi.fn(),
}));

vi.mock('../search.index.js', () => ({
  opensearch: {
    search: vi.fn(),
  },
  ARTIST_INDEX: 'artists_v1',
}));

vi.mock('../../../infrastructure/redis.js', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

import { opensearch } from '../search.index.js';
import { redis } from '../../../infrastructure/redis.js';
import { SearchService } from '../search.service.js';

const mockOS = opensearch as unknown as { search: ReturnType<typeof vi.fn> };
const mockRedis = redis as unknown as { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    service = new SearchService();
    vi.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
  });

  it('should return cached results when available', async () => {
    const cached = { data: [{ id: '1' }], total: 1, facets: {} };
    mockRedis.get.mockResolvedValue(JSON.stringify(cached));

    const result = await service.searchArtists({ page: 1, per_page: 20 });

    expect(result).toEqual(cached);
    expect(mockOS.search).not.toHaveBeenCalled();
  });

  it('should query OpenSearch and cache result on cache miss', async () => {
    mockOS.search.mockResolvedValue({
      body: {
        hits: {
          hits: [
            { _source: { id: 'a1', stage_name: 'DJ Test' }, _score: 1.5 },
          ],
          total: { value: 1 },
        },
        aggregations: {
          genres: { buckets: [{ key: 'EDM', doc_count: 5 }] },
          cities: { buckets: [{ key: 'Mumbai', doc_count: 3 }] },
          event_types: { buckets: [] },
          price_stats: { min_price: { value: 50000 }, max_price: { value: 200000 } },
        },
      },
    });

    const result = await service.searchArtists({ page: 1, per_page: 20, q: 'DJ' });

    expect(mockOS.search).toHaveBeenCalledWith({
      index: 'artists_v1',
      body: expect.objectContaining({ query: expect.any(Object) }),
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].stage_name).toBe('DJ Test');
    expect(result.data[0]._score).toBe(1.5);
    expect(result.total).toBe(1);
    expect(result.facets.genres).toEqual([{ value: 'EDM', count: 5 }]);
    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.stringContaining('search:'),
      expect.any(String),
      'EX',
      120,
    );
  });

  it('should handle empty search results', async () => {
    mockOS.search.mockResolvedValue({
      body: {
        hits: { hits: [], total: { value: 0 } },
        aggregations: {
          genres: { buckets: [] },
          cities: { buckets: [] },
          event_types: { buckets: [] },
          price_stats: { min_price: { value: null }, max_price: { value: null } },
        },
      },
    });

    const result = await service.searchArtists({ page: 1, per_page: 20 });

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });
});
