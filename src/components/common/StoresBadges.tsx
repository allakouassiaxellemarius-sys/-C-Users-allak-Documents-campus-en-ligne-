import { useEffect, useState } from 'react';
import { api } from '@/db/api';

interface StoresBadgesProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Badge SVG Google Play (style officiel)
function GooglePlayBadge({ url, size }: { url: string; size: string }) {
  const widths = { sm: 130, md: 155, lg: 180 };
  const heights = { sm: 38, md: 46, lg: 54 };
  const w = widths[size as keyof typeof widths] ?? 155;
  const h = heights[size as keyof typeof heights] ?? 46;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Télécharger sur Google Play"
      className="inline-block transition-transform hover:scale-105 active:scale-95"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={w}
        height={h}
        viewBox="0 0 155 46"
        role="img"
        aria-label="Disponible sur Google Play"
      >
        {/* Fond noir arrondi */}
        <rect width="155" height="46" rx="8" fill="#000000" />
        <rect width="153" height="44" x="1" y="1" rx="7" fill="#1a1a1a" />

        {/* Logo Google Play coloré */}
        <g transform="translate(10, 8)">
          {/* Triangle Play stylisé avec dégradé Google */}
          <polygon points="0,0 14,15 0,30" fill="url(#gp-grad1)" />
          <polygon points="0,0 14,15 8,15" fill="url(#gp-grad2)" />
          <polygon points="0,30 14,15 8,15" fill="url(#gp-grad3)" />
          <defs>
            <linearGradient id="gp-grad1" x1="0" y1="0" x2="14" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#00C3FF" />
              <stop offset="1" stopColor="#00A5FF" />
            </linearGradient>
            <linearGradient id="gp-grad2" x1="0" y1="0" x2="14" y2="15" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FFDA00" />
              <stop offset="1" stopColor="#FFB300" />
            </linearGradient>
            <linearGradient id="gp-grad3" x1="0" y1="15" x2="14" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FF3D00" />
              <stop offset="1" stopColor="#DD2C00" />
            </linearGradient>
          </defs>
        </g>

        {/* Texte */}
        <text x="33" y="19" fontFamily="Arial, sans-serif" fontSize="9" fill="#aaaaaa" letterSpacing="0.5">
          DISPONIBLE SUR
        </text>
        <text x="33" y="33" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="#ffffff" letterSpacing="0">
          Google Play
        </text>
      </svg>
    </a>
  );
}

// Badge SVG App Store (style officiel Apple)
function AppStoreBadge({ url, size }: { url: string; size: string }) {
  const widths = { sm: 116, md: 138, lg: 160 };
  const heights = { sm: 38, md: 46, lg: 54 };
  const w = widths[size as keyof typeof widths] ?? 138;
  const h = heights[size as keyof typeof heights] ?? 46;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Télécharger sur l'App Store"
      className="inline-block transition-transform hover:scale-105 active:scale-95"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={w}
        height={h}
        viewBox="0 0 138 46"
        role="img"
        aria-label="Télécharger dans l'App Store"
      >
        {/* Fond noir arrondi */}
        <rect width="138" height="46" rx="8" fill="#000000" />
        <rect width="136" height="44" x="1" y="1" rx="7" fill="#1a1a1a" />

        {/* Icône Apple */}
        <g transform="translate(10, 7)">
          <path
            d="M16 4.5c-0.2-1.5-1.1-2.8-2.3-3.6 0.5 0.9 0.8 1.9 0.8 3 0 0.2 0 0.4-0.1 0.6 0.6 0 1.1 0 1.6 0z M13.5 4.5c0-1-0.3-2-0.8-2.8-0.8-1-2-1.7-3.4-1.7-0.1 0-0.1 0-0.2 0 1.5 0.5 2.7 1.6 3.2 3 0.1 0.5 0.2 1 0.2 1.5 0 0 0 0 0 0 0.3 0 0.7 0 1 0z"
            fill="#ffffff"
          />
          <path
            d="M9.1 0c-2.1 0.1-4 1.3-5 3.1-0.7 1.2-1 2.6-1 4 0 4.5 3.1 8.3 3.1 8.3 0.5 0.7 1.1 1.5 2 1.5 0.8 0 1.1-0.5 2.1-0.5 1 0 1.3 0.5 2.1 0.5 0.9 0 1.5-0.8 2-1.5 0.5-0.8 0.8-1.6 0.8-1.6-1.5-0.6-2.5-2.1-2.5-3.8 0-1.5 0.8-2.8 2-3.5-0.8-1.1-2-1.8-3.4-1.9-0.7-0.1-1.5 0-2.2 0.4 0.5-0.5 1-1 1.6-1.3-0.6-0.2-1.1-0.3-1.6-0.3-0.1 0 0 0.1 0 0.1z"
            fill="#ffffff"
            transform="translate(1, 1)"
          />
        </g>

        {/* Texte */}
        <text x="34" y="19" fontFamily="Arial, sans-serif" fontSize="8.5" fill="#aaaaaa" letterSpacing="0.5">
          Télécharger dans
        </text>
        <text x="34" y="33" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="#ffffff" letterSpacing="-0.3">
          App Store
        </text>
      </svg>
    </a>
  );
}

export function StoresBadges({ className = '', size = 'md' }: StoresBadgesProps) {
  const [googlePlayUrl, setGooglePlayUrl] = useState<string | null>(null);
  const [appStoreUrl, setAppStoreUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStoreUrls() {
      try {
        const settings = await api.admin.getSettings();
        const gpUrl = typeof settings.google_play_url === 'string'
          ? settings.google_play_url
          : '';
        const asUrl = typeof settings.app_store_url === 'string'
          ? settings.app_store_url
          : '';
        setGooglePlayUrl(gpUrl || null);
        setAppStoreUrl(asUrl || null);
      } catch {
        setGooglePlayUrl(null);
        setAppStoreUrl(null);
      } finally {
        setLoading(false);
      }
    }
    loadStoreUrls();
  }, []);

  if (loading) return null;

  // Aucun store configuré → ne rien afficher
  if (!googlePlayUrl && !appStoreUrl) return null;

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {googlePlayUrl && (
        <GooglePlayBadge url={googlePlayUrl} size={size} />
      )}
      {appStoreUrl && (
        <AppStoreBadge url={appStoreUrl} size={size} />
      )}
    </div>
  );
}