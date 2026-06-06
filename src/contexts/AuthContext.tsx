import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User, VerifyOtpParams } from '@supabase/supabase-js';
import type { Profile } from '@/types/index';
import { api } from '@/db/api';
import { toast } from 'sonner';

export async function getProfile(userId: string): Promise<Profile | null> {
  let attempts = 0;
  const maxAttempts = 3; // Reduced for faster startup
  
  while (attempts < maxAttempts) {
    try {
      // Add timeout to prevent indefinite hanging
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile timeout')), 4000)
      );
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (!error && data) {
        return data;
      }
      
      // If no error but data is null, the profile really doesn't exist. Don't retry.
      if (!error && !data) {
        console.warn(`Profile not found for user ${userId}`);
        return null;
      }

      if (error) {
        console.error(`Attempt ${attempts + 1} failed to fetch profile:`, error);
      }
    } catch (err) {
      console.error(`Attempt ${attempts + 1} profile fetch error:`, err);
    }

    attempts++;
    if (attempts < maxAttempts) {
      // Faster first retry, then standard
      const delay = attempts === 1 ? 200 : 500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, role?: string, profession?: string) => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (params: VerifyOtpParams) => Promise<{ error: Error | null }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  signInWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithUsername: (username: string, password: string, role?: string, profession?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  siteSettings: any;
  loadingSettings: boolean;
  loadingProfile: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [siteSettings, setSiteSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const refreshSettings = async () => {
    try {
      // Add a timeout to prevent hanging forever if Supabase is unresponsive
      const settingsPromise = supabase.from('site_settings').select('*');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Settings timeout')), 5000)
      );

      const { data, error } = await Promise.race([settingsPromise, timeoutPromise]) as any;
      
      if (error) throw error;
      const settings = (data || []).reduce((acc: any, s: any) => {
        acc[s.key] = s.value;
        return acc;
      }, {});
      setSiteSettings(settings);
    } catch (err) {
      console.error('Failed to load settings:', err);
      // Initialize with defaults if fetch fails
      setSiteSettings({
        maintenance_mode: false,
        registration_enabled: true
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    setLoadingProfile(true);
    try {
      const profileData = await getProfile(user.id);
      setProfile(profileData);
    } finally {
      setLoadingProfile(false);
    }
  };

  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    refreshSettings();
    
    let isInitialLoad = true;

    // Explicitly get the current session once to speed up initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        setLoadingProfile(true);
        getProfile(currentUser.id).then(p => {
          setProfile(p);
          setLoadingProfile(false);
          if (isInitialLoad) {
            setLoading(false);
            isInitialLoad = false;
          }
        });
      } else {
        if (isInitialLoad) {
          setLoading(false);
          isInitialLoad = false;
        }
      }
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      
      // If user ID is the same, don't re-fetch profile unless it's null
      if (currentUser?.id === lastUserId.current && profile && !isInitialLoad) {
        setUser(currentUser);
        return;
      }

      lastUserId.current = currentUser?.id ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        setLoadingProfile(true);
        const p = await getProfile(currentUser.id);
        setProfile(p);
        setLoadingProfile(false);
      } else {
        setProfile(null);
        setLoadingProfile(false);
      }
      
      if (isInitialLoad) {
        setLoading(false);
        isInitialLoad = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Stable effect

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUpWithEmail = async (email: string, password: string, role: string = 'user', profession?: string) => {
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { role, profession }
      }
    });
    return { error: error as Error | null };
  };

  const signUpWithUsername = async (username: string, password: string, role: string = 'user', profession?: string) => {
    const email = `${username.toLowerCase()}@univ-schedule.internal`;
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { username, role, profession }
      }
    });
    return { error: error as Error | null };
  };

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return { error: error as Error | null };
  };

  const verifyOtp = async (params: VerifyOtpParams) => {
    const { error } = await supabase.auth.verifyOtp(params);
    return { error: error as Error | null };
  };

  const resendConfirmationEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    return { error: error as Error | null };
  };

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/profile`, // Temporary, usually should be a dedicated reset page
    });
    return { error: error as Error | null };
  };

  const signInWithUsername = async (username: string, password: string) => {
    const email = `${username.toLowerCase()}@univ-schedule.internal`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const deleteAccount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
      });
      
      if (error) {
        const errMsg = await error?.context?.text();
        throw new Error(errMsg || error.message);
      }
      
      await signOut();
      return { error: null };
    } catch (error) {
      console.error('Delete account error:', error);
      return { error: error as Error };
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    try {
      const updatedProfile = await api.profiles.update(user.id, updates);
      setProfile(updatedProfile);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, 
      signInWithEmail, signUpWithEmail, 
      signInWithPhone, verifyOtp,
      resendConfirmationEmail,
      resetPasswordForEmail,
      signInWithUsername, signUpWithUsername, 
      signOut, deleteAccount, refreshProfile, updateProfile,
      siteSettings,
      loadingSettings,
      loadingProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}