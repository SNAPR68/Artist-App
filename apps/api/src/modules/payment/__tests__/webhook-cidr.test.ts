import { describe, it, expect } from 'vitest';

// Extract the CIDR matching functions for testing
// (Mirroring the logic from payment.routes.ts)

function ipToNumber(ip: string): number {
  const cleanIP = ip.replace(/^::ffff:/, '');
  const parts = cleanIP.split('.');
  if (parts.length !== 4) return 0;
  return parts.reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isIPInCIDR(ip: string, cidr: string): boolean {
  const [rangeIP, prefixStr] = cidr.split('/');
  if (!prefixStr) {
    return ip.replace(/^::ffff:/, '') === rangeIP;
  }
  const prefix = parseInt(prefixStr, 10);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipToNumber(ip) & mask) === (ipToNumber(rangeIP) & mask);
}

describe('Webhook CIDR Validation', () => {
  it('should match IPs within a /24 range', () => {
    expect(isIPInCIDR('49.12.34.100', '49.12.34.0/24')).toBe(true);
    expect(isIPInCIDR('49.12.34.255', '49.12.34.0/24')).toBe(true);
    expect(isIPInCIDR('49.12.34.0', '49.12.34.0/24')).toBe(true);
  });

  it('should reject IPs outside the /24 range', () => {
    expect(isIPInCIDR('49.12.35.1', '49.12.34.0/24')).toBe(false);
    expect(isIPInCIDR('10.0.0.1', '49.12.34.0/24')).toBe(false);
  });

  it('should match IPs within a /18 range', () => {
    expect(isIPInCIDR('192.186.128.1', '192.186.128.0/18')).toBe(true);
    expect(isIPInCIDR('192.186.190.255', '192.186.128.0/18')).toBe(true);
    expect(isIPInCIDR('192.186.191.255', '192.186.128.0/18')).toBe(true);
  });

  it('should reject IPs outside the /18 range', () => {
    expect(isIPInCIDR('192.186.192.1', '192.186.128.0/18')).toBe(false);
    expect(isIPInCIDR('192.187.0.1', '192.186.128.0/18')).toBe(false);
  });

  it('should handle IPv6-mapped IPv4 addresses', () => {
    expect(isIPInCIDR('::ffff:49.12.34.50', '49.12.34.0/24')).toBe(true);
    expect(isIPInCIDR('::ffff:10.0.0.1', '49.12.34.0/24')).toBe(false);
  });

  it('should handle exact IP match (no CIDR)', () => {
    expect(isIPInCIDR('10.0.0.1', '10.0.0.1')).toBe(true);
    expect(isIPInCIDR('10.0.0.2', '10.0.0.1')).toBe(false);
  });
});
