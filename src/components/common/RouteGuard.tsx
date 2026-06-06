import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';

interface RouteGuardProps {
  children: React.ReactNode;
}

// Please add the pages that can be accessed without logging in to PUBLIC_ROUTES.
const PUBLIC_ROUTES = ['/login', '/403', '/404', '/maintenance'];

function matchPublicRoute(path: string, patterns: string[]) {
  return patterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      return regex.test(path);
    }
    return path === pattern;
  });
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, profile, loading, siteSettings, loadingSettings, loadingProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || loadingSettings || (user && !profile && loadingProfile)) return;

    const isMaintenance = siteSettings.maintenance_mode === true;
    const isAdmin = profile?.role === 'admin';
    const isPublic = matchPublicRoute(location.pathname, PUBLIC_ROUTES);

    // Redirect logged-in users with NO profile to login (to clear session) or show error
    if (user && !profile && !loadingProfile && !isPublic) {
      // Something is wrong with the profile data, maybe the user was deleted in DB but session exists
      supabase.auth.signOut();
      navigate('/login', { replace: true });
      return;
    }

    // Maintenance Mode Loop Prevention
    if (isMaintenance && !isAdmin && location.pathname !== '/maintenance' && location.pathname !== '/login') {
      navigate('/maintenance', { replace: true });
      return;
    }

    if (!user && !isPublic) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
    }
  }, [user, profile, loading, loadingSettings, loadingProfile, siteSettings, location.pathname, navigate]);

  if (loading || loadingSettings || (user && !profile && loadingProfile)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}