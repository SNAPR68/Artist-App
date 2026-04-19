import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRole } from '@artist-booking/shared';

// Mock api-client before importing auth store
vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('Auth Store - Smoke Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('should initialize with no user when no token exists', async () => {
    // Dynamic import to pick up fresh mocked localStorage
    const { useAuthStore } = await import('@/lib/auth');
    const state = useAuthStore.getState();

    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should decode a valid JWT and set user', async () => {
    // Create a mock JWT with expected payload
    const payload = { user_id: 'test-123', role: 'client', phone: '9876543210' };
    const fakeJWT = `header.${btoa(JSON.stringify(payload))}.signature`;
    localStorageMock.getItem.mockImplementation(((key: string) => {
      if (key === 'access_token') return fakeJWT;
      return null;
    }) as (key: string) => string);

    // Force re-initialization
    vi.resetModules();
    const mod = await import('@/lib/auth');
    const state = mod.useAuthStore.getState();

    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.id).toBe('test-123');
    expect(state.user?.role).toBe('client');
  });

  it('should clear state on logout', async () => {
    const { useAuthStore } = await import('@/lib/auth');
    const { clearTokens } = await import('@/lib/api-client');

    // Manually set authenticated state
    useAuthStore.setState({
      user: { id: 'u1', phone: '123', role: UserRole.CLIENT, is_new: false },
      isAuthenticated: true,
    });

    await useAuthStore.getState().logout();

    expect(clearTokens).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
