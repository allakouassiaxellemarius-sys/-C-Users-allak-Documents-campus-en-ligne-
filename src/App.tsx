import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import routes from './routes';
import { RouteGuard } from '@/components/common/RouteGuard';

const App: React.FC = () => {
  useEffect(() => {
    import('@/lib/offlineStorage').then(({ clearStore, STORES }) => {
      clearStore(STORES.PENDING_OPERATIONS).catch(() => {});
    });
    // Clean localStorage Supabase items with non-Latin-1 values
    try {
      for (const key in localStorage) {
        if (key.startsWith('sb-')) {
          const val = localStorage.getItem(key);
          if (val && /[^\x00-\xFF]/.test(val)) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch {}
  }, []);

  return (
    <Router>
      <RouteGuard>
        <IntersectObserver />
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow">
            <Routes>
              {routes.map((route, index) => (
                <Route
                  key={index}
                  path={route.path}
                  element={route.element}
                />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <Toaster position="top-center" />
      </RouteGuard>
    </Router>
  );
};

export default App;