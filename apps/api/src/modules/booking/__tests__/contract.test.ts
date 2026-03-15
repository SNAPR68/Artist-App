import { describe, it, expect } from 'vitest';
import { generateContract } from '../../document/contract.generator.js';

describe('generateContract', () => {
  const contractData = {
    booking_id: 'booking-123',
    artist_name: 'DJ Test',
    client_name: 'Acme Corp',
    event_type: 'Corporate',
    event_date: '2026-06-15',
    event_city: 'Mumbai',
    event_venue: 'Grand Ballroom',
    event_duration_hours: 3,
    final_amount_paise: 20000000, // 2,00,000 INR
    platform_fee_paise: 2000000,
    artist_payout_paise: 18000000,
    tds_paise: 2000000,
    gst_paise: 360000,
  };

  it('should generate a valid contract structure', () => {
    const contract = generateContract(contractData);

    expect(contract.document_type).toBe('booking_contract');
    expect(contract.booking_id).toBe('booking-123');
    expect(contract.parties.artist.name).toBe('DJ Test');
    expect(contract.parties.client.name).toBe('Acme Corp');
  });

  it('should include event details', () => {
    const contract = generateContract(contractData);

    expect(contract.event_details.type).toBe('Corporate');
    expect(contract.event_details.date).toBe('2026-06-15');
    expect(contract.event_details.city).toBe('Mumbai');
    expect(contract.event_details.venue).toBe('Grand Ballroom');
    expect(contract.event_details.duration_hours).toBe(3);
  });

  it('should include financial breakdown', () => {
    const contract = generateContract(contractData);

    expect(contract.financial_terms.total_amount_paise).toBe(20000000);
    expect(contract.financial_terms.breakdown).toBeDefined();
  });

  it('should include cancellation policy tiers', () => {
    const contract = generateContract(contractData);

    expect(contract.cancellation_policy.tiers).toHaveLength(4);
    expect(contract.cancellation_policy.tiers[0].refund).toBe('100%');
    expect(contract.cancellation_policy.tiers[3].refund).toBe('0%');
  });

  it('should generate SHA-256 hash', () => {
    const contract = generateContract(contractData);

    expect(contract.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should produce deterministic hashes for same input', () => {
    const contract1 = generateContract(contractData);
    const contract2 = generateContract(contractData);

    expect(contract1.hash).toBe(contract2.hash);
  });

  it('should produce different hashes for different input', () => {
    const contract1 = generateContract(contractData);
    const contract2 = generateContract({ ...contractData, booking_id: 'different' });

    expect(contract1.hash).not.toBe(contract2.hash);
  });

  it('should include terms and conditions', () => {
    const contract = generateContract(contractData);

    expect(contract.terms.length).toBeGreaterThan(0);
    expect(contract.terms.some((t) => t.includes('TDS'))).toBe(true);
    expect(contract.terms.some((t) => t.includes('escrow'))).toBe(true);
  });
});
