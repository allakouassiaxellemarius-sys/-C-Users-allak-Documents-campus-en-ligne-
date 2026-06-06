import React from 'react';
import { Hammer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const MaintenancePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md space-y-6">
        <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto animate-bounce">
          <Hammer className="h-12 w-12 text-primary" />
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight">Site en Maintenance</h1>
        
        <p className="text-muted-foreground text-lg italic">
          Nous effectuons actuellement des travaux de maintenance pour améliorer votre expérience. 
          Revenez dans quelques instants !
        </p>

        <div className="pt-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/login')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Accès Administrateur
          </Button>
        </div>

        <p className="text-sm text-muted-foreground pt-12">
          &copy; 2026 mon espace étudiant
        </p>
      </div>
    </div>
  );
};

export default MaintenancePage;