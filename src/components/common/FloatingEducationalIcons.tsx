import { BookOpen, Pencil, Lightbulb, GraduationCap, Calculator, Globe } from 'lucide-react';

export function FloatingEducationalIcons() {
  return (
    <>
      {/* Icône Livre - Position 1 */}
      <div 
        className="fixed top-[20%] left-[10%] w-12 h-12 opacity-30 animate-float-icon"
        style={{ animationDelay: '0s' }}
      >
        <BookOpen className="w-full h-full text-[#7fbfff]" />
      </div>

      {/* Icône Crayon - Position 2 */}
      <div 
        className="fixed top-[40%] left-[80%] w-12 h-12 opacity-30 animate-float-icon"
        style={{ animationDelay: '3s' }}
      >
        <Pencil className="w-full h-full text-[#7fbfff]" />
      </div>

      {/* Icône Ampoule - Position 3 */}
      <div 
        className="fixed top-[70%] left-[40%] w-12 h-12 opacity-30 animate-float-icon"
        style={{ animationDelay: '6s' }}
      >
        <Lightbulb className="w-full h-full text-[#7fbfff]" />
      </div>

      {/* Icône Chapeau de diplômé - Position 4 */}
      <div 
        className="fixed top-[15%] right-[15%] w-12 h-12 opacity-30 animate-float-icon"
        style={{ animationDelay: '2s' }}
      >
        <GraduationCap className="w-full h-full text-[#b3f0c1]" />
      </div>

      {/* Icône Calculatrice - Position 5 */}
      <div 
        className="fixed bottom-[25%] left-[25%] w-12 h-12 opacity-30 animate-float-icon"
        style={{ animationDelay: '4s' }}
      >
        <Calculator className="w-full h-full text-[#fff7a3]" />
      </div>

      {/* Icône Globe - Position 6 */}
      <div 
        className="fixed bottom-[15%] right-[30%] w-12 h-12 opacity-30 animate-float-icon"
        style={{ animationDelay: '5s' }}
      >
        <Globe className="w-full h-full text-[#a3d9ff]" />
      </div>
    </>
  );
}