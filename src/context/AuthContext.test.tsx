import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AuthProvider, useAuth } from './AuthContext';

// Mock Supabase
vi.mock('../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe('AuthContext & requireAuth Guard', () => {
  it('blocks unauthenticated actions and returns false', () => {
    let capturedAllowed: boolean | null = null;
    const TestConsumer = () => {
      const { isAuthenticated, requireAuth } = useAuth();
      capturedAllowed = requireAuth('add courses to the database');
      return (
        <div>
          <span data-testid="auth">{String(isAuthenticated)}</span>
          <span data-testid="allowed">{String(capturedAllowed)}</span>
        </div>
      );
    };

    const html = renderToString(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(html).toContain('false');
    expect(capturedAllowed).toBe(false);
  });
});
