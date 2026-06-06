
import { createClient } from "@supabase/supabase-js";

// Purge ALL Supabase session data BEFORE client init
try {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('sb-') || key === 'supabase.auth.token' || key.includes('supabase')) {
      localStorage.removeItem(key);
    }
  }
  // Also clear IndexedDB pending operations
  if (typeof indexedDB !== 'undefined') {
    indexedDB.deleteDatabase('CampusEnLigneDB');
    indexedDB.deleteDatabase('sync-pending');
  }
} catch {}

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

// Wrap fetch to sanitize headers and add timeout
const safeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const mergedInit: RequestInit = {
    ...init,
    signal: init?.signal ?? controller.signal,
  };

  try {
    if (mergedInit.headers) {
      const safe: Record<string, string> = {};
      const entries = mergedInit.headers instanceof Headers
        ? [...mergedInit.headers.entries()]
        : Object.entries(mergedInit.headers as Record<string, string>);
      for (const [k, v] of entries) {
        const clean = typeof v === 'string' ? v.replace(/[^\x00-\xFF]/g, '') : String(v).replace(/[^\x00-\xFF]/g, '');
        if (clean !== v) {
          console.warn(`[safeFetch] Sanitized header "${k}":`, JSON.stringify(v));
        }
        safe[k] = clean;
      }
      return fetch(input, { ...mergedInit, headers: safe });
    }
    return fetch(input, mergedInit);
  } finally {
    clearTimeout(timeout);
  }
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