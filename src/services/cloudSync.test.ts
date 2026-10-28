import { describe, it, expect } from 'vitest';
import { toValidUuid, cloudSync } from './cloudSync';

describe('CloudSyncService', () => {
  it('converts short arbitrary string IDs to standard RFC4122 v4 UUID format', () => {
    const rawId1 = 'sub-1';
    const uuid1 = toValidUuid(rawId1);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    expect(uuidRegex.test(uuid1)).toBe(true);

    // Deterministic: same input produces same output
    expect(toValidUuid('sub-1')).toBe(uuid1);

    // Preserves already valid UUIDs
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(toValidUuid(validUuid)).toBe(validUuid);
  });

  it('rejects sync when user is unauthenticated', async () => {
    const res = await cloudSync.syncToCloud('');
    expect(res.success).toBe(false);
    expect(res.message).toContain('authenticated');
  });

  it('rejects restore when user is unauthenticated', async () => {
    const res = await cloudSync.restoreFromCloud('');
    expect(res.success).toBe(false);
    expect(res.message).toContain('authenticated');
  });
});
