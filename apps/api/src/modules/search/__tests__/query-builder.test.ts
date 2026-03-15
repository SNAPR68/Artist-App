import { describe, it, expect } from 'vitest';
import { buildSearchQuery } from '../query-builder.js';

describe('buildSearchQuery', () => {
  const baseParams = { page: 1, per_page: 20 };

  it('should build a match_all query with no filters', () => {
    const result = buildSearchQuery(baseParams);

    expect((result.query.bool as any).must).toEqual([{ match_all: {} }]);
    expect((result.query.bool as any).filter).toHaveLength(1); // profile_completion_pct >= 50
    expect(result.from).toBe(0);
    expect(result.size).toBe(20);
  });

  it('should add multi_match for text query', () => {
    const result = buildSearchQuery({ ...baseParams, q: 'bollywood DJ' });

    expect((result.query.bool as any).must[0]).toHaveProperty('multi_match');
    expect((result.query.bool as any).must[0].multi_match.query).toBe('bollywood DJ');
    expect((result.query.bool as any).must[0].multi_match.fields).toContain('stage_name^3');
  });

  it('should add genre filter', () => {
    const result = buildSearchQuery({ ...baseParams, genre: 'Bollywood' });

    const filters = (result.query.bool as any).filter;
    expect(filters).toEqual(
      expect.arrayContaining([{ term: { genres: 'Bollywood' } }]),
    );
  });

  it('should add city filter with fuzziness', () => {
    const result = buildSearchQuery({ ...baseParams, city: 'Mumbai' });

    const filters = (result.query.bool as any).filter;
    const cityFilter = filters.find((f: Record<string, unknown>) => 'match' in f);
    expect(cityFilter).toBeDefined();
    expect(cityFilter.match.base_city.query).toBe('Mumbai');
  });

  it('should add event_type filter', () => {
    const result = buildSearchQuery({ ...baseParams, event_type: 'Wedding' });

    const filters = (result.query.bool as any).filter;
    expect(filters).toEqual(
      expect.arrayContaining([{ term: { event_types: 'Wedding' } }]),
    );
  });

  it('should add nested budget range filter', () => {
    const result = buildSearchQuery({ ...baseParams, budget_min: 50000, budget_max: 200000 });

    const filters = (result.query.bool as any).filter;
    const nestedFilter = filters.find((f: Record<string, unknown>) => 'nested' in f);
    expect(nestedFilter).toBeDefined();
    expect(nestedFilter.nested.path).toBe('pricing');
  });

  it('should add geo_distance filter when coordinates provided', () => {
    const result = buildSearchQuery({
      ...baseParams,
      lat: 19.076,
      lng: 72.877,
      distance_km: 50,
    });

    const filters = (result.query.bool as any).filter;
    const geoFilter = filters.find((f: Record<string, unknown>) => 'geo_distance' in f);
    expect(geoFilter).toBeDefined();
    expect(geoFilter.geo_distance.distance).toBe('50km');
  });

  it('should calculate correct pagination offset', () => {
    const result = buildSearchQuery({ ...baseParams, page: 3 });

    expect(result.from).toBe(40); // (3-1) * 20
    expect(result.size).toBe(20);
  });

  it('should include aggregations for facets', () => {
    const result = buildSearchQuery(baseParams);

    expect(result.aggs).toHaveProperty('genres');
    expect(result.aggs).toHaveProperty('cities');
    expect(result.aggs).toHaveProperty('event_types');
    expect(result.aggs).toHaveProperty('price_stats');
  });

  it('should sort by trust_score when sort_by is trust_score', () => {
    const result = buildSearchQuery({ ...baseParams, sort_by: 'trust_score' });

    expect(result.sort[0]).toEqual({ trust_score: 'desc' });
  });

  it('should sort by _score first when query is present', () => {
    const result = buildSearchQuery({ ...baseParams, q: 'test', sort_by: 'relevance' });

    expect(result.sort[0]).toBe('_score');
  });

  it('should sort by created_at for newest', () => {
    const result = buildSearchQuery({ ...baseParams, sort_by: 'newest' });

    expect(result.sort[0]).toEqual({ created_at: 'desc' });
  });

  it('should always filter for minimum profile completion', () => {
    const result = buildSearchQuery(baseParams);

    const filters = (result.query.bool as any).filter;
    const completionFilter = filters.find(
      (f: Record<string, unknown>) => 'range' in f && (f as { range: { profile_completion_pct?: unknown } }).range.profile_completion_pct,
    );
    expect(completionFilter).toBeDefined();
  });
});
