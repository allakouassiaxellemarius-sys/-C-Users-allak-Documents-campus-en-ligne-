
import { createClient } from "@supabase/supabase-js";

// Purge corrupted Supabase session BEFORE client init to prevent _recoverAndRefresh from using bad tokens
try {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('sb-') || key === 'supabase.auth.token' || key.includes('supabase')) {
      const val = localStorage.getItem(key);
      if (val && /[^\x00-\xFF]/.test(val)) {
        localStorage.removeItem(key);
      }
    }
  }
} catch {}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Wrap fetch to sanitize headers and debug the non-ISO-8859-1 error
const safeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  if (init?.headers) {
    const safe: Record<string, string> = {};
    const entries = init.headers instanceof Headers
      ? [...init.headers.entries()]
      : Object.entries(init.headers as Record<string, string>);
    for (const [k, v] of entries) {
      const clean = typeof v === 'string' ? v.replace(/[^\x00-\xFF]/g, '') : String(v).replace(/[^\x00-\xFF]/g, '');
      if (clean !== v) {
        console.warn(`[safeFetch] Sanitized header "${k}":`, JSON.stringify(v));
      }
      safe[k] = clean;
    }
    return fetch(input, { ...init, headers: safe });
  }
  return fetch(input, init);
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