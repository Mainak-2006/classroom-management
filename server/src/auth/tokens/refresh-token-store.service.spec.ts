import { RefreshTokenStore } from './refresh-token-store.service';

describe('RefreshTokenStore', () => {
  const session = {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  };
  const revoked = { upsert: jest.fn(), findUnique: jest.fn() };
  let store: RefreshTokenStore;

  beforeEach(() => {
    jest.resetAllMocks();
    store = new RefreshTokenStore({
      authSession: session,
      revokedAccessToken: revoked,
    } as never);
  });

  it('persists refresh sessions by a hashed token id', async () => {
    await store.save(
      'token',
      { userId: 'user-1', role: 'student' },
      Date.now() + 60_000,
    );
    expect(session.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: 'user-1',
          role: 'student',
        }) as Record<string, unknown>,
      }) as Record<string, unknown>,
    );
  });

  it('accepts only unrevoked, unexpired refresh sessions', async () => {
    session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });
    await expect(store.isValid('token')).resolves.toBe(true);
    session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() - 1),
      revokedAt: null,
    });
    await expect(store.isValid('token')).resolves.toBe(false);
  });

  it('revokes a session and persists access-token logout', async () => {
    await store.revoke('token');
    await store.blacklistAccessToken('access', Date.now() + 60_000);
    expect(session.updateMany).toHaveBeenCalled();
    expect(revoked.upsert).toHaveBeenCalled();
  });
});
