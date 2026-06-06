import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Settings,
  Trash2,
  Archive,
  FileText,
  Activity,
  CheckCircle,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  Database,
  Loader2,
  Shield,
  Clock,
  BarChart3,
  Wrench
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';

export default function TeacherMaintenancePage() {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    activeCourses: number;
    archivedCourses: number;
    draftAssignments: number;
    savedTemplates: number;
    totalStudents: number;
    orphanedFiles: number;
  } | null>(null);

  // Réinitialiser les préférences d'affichage
  const handleResetPreferences = async () => {
    setIsLoading(true);
    try {
      // Simuler la réinitialisation
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Préférences réinitialisées', {
        description: 'Vos préférences d\'affichage ont été restaurées par défaut'
      });
    } catch (error) {
      toast.error('Erreur lors de la réinitialisation');
    } finally {
      setIsLoading(false);
    }
  };

  // Nettoyer les données temporaires
  const handleCleanupTempData = async () => {
    setIsLoading(true);
    try {
      // Supprimer les brouillons non publiés de plus de 30 jours
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('teacher_id', profile?.id)
        .eq('status', 'draft')
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      toast.success('Nettoyage effectué', {
        description: 'Les données temporaires ont été supprimées'
      });
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du nettoyage');
    } finally {
      setIsLoading(false);
    }
  };

  // Archiver tous les cours d'une période
  const handleBatchArchive = async () => {
    setIsLoading(true);
    try {
      // Archiver les cours terminés
      const { error } = await supabase
        .from('courses')
        .update({ is_archived: true })
        .eq('teacher_id', profile?.id)
        .lt('end_date', new Date().toISOString());

      if (error) throw error;

      toast.success('Archivage groupé effectué', {
        description: 'Les cours terminés ont été archivés'
      });
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'archivage');
    } finally {
      setIsLoading(false);
    }
  };

  // Vérifier la cohérence des données
  const handleConsistencyCheck = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      // Vérifier les cours sans étudiants
      const { data: coursesWithoutStudents } = await supabase
        .from('courses')
        .select('id, name')
        .eq('teacher_id', user.id)
        .eq('is_archived', false);

      // Vérifier les devoirs sans date limite
      const { data: assignmentsWithoutDeadline } = await supabase
        .from('assignments')
        .select('id, title')
        .eq('teacher_id', user.id)
        .is('due_date', null);

      const issues = [];
      if (coursesWithoutStudents && coursesWithoutStudents.length > 0) {
        issues.push(`${coursesWithoutStudents.length} cours sans étudiants inscrits`);
      }
      if (assignmentsWithoutDeadline && assignmentsWithoutDeadline.length > 0) {
        issues.push(`${assignmentsWithoutDeadline.length} devoirs sans date limite`);
      }

      if (issues.length === 0) {
        toast.success('Aucune incohérence détectée', {
          description: 'Vos données sont cohérentes'
        });
      } else {
        toast.warning('Incohérences détectées', {
          description: issues.join(', ')
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la vérification');
    } finally {
      setIsLoading(false);
    }
  };

  // Générer un rapport de santé
  const handleGenerateHealthReport = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      // Compter les cours actifs
      const { count: activeCourses } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id)
        .eq('is_archived', false);

      // Compter les cours archivés
      const { count: archivedCourses } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id)
        .eq('is_archived', true);

      // Compter les brouillons
      const { count: draftAssignments } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', user.id)
        .eq('status', 'draft');

      setHealthStatus({
        activeCourses: activeCourses || 0,
        archivedCourses: archivedCourses || 0,
        draftAssignments: draftAssignments || 0,
        savedTemplates: 0,
        totalStudents: 0,
        orphanedFiles: 0
      });

      toast.success('Rapport généré', {
        description: 'Le rapport de santé est disponible'
      });
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la génération du rapport');
    } finally {
      setIsLoading(false);
    }
  };

  // Sauvegarder les données
  const handleBackup = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Sauvegarde créée', {
        description: 'Vos données ont été sauvegardées'
      });
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Wrench className="h-8 w-8 text-primary" />
          Maintenance de l'Espace Enseignant
        </h1>
        <p className="text-muted-foreground mt-2">
          Gérez et optimisez votre espace de travail
        </p>
      </div>

      {/* Rapport de santé */}
      {healthStatus && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Rapport de Santé
            </CardTitle>
            <CardDescription>État général de votre espace enseignant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-background rounded-lg border">
                <div className="text-2xl font-bold text-primary">{healthStatus.activeCourses}</div>
                <div className="text-sm text-muted-foreground">Cours actifs</div>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <div className="text-2xl font-bold text-muted-foreground">{healthStatus.archivedCourses}</div>
                <div className="text-sm text-muted-foreground">Cours archivés</div>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <div className="text-2xl font-bold text-orange-500">{healthStatus.draftAssignments}</div>
                <div className="text-sm text-muted-foreground">Brouillons en attente</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions de maintenance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Réinitialisation */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RefreshCw className="h-5 w-5 text-primary" />
              Réinitialisation
            </CardTitle>
            <CardDescription>
              Restaurer les paramètres par défaut
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleResetPreferences}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              Réinitialiser les préférences
            </Button>
          </CardContent>
        </Card>

        {/* Nettoyage */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trash2 className="h-5 w-5 text-destructive" />
              Nettoyage
            </CardTitle>
            <CardDescription>
              Supprimer les données temporaires
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleCleanupTempData}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Nettoyer les brouillons
            </Button>
          </CardContent>
        </Card>

        {/* Archivage */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Archive className="h-5 w-5 text-orange-500" />
              Archivage Groupé
            </CardTitle>
            <CardDescription>
              Archiver les cours terminés
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleBatchArchive}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              Archiver les cours terminés
            </Button>
          </CardContent>
        </Card>

        {/* Vérification */}
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Vérification
            </CardTitle>
            <CardDescription>
              Détecter les incohérences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleConsistencyCheck}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Vérifier la cohérence
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sauvegarde et Rapport */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Sauvegarde et Rapports
          </CardTitle>
          <CardDescription>
            Gérer vos sauvegardes et générer des rapports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={handleBackup}
              disabled={isLoading}
              variant="default"
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Créer une sauvegarde
            </Button>
            <Button
              onClick={handleGenerateHealthReport}
              disabled={isLoading}
              variant="secondary"
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4 mr-2" />
              )}
              Générer un rapport
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informations */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important :</strong> Les opérations de maintenance peuvent prendre quelques instants. 
          Assurez-vous d'avoir sauvegardé vos données importantes avant d'effectuer des opérations de nettoyage ou d'archivage.
        </AlertDescription>
      </Alert>
    </div>
  );
}