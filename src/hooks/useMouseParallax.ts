import { useState, useEffect } from 'react';

interface MousePosition {
  x: number;
  y: number;
}

export function useMouseParallax() {
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    // Détecter si c'est un appareil mobile ou tactile
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || 'ontouchstart' in window;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Vérifier la préférence de mouvement réduit
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setIsEnabled(!prefersReducedMotion);

    // Suivre le mouvement de la souris avec throttling pour les performances
    let rafId: number;
    let lastTime = 0;
    const throttleDelay = 16; // ~60fps

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      
      if (now - lastTime < throttleDelay) {
        return;
      }
      
      lastTime = now;

      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        // Calculer la position relative au centre de l'écran (-0.5 à 0.5)
        const x = (e.clientX - window.innerWidth / 2) / window.innerWidth;
        const y = (e.clientY - window.innerHeight / 2) / window.innerHeight;
        
        setMousePosition({ x, y });
      });
    };

    if (!isMobile && isEnabled) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', checkMobile);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isMobile, isEnabled]);

  // Calculer le style de parallaxe pour un élément
  const getParallaxStyle = (factor: number, options?: { 
    maxDistance?: number;
    smoothing?: number;
  }) => {
    if (isMobile || !isEnabled) {
      return {};
    }

    const maxDistance = options?.maxDistance || 100;
    const smoothing = options?.smoothing || 0.3;

    // Limiter le déplacement maximum
    const x = Math.max(-maxDistance, Math.min(maxDistance, mousePosition.x * factor));
    const y = Math.max(-maxDistance, Math.min(maxDistance, mousePosition.y * factor));
    
    return {
      transform: `translate(${x}px, ${y}px)`,
      transition: `transform ${smoothing}s ease-out`,
      willChange: 'transform',
    };
  };

  return {
    mousePosition,
    isMobile,
    isEnabled,
    getParallaxStyle,
  };
}