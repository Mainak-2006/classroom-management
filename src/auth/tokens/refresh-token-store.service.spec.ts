import { RefreshTokenStore } from './refresh-token-store.service';

describe('RefreshTokenStore', () => {
  let store: RefreshTokenStore;

  const now = Date.now();
  const tokenId = 'abc-123';
  const payload = { userId: '1', role: 'student' as const };

  beforeEach(() => {
    store = new RefreshTokenStore();
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('save / isValid', () => {
    it('should return true for a valid stored token', () => {
      store.save(tokenId, payload, now + 60_000);
      expect(store.isValid(tokenId)).toBe(true);
    });

    it('should return false for an unknown token', () => {
      expect(store.isValid('missing')).toBe(false);
    });

    it('should return false for an expired token and clean it up', () => {
      store.save(tokenId, payload, now - 1);
      expect(store.isValid(tokenId)).toBe(false);
      jest.setSystemTime(now + 1);
      expect(
        (store as unknown as { refreshTokens: Map<string, unknown> })
          .refreshTokens.size,
      ).toBe(0);
    });
  });

  describe('revoke', () => {
    it('should invalidate a token after revocation', () => {
      store.save(tokenId, payload, now + 60_000);
      store.revoke(tokenId);
      expect(store.isValid(tokenId)).toBe(false);
    });
  });

  describe('revokeAllForUser', () => {
    it('should revoke every token belonging to the user', () => {
      store.save('t1', payload, now + 60_000);
      store.save('t2', { ...payload, userId: '1' }, now + 60_000);
      store.save('t3', { ...payload, userId: '2' }, now + 60_000);

      store.revokeAllForUser('1');

      expect(store.isValid('t1')).toBe(false);
      expect(store.isValid('t2')).toBe(false);
      expect(store.isValid('t3')).toBe(true);
    });
  });

  describe('access token blacklist', () => {
    it('should mark a token as blacklisted', () => {
      store.blacklistAccessToken('at-1', now + 60_000);
      expect(store.isAccessTokenBlacklisted('at-1')).toBe(true);
    });

    it('should return false for a non-blacklisted token', () => {
      expect(store.isAccessTokenBlacklisted('unknown')).toBe(false);
    });

    it('should expire blacklisted tokens', () => {
      store.blacklistAccessToken('at-1', now - 1);
      expect(store.isAccessTokenBlacklisted('at-1')).toBe(false);
    });
  });
});
