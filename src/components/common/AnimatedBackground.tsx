import { BookOpen, Pencil, Globe, GraduationCap, Calculator, Lightbulb } from 'lucide-react';
import { useMouseParallax } from '@/hooks/useMouseParallax';

export function AnimatedBackground() {
  const { getParallaxStyle } = useMouseParallax();

  return (
    <>
      {/* Cercles colorés flottants avec parallaxe - déplacement lent */}
      <div 
        className="absolute top-[10%] left-[5%] w-32 h-32 bg-blue-200/30 rounded-full blur-xl float-slow" 
        style={getParallaxStyle(30, { maxDistance: 50, smoothing: 0.4 })}
      />
      <div 
        className="absolute top-[60%] left-[10%] w-40 h-40 bg-green-200/30 rounded-full blur-xl float-medium" 
        style={{ animationDelay: '1s', ...getParallaxStyle(25, { maxDistance: 45, smoothing: 0.5 }) }}
      />
      <div 
        className="absolute top-[30%] right-[8%] w-36 h-36 bg-yellow-200/30 rounded-full blur-xl float-slow" 
        style={{ animationDelay: '2s', ...getParallaxStyle(35, { maxDistance: 55, smoothing: 0.35 }) }}
      />
      <div 
        className="absolute bottom-[20%] right-[15%] w-44 h-44 bg-purple-200/30 rounded-full blur-xl float-fast" 
        style={{ animationDelay: '0.5s', ...getParallaxStyle(20, { maxDistance: 40, smoothing: 0.6 }) }}
      />
      <div 
        className="absolute top-[45%] left-[50%] w-48 h-48 bg-pink-200/20 rounded-full blur-2xl float-medium" 
        style={{ animationDelay: '1.5s', ...getParallaxStyle(15, { maxDistance: 35, smoothing: 0.7 }) }}
      />
      
      {/* Icônes éducatives animées avec parallaxe - déplacement plus rapide */}
      <div 
        className="absolute top-[15%] left-[15%] opacity-10 rotate-slow"
        style={getParallaxStyle(40, { maxDistance: 60, smoothing: 0.3 })}
      >
        <BookOpen className="w-16 h-16 text-blue-500" />
      </div>
      
      <div 
        className="absolute top-[25%] right-[20%] opacity-10 float-slow" 
        style={{ animationDelay: '0.5s', ...getParallaxStyle(45, { maxDistance: 65, smoothing: 0.25 }) }}
      >
        <Pencil className="w-12 h-12 text-yellow-600" />
      </div>
      
      <div 
        className="absolute bottom-[30%] left-[20%] opacity-10 rotate-reverse"
        style={getParallaxStyle(35, { maxDistance: 55, smoothing: 0.35 })}
      >
        <Globe className="w-14 h-14 text-green-500" />
      </div>
      
      <div 
        className="absolute top-[50%] right-[10%] opacity-10 float-medium" 
        style={{ animationDelay: '1s', ...getParallaxStyle(50, { maxDistance: 70, smoothing: 0.2 }) }}
      >
        <GraduationCap className="w-16 h-16 text-purple-500" />
      </div>
      
      <div 
        className="absolute bottom-[15%] right-[25%] opacity-10 rotate-slow" 
        style={{ animationDelay: '2s', ...getParallaxStyle(38, { maxDistance: 58, smoothing: 0.3 }) }}
      >
        <Calculator className="w-12 h-12 text-orange-500" />
      </div>
      
      <div 
        className="absolute top-[70%] left-[30%] opacity-10 float-fast" 
        style={{ animationDelay: '1.5s', ...getParallaxStyle(42, { maxDistance: 62, smoothing: 0.28 }) }}
      >
        <Lightbulb className="w-14 h-14 text-yellow-500" />
      </div>

      {/* Petits cercles décoratifs avec parallaxe - déplacement très rapide */}
      <div 
        className="absolute top-[20%] left-[40%] w-3 h-3 bg-blue-400/40 rounded-full scale-pulse"
        style={getParallaxStyle(55, { maxDistance: 75, smoothing: 0.2 })}
      />
      <div 
        className="absolute top-[55%] left-[70%] w-4 h-4 bg-green-400/40 rounded-full scale-pulse" 
        style={{ animationDelay: '1s', ...getParallaxStyle(60, { maxDistance: 80, smoothing: 0.18 }) }}
      />
      <div 
        className="absolute bottom-[25%] left-[45%] w-2 h-2 bg-yellow-400/40 rounded-full scale-pulse" 
        style={{ animationDelay: '2s', ...getParallaxStyle(50, { maxDistance: 70, smoothing: 0.22 }) }}
      />
      <div 
        className="absolute top-[80%] right-[40%] w-3 h-3 bg-purple-400/40 rounded-full scale-pulse" 
        style={{ animationDelay: '0.5s', ...getParallaxStyle(58, { maxDistance: 78, smoothing: 0.19 }) }}
      />
      <div 
        className="absolute top-[35%] right-[50%] w-4 h-4 bg-pink-400/40 rounded-full scale-pulse" 
        style={{ animationDelay: '1.5s', ...getParallaxStyle(52, { maxDistance: 72, smoothing: 0.21 }) }}
      />
    </>
  );
}