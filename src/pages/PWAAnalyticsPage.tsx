import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Download,
  TrendingUp,
  Users,
  MousePointerClick,
  Clock,
  Smartphone,
  Globe,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { api } from '@/db/api';
import { SimpleBarChart, SimplePieChart, SimpleLineChart } from '@/components/ui/simple-charts';
import { toast } from 'sonner';

interface GlobalStats {
  totalInstalls: number;
  totalClicks: number;
  totalViews: number;
  avgTimeToInstall: number;
  conversionRate: number;
}

export default function PWAAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [installsByPlatform, setInstallsByPlatform] = useState<any[]>([]);
  const [installsBySource, setInstallsBySource] = useState<any[]>([]);
  const [dailySummary, setDailySummary] = useState<any[]>([]);
  const [userJourneys, setUserJourneys] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Charger toutes les données en parallèle
      const [stats, platforms, sources, summary, journeys] = await Promise.all([
        api.pwaAnalytics.getGlobalStats(),
        api.pwaAnalytics.getInstallsByPlatform(selectedPeriod),
        api.pwaAnalytics.getInstallsBySource(selectedPeriod),
        api.pwaAnalytics.getDailySummary(selectedPeriod),
        api.pwaAnalytics.getUserJourneys(50)
      ]);

      setGlobalStats(stats);
      setInstallsByPlatform(platforms);
      setInstallsBySource(sources);
      setDailySummary(summary);
      setUserJourneys(journeys);
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.pwaAnalytics.updateDailySummary();
      await loadAnalytics();
      toast.success('Statistiques mises à jour');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setRefreshing(false);
    }
  };

  // Préparer les données pour les graphiques
  const platformChartData = Object.entries(
    installsByPlatform.reduce((acc: any, item) => {
      acc[item.platform] = (acc[item.platform] || 0) + 1;
      return acc;
    }, {})
  ).map(([label, value]) => ({ label, value: value as number }));

  const sourceChartData = Object.entries(
    installsBySource.reduce((acc: any, item) => {
      const source = item.install_source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {})
  ).map(([label, value]) => ({
    label: label === 'landing_page' ? 'Page d\'accueil' :
           label === 'header' ? 'En-tête' :
           label === 'sidebar' ? 'Menu latéral' :
           label === 'banner' ? 'Bannière' :
           label === 'settings' ? 'Paramètres' : 'Inconnu',
    value: value as number
  }));

  const dailyInstallsData = dailySummary.map(day => ({
    label: new Date(day.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    value: day.total_installs || 0
  }));

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Analytics PWA
          </h1>
          <p className="text-muted-foreground mt-1">
            Statistiques d'installation et parcours utilisateur
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Sélecteur de période */}
      <div className="flex gap-2">
        {[7, 30, 90].map(days => (
          <Button
            key={days}
            variant={selectedPeriod === days ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod(days as 7 | 30 | 90)}
          >
            {days} jours
          </Button>
        ))}
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Installations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-500" />
              <span className="text-3xl font-bold">{globalStats?.totalInstalls || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MousePointerClick className="h-5 w-5 text-blue-500" />
              <span className="text-3xl font-bold">{globalStats?.totalClicks || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <span className="text-3xl font-bold">{globalStats?.totalViews || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux de Conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <span className="text-3xl font-bold">
                {globalStats?.conversionRate.toFixed(1) || 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Temps Moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-cyan-500" />
              <span className="text-3xl font-bold">
                {formatTime(globalStats?.avgTimeToInstall || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <Tabs defaultValue="platforms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="platforms">
            <Smartphone className="h-4 w-4 mr-2" />
            Plateformes
          </TabsTrigger>
          <TabsTrigger value="sources">
            <Globe className="h-4 w-4 mr-2" />
            Sources
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <TrendingUp className="h-4 w-4 mr-2" />
            Évolution
          </TabsTrigger>
          <TabsTrigger value="journeys">
            <Users className="h-4 w-4 mr-2" />
            Parcours
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Installations par Plateforme</CardTitle>
                <CardDescription>
                  Répartition des installations par système d'exploitation et navigateur
                </CardDescription>
              </CardHeader>
              <CardContent>
                {platformChartData.length > 0 ? (
                  <SimpleBarChart data={platformChartData} />
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Aucune installation enregistrée
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribution des Plateformes</CardTitle>
                <CardDescription>
                  Vue d'ensemble de la répartition
                </CardDescription>
              </CardHeader>
              <CardContent>
                {platformChartData.length > 0 ? (
                  <SimplePieChart data={platformChartData} />
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Aucune donnée disponible
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Installations par Source</CardTitle>
              <CardDescription>
                D'où viennent les installations (page d'accueil, header, sidebar, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sourceChartData.length > 0 ? (
                <SimpleBarChart data={sourceChartData} />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Aucune installation enregistrée
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Évolution des Installations</CardTitle>
              <CardDescription>
                Nombre d'installations par jour sur les {selectedPeriod} derniers jours
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dailyInstallsData.length > 0 ? (
                <SimpleLineChart data={dailyInstallsData} height={300} />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Aucune donnée disponible
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journeys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parcours Utilisateur</CardTitle>
              <CardDescription>
                Derniers parcours d'installation ({userJourneys.length} sessions)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userJourneys.length > 0 ? (
                  userJourneys.slice(0, 10).map((journey, index) => (
                    <div
                      key={journey.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={journey.install_completed ? 'default' : 'secondary'}>
                            {journey.install_completed ? 'Installé' : 'En cours'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {journey.platform || 'Plateforme inconnue'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>👁️ {journey.install_button_views || 0} vues</span>
                          <span>🖱️ {journey.install_button_clicks || 0} clics</span>
                          <span>📄 {journey.pages_visited?.length || 0} pages</span>
                          {journey.time_to_install_seconds && (
                            <span>⏱️ {formatTime(journey.time_to_install_seconds)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(journey.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Aucun parcours enregistré
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}