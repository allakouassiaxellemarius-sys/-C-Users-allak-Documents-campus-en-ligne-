import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  Users, 
  Video,
  ArrowRight,
  CheckCircle,
  Clock,
  Bell,
  FileText,
  Download,
  Smartphone
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PWAInstallBanner } from '@/components/common/PWAInstallBanner';
import { InstallButton } from '@/components/common/InstallButton';
import { StoresBadges } from '@/components/common/StoresBadges';
import { AnimatedBackground } from '@/components/common/AnimatedBackground';
import { EducationalParticles } from '@/components/common/EducationalParticles';
import { FloatingEducationalIcons } from '@/components/common/FloatingEducationalIcons';

export default function LandingPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    // Rediriger les utilisateurs connectés vers leur espace
    if (user && profile) {
      if (profile.role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (profile.role === 'teacher') {
        navigate('/teacher', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, profile, navigate]);

  const features = [
    {
      icon: Calendar,
      title: 'Emploi du Temps',
      description: 'Gérez votre emploi du temps avec des vues journalière, hebdomadaire et mensuelle'
    },
    {
      icon: BookOpen,
      title: 'Gestion des Cours',
      description: 'Inscrivez-vous aux cours et accédez aux ressources pédagogiques'
    },
    {
      icon: Video,
      title: 'Visioconférence',
      description: 'Participez aux cours en ligne avec notre système de visioconférence intégré'
    },
    {
      icon: Users,
      title: 'Groupes d\'Études',
      description: 'Collaborez avec vos camarades dans des groupes d\'études'
    },
    {
      icon: Bell,
      title: 'Rappels',
      description: 'Ne manquez jamais un cours avec notre système de notifications'
    },
    {
      icon: FileText,
      title: 'Documents',
      description: 'Accédez à tous vos documents et supports de cours en un seul endroit'
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background avec logo université */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(https://miaoda-conversation-file.s3cdn.medo.dev/user-a6gf1cb6s64g/conv-a6ghkzb1zhfk/20260407/file-asif3ef0yyo0.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      {/* Overlay gradient - très léger pour garder l'image visible */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-background/30 to-transparent z-0" />

      {/* Educational Particles */}
      <div className="absolute inset-0 z-0">
        <EducationalParticles />
      </div>

      {/* Floating Educational Icons */}
      <div className="absolute inset-0 z-0">
        <FloatingEducationalIcons />
      </div>

      {/* Animated decorative elements */}
      <div className="absolute inset-0 z-0">
        <AnimatedBackground />
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 mobile-container py-8 sm:py-12 md:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <div className="flex items-center justify-center mb-4 sm:mb-6">
            <GraduationCap className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000 px-4">
            Campus en Ligne
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto px-4">
            Votre plateforme universitaire complète pour gérer vos cours, emploi du temps et collaborations
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.9 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-4"
        >
          <Button 
            size="lg" 
            className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto touch-target"
            onClick={() => navigate('/login')}
          >
            Se Connecter
            <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto bg-background/50 backdrop-blur-sm touch-target"
            onClick={() => navigate('/login')}
          >
            S'Inscrire
          </Button>
        </motion.div>

        {/* Section Installation PWA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16 sm:mb-20 px-4"
        >
          <Card className="max-w-4xl mx-auto bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 backdrop-blur-sm border-2 border-primary/30 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-primary/20 backdrop-blur-sm">
                  <Smartphone className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                Installez l'Application
              </CardTitle>
              <CardDescription className="text-base sm:text-lg">
                Accédez à Campus en Ligne directement depuis votre écran d'accueil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avantages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Accès Rapide</p>
                    <p className="text-xs text-muted-foreground">Lancez l'app en un clic depuis votre écran d'accueil</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Mode Hors Ligne</p>
                    <p className="text-xs text-muted-foreground">Consultez vos cours même sans Internet</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Notifications</p>
                    <p className="text-xs text-muted-foreground">Recevez des alertes pour vos cours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Expérience Native</p>
                    <p className="text-xs text-muted-foreground">Interface optimisée comme une app mobile</p>
                  </div>
                </div>
              </div>

              {/* Bouton d'installation */}
              <div className="flex flex-col items-center gap-3 pt-4">
                <InstallButton 
                  size="lg" 
                  className="text-base sm:text-lg px-8 py-6 w-full sm:w-auto shadow-lg"
                  showIcon={true}
                  source="landing_page"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Installer Maintenant
                </InstallButton>
                <p className="text-xs text-muted-foreground text-center">
                  ✨ Installation gratuite • Compatible tous appareils • Aucun téléchargement depuis un store
                </p>
              </div>

              {/* Badges stores externes */}
              <div className="flex flex-col items-center gap-2 pt-2">
                <StoresBadges size="md" className="justify-center" />
              </div>

              {/* Info supplémentaire */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
                <Smartphone className="h-4 w-4" />
                <span>Fonctionne sur Android, iOS, Windows, Mac et Linux</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Features - Horizontal Scroll */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-12 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-6 sm:mb-8 text-foreground px-4">
            Fonctionnalités Principales
          </h2>
          <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent px-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : 20 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                className="flex-shrink-0 w-72 sm:w-80 snap-center"
              >
                <Card className="h-full bg-card/80 backdrop-blur-sm border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:scale-105">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <CardTitle className="text-base sm:text-lg">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm sm:text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-xs sm:text-sm text-muted-foreground mt-4 px-4">
            ← Faites défiler pour voir toutes les fonctionnalités →
          </p>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16 px-4"
        >
          <Card className="bg-card/80 backdrop-blur-sm text-center p-4 sm:p-6">
            <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">100%</div>
            <div className="text-sm sm:text-base text-muted-foreground">En Ligne</div>
          </Card>
          <Card className="bg-card/80 backdrop-blur-sm text-center p-4 sm:p-6">
            <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">24/7</div>
            <div className="text-sm sm:text-base text-muted-foreground">Disponible</div>
          </Card>
          <Card className="bg-card/80 backdrop-blur-sm text-center p-4 sm:p-6">
            <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">∞</div>
            <div className="text-sm sm:text-base text-muted-foreground">Possibilités</div>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="text-center text-muted-foreground px-4"
        >
          <p className="text-xs sm:text-sm">
            © 2026 Campus en Ligne. Tous droits réservés.
          </p>
        </motion.div>
      </div>
      
      {/* Bannière d'installation PWA */}
      <PWAInstallBanner />
    </div>
  );
}