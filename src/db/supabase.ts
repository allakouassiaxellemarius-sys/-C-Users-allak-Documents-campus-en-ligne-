
import { createClient } from "@supabase/supabase-js";

// Validate and sanitize env vars
function validateEnv(): { url: string; key: string } {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const url = rawUrl.replace(/[^\x00-\xFF]/g, '').replace(/\/+$/, '');
  const key = rawKey.replace(/[^\x00-\xFF]/g, '');

  if (!url || !key) {
    if (typeof window !== 'undefined') {
      console.warn('Missing Supabase env vars, using mock client');
    }
  } else if (!url.startsWith('https://')) {
    throw new Error(`Invalid VITE_SUPABASE_URL: must start with https:// (got "${url}")`);
  } else if (key.length < 10) {
    console.warn('VITE_SUPABASE_ANON_KEY looks too short, check env config');
  }
  return { url, key };
}

const { url: supabaseUrl, key: supabaseAnonKey } = validateEnv();

// Wrap fetch to sanitize headers, add timeout, and retry on failure
const safeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const MAX_RETRIES = 2;

  const sanitize = (init?: RequestInit): RequestInit => {
    if (!init?.headers) return init || {};
    const safe: Record<string, string> = {};
    const entries = init.headers instanceof Headers
      ? [...init.headers.entries()]
      : Object.entries(init.headers as Record<string, string>);
    for (const [k, v] of entries) {
      safe[k] = typeof v === 'string' ? v.replace(/[^\x00-\xFF]/g, '') : String(v).replace(/[^\x00-\xFF]/g, '');
    }
    return { ...init, headers: safe };
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const merged: RequestInit = {
        ...sanitize(init),
        signal: init?.signal ?? controller.signal,
      };
      const res = await fetch(input, merged);
      return res;
    } catch (err) {
      clearTimeout(timeout);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error('safeFetch: unreachable');
};

function createMockClient() {
  const handler = {
    get(_target: any, prop: string) {
      if (prop === 'auth') {
        return new Proxy({}, {
          get(_t: any, p: string) {
            if (p === 'getSession') return () => Promise.resolve({ data: { session: null }, error: null });
            if (p === 'onAuthStateChange') return () => ({ data: { subscription: { unsubscribe: () => {} } } });
            if (p === 'signInWithPassword') return () => Promise.resolve({ data: {}, error: null });
            if (p === 'signUp') return () => Promise.resolve({ data: {}, error: null });
            if (p === 'signOut') return () => Promise.resolve({ error: null });
            if (p === 'verifyOtp') return () => Promise.resolve({ error: null });
            if (p === 'resetPasswordForEmail') return () => Promise.resolve({ data: {}, error: null });
            if (p === 'resend') return () => Promise.resolve({ data: {}, error: null });
            return () => Promise.resolve({ data: {}, error: null });
          }
        });
      }
      if (prop === 'storage') {
        return new Proxy({}, {
          get(_t: any, p: string) {
            if (p === 'from') return () => new Proxy({}, {
              get(_tb: any, tp: string) {
                if (tp === 'upload') return () => Promise.resolve({ data: { path: '' }, error: null });
                if (tp === 'download') return () => Promise.resolve({ data: null, error: null });
                if (tp === 'getPublicUrl') return () => Promise.resolve({ data: { publicUrl: '' } });
                if (tp === 'remove') return () => Promise.resolve({ data: {}, error: null });
                return () => Promise.resolve({ data: {}, error: null });
              }
            });
            return () => Promise.resolve({ data: {}, error: null });
          }
        });
      }
      if (prop === 'from') {
        return () => new Proxy({}, {
          get(_t: any, p: string) {
            if (['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains', 'containedBy', 'rangeLt', 'rangeGt', 'rangeGte', 'rangeLte', 'overlaps', 'textSearch', 'match', 'not', 'filter', 'or', 'order', 'limit', 'single', 'maybeSingle', 'csv', 'returns'].includes(p)) {
              return () => new Proxy({}, { get: (_tb: any, tp: string) => tp === 'then' ? undefined : () => new Proxy({}, { get: (_tb2: any, tp2: string) => tp2 === 'then' ? undefined : () => new Proxy({}, { get: (_tb3: any, tp3: string) => tp3 === 'then' ? undefined : () => Promise.resolve({ data: null, error: null }) }) }) });
            }
            return () => Promise.resolve({ data: null, error: null });
          }
        });
      }
      if (prop === 'rpc') {
        return () => Promise.resolve({ data: null, error: null });
      }
      if (prop === 'functions') {
        return new Proxy({}, {
          get: () => () => Promise.resolve({ data: null, error: null })
        });
      }
      return () => Promise.resolve({ data: null, error: null });
    }
  };
  return new Proxy({}, handler) as any;
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: safeFetch } })
  : createMockClient();