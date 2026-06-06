import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GraduationCap, LayoutDashboard, CalendarDays, Bell, Users, FolderOpen, ChevronRight, ChevronLeft, UserPlus, LogIn, CheckCircle, ShieldCheck } from 'lucide-react';

const TOUR_STEPS = [
  {
    title: "Bienvenue sur mon espace étudiant !",
    description: "Votre compagnon universitaire tout-en-un. Laissez-nous vous montrer comment tirer le meilleur parti de la plateforme.",
    icon: GraduationCap,
    color: "text-primary"
  },
  {
    title: "Comment s'inscrire ?",
    description: "Cliquez sur 'S'inscrire' sur la page d'accueil. Choisissez votre profil (Étudiant, Professeur ou Admin), remplissez vos informations et validez. C'est simple et rapide !",
    icon: UserPlus,
    color: "text-emerald-500"
  },
  {
    title: "Accès & Connexion",
    description: "Connectez-vous avec votre email, pseudo ou même votre numéro de téléphone. La sécurité de vos données est notre priorité.",
    icon: LogIn,
    color: "text-blue-500"
  },
  {
    title: "Votre Emploi du Temps",
    description: "Le tableau de bord centralise vos cours. Ajoutez-les en quelques clics avec la salle, le prof et le type (CM/TD/TP).",
    icon: LayoutDashboard,
    color: "text-indigo-500"
  },
  {
    title: "Ne manquez aucun cours",
    description: "Activez les rappels automatiques. Vous recevrez une notification avant chaque cours pour rester toujours ponctuel.",
    icon: Bell,
    color: "text-amber-500"
  },
  {
    title: "Ressources Partagées",
    description: "Accédez aux supports de cours déposés par vos professeurs et gérez vos propres documents personnels.",
    icon: FolderOpen,
    color: "text-rose-500"
  },
  {
    title: "Mises à jour & Évolution",
    description: "Consultez régulièrement la section 'Mises à jour' pour découvrir les nouvelles fonctionnalités ajoutées chaque semaine.",
    icon: ShieldCheck,
    color: "text-cyan-500"
  }
];

export function UsageTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('univ_schedule_tour_seen');
    if (!hasSeenTour) {
      setIsOpen(true);
    }

    const handleOpenTour = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };

    window.addEventListener('open-usage-tour', handleOpenTour);
    return () => window.removeEventListener('open-usage-tour', handleOpenTour);
  }, []);

  const handleComplete = () => {
    localStorage.setItem('univ_schedule_tour_seen', 'true');
    setIsOpen(false);
  };

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = TOUR_STEPS[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md border-primary/20">
        <DialogHeader className="flex flex-col items-center text-center space-y-4 pt-4">
          <div className={`p-4 rounded-2xl bg-muted/50 ${step.color} animate-in zoom-in duration-300`}>
            <step.icon className="h-12 w-12" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">{step.title}</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            {step.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center gap-1.5 py-4">
          {TOUR_STEPS.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-primary' : 'w-2 bg-muted'}`}
            />
          ))}
        </div>

        <DialogFooter className="flex flex-row justify-between sm:justify-between items-center w-full gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleComplete}
            className="text-muted-foreground"
          >
            Passer
          </Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
            )}
            <Button size="sm" onClick={nextStep} className="px-6">
              {currentStep === TOUR_STEPS.length - 1 ? 'C\'est parti !' : 'Suivant'}
              {currentStep < TOUR_STEPS.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}