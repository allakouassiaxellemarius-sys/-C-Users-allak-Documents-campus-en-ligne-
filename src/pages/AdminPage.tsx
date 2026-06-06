import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { Profile, Group } from '@/types/index';
import { cn } from '@/lib/utils';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Shield, 
  Users, 
  Mail, 
  AlertTriangle,
  MoreVertical,
  GraduationCap,
  Send,
  Loader2,
  CheckCircle,
  Megaphone,
  BookOpen,
  FileText,
  MessageSquare,
  Trash2,
  Video
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useNavigate, Link } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  Database, 
  History, 
  Activity, 
  Lock, 
  Unlock,
  Package,
  Calendar,
  Settings,
  Store,
  Save
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export default function AdminPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    courses: 0,
    materials: 0,
    groups: 0,
    suggestions: 0,
    users: 0
  });
  
  const [recentSuggestions, setRecentSuggestions] = useState<any[]>([]);
  const [recentMaterials, setRecentMaterials] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [allResources, setAllResources] = useState<{ courses: any[], materials: any[] }>({ courses: [], materials: [] });
  
  // Announcement state
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const [announcementSubject, setAnnouncementSubject] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });

  // User Edit State
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editProfession, setEditProfession] = useState('');
  const [editUniversity, setEditUniversity] = useState('');

  // Delete User State
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [siteSettings, setSiteSettings] = useState<any>({
    maintenance_mode: false,
    registration_enabled: true
  });

  // Store URLs state
  const [googlePlayUrl, setGooglePlayUrl] = useState('');
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [isSavingStoreUrls, setIsSavingStoreUrls] = useState(false);

  // Updates & Evolution state
  const [siteUpdates, setSiteUpdates] = useState<any[]>([]);
  const [newUpdate, setNewUpdate] = useState({ version: '', title: '', description: '', is_major: false, changes: '' });
  const [isCreatingUpdate, setIsCreatingUpdate] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadData();
      
      // Configurer les abonnements Realtime pour synchroniser les modifications
      const profilesChannel = supabase
        .channel('admin-profiles-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles'
          },
          (payload) => {
            console.log('Profile change detected:', payload);
            // Recharger les données utilisateurs
            api.profiles.listAll(100).then(setUsers).catch(console.error);
            toast.info('Profil utilisateur mis à jour', { duration: 2000 });
          }
        )
        .subscribe();

      const coursesChannel = supabase
        .channel('admin-courses-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'courses'
          },
          (payload) => {
            console.log('Course change detected:', payload);
            // Recharger les statistiques
            api.admin.getStats().then(setStats).catch(console.error);
            toast.info('Cours mis à jour', { duration: 2000 });
          }
        )
        .subscribe();

      const groupsChannel = supabase
        .channel('admin-groups-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'groups'
          },
          (payload) => {
            console.log('Group change detected:', payload);
            // Recharger les groupes
            api.groups.list().then(setAllGroups).catch(console.error);
            toast.info('Groupe mis à jour', { duration: 2000 });
          }
        )
        .subscribe();

      const announcementsChannel = supabase
        .channel('admin-announcements-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'announcements'
          },
          (payload) => {
            console.log('New announcement detected:', payload);
            toast.success('Nouvelle annonce publiée', { duration: 3000 });
          }
        )
        .subscribe();

      // Nettoyer les abonnements lors du démontage
      return () => {
        supabase.removeChannel(profilesChannel);
        supabase.removeChannel(coursesChannel);
        supabase.removeChannel(groupsChannel);
        supabase.removeChannel(announcementsChannel);
      };
    }
  }, [profile]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [
        usersData, 
        statsData, 
        suggestionsData, 
        materialsData, 
        groupsData, 
        settingsData,
        logsData,
        resourcesData,
        updatesData
      ] = await Promise.all([
        api.profiles.listAll(100),
        api.admin.getStats(),
        api.suggestions.list(),
        api.materials.list(),
        api.groups.list(),
        api.admin.getSettings(),
        api.admin.getSystemLogs(20),
        api.admin.getAllResources(),
        api.updates.list()
      ]);

      setUsers(usersData);
      setStats(statsData);
      setRecentSuggestions(suggestionsData);
      setRecentMaterials(materialsData);
      setAllGroups(groupsData);
      setLogs(logsData || []);
      setAllResources(resourcesData);
      setSiteUpdates(updatesData || []);
      if (settingsData) {
        setSiteSettings(settingsData);
        setGooglePlayUrl(typeof settingsData.google_play_url === 'string' ? settingsData.google_play_url : '');
        setAppStoreUrl(typeof settingsData.app_store_url === 'string' ? settingsData.app_store_url : '');
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUpdate = async () => {
    if (!newUpdate.version || !newUpdate.title || !newUpdate.description) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    try {
      setIsCreatingUpdate(true);
      const changesArray = newUpdate.changes.split('\n').filter(c => c.trim());
      await api.updates.create({
        ...newUpdate,
        changes: changesArray
      });
      toast.success("Mise à jour ajoutée à l'évolution");
      setNewUpdate({ version: '', title: '', description: '', is_major: false, changes: '' });
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la création de la mise à jour');
    } finally {
      setIsCreatingUpdate(false);
    }
  };

  const updateUserRole = async (userId: string, role: Profile['role']) => {
    try {
      await api.profiles.update(userId, { role });
      toast.success(`Rôle mis à jour: ${role}`);
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du rôle');
    }
  };

  const updateUserProfile = async (userId: string, updates: Partial<Profile>) => {
    try {
      await api.admin.updateProfileAdmin(userId, updates);
      toast.success('Profil utilisateur mis à jour');
      setEditingUser(null);
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du profil');
    }
  };

  const openEditDialog = (u: Profile) => {
    setEditingUser(u);
    setEditUsername(u.username || '');
    setEditProfession(u.profession || '');
    setEditUniversity(u.university || '');
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await api.admin.deleteUser(userToDelete.id);
      toast.success(`Utilisateur ${userToDelete.username || userToDelete.email} supprimé`);
      setUserToDelete(null);
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la suppression de l\'utilisateur');
    }
  };

  const toggleSetting = async (key: string) => {
    try {
      const newValue = !siteSettings[key];
      await api.admin.updateSetting(key, newValue);
      setSiteSettings({ ...siteSettings, [key]: newValue });
      toast.success('Paramètre mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du paramètre');
    }
  };

  const saveStoreUrls = async () => {
    try {
      setIsSavingStoreUrls(true);
      await Promise.all([
        api.admin.updateSetting('google_play_url', googlePlayUrl.trim()),
        api.admin.updateSetting('app_store_url', appStoreUrl.trim())
      ]);
      toast.success('URLs des stores enregistrées');
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement des URLs");
    } finally {
      setIsSavingStoreUrls(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementSubject || !announcementBody) {
      toast.error('Veuillez remplir le sujet et le message');
      return;
    }

    const usersWithEmail = users.filter(u => u.email);
    if (usersWithEmail.length === 0) {
      toast.error('Aucun utilisateur avec email trouvé');
      return;
    }

    try {
      setIsSending(true);
      setSendProgress({ current: 0, total: usersWithEmail.length });
      
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < usersWithEmail.length; i++) {
        const u = usersWithEmail[i];
        try {
          const { error } = await supabase.functions.invoke('send-email', {
            body: {
              to: u.email,
              subject: announcementSubject,
              body: announcementBody
            }
          });
          if (error) throw error;
          successCount++;
        } catch (err) {
          console.error(`Failed to send to ${u.email}:`, err);
          failCount++;
        }
        setSendProgress({ current: i + 1, total: usersWithEmail.length });
      }

      toast.success(`Annonce envoyée: ${successCount} succès, ${failCount} échecs.`);
      setIsAnnouncementOpen(false);
      setAnnouncementSubject('');
      setAnnouncementBody('');
    } catch (error) {
      toast.error('Une erreur est survenue lors de l\'envoi');
    } finally {
      setIsSending(false);
      setSendProgress({ current: 0, total: 0 });
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-4">
        <div className="p-6 bg-red-100 dark:bg-red-900/20 rounded-full">
          <AlertTriangle className="h-12 w-12 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold">Accès Refusé</h1>
        <p className="text-muted-foreground max-w-md">
          Désolé, cette page est réservée aux administrateurs du site.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Administration du Site
          </h1>
          <p className="text-muted-foreground mt-1">
            Tableau de bord de gestion global pour {profile.username || 'l\'administrateur'}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isAnnouncementOpen} onOpenChange={setIsAnnouncementOpen}>
            <DialogTrigger asChild>
              <Button className="font-bold shadow-lg">
                <Megaphone className="mr-2 h-4 w-4" /> Envoyer Annonce
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Envoyer une annonce générale</DialogTitle>
                <DialogDescription>
                  Ce message sera envoyé à tous les {users.length} utilisateurs enregistrés.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Sujet de l'e-mail</Label>
                  <Input 
                    placeholder="Annonce importante..." 
                    value={announcementSubject}
                    onChange={(e) => setAnnouncementSubject(e.target.value)}
                    disabled={isSending}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea 
                    placeholder="Cher utilisateur, ..." 
                    value={announcementBody}
                    onChange={(e) => setAnnouncementBody(e.target.value)}
                    className="min-h-[200px]"
                    disabled={isSending}
                  />
                </div>
                
                {isSending && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                       <span>Envoi en cours...</span>
                       <span>{sendProgress.current} / {sendProgress.total}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                       <div 
                         className="bg-primary h-full transition-all duration-300" 
                         style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }}
                       />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAnnouncementOpen(false)} disabled={isSending}>Annuler</Button>
                <Button onClick={handleSendAnnouncement} disabled={isSending || !announcementSubject || !announcementBody} className="font-bold">
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Envoyer à tous
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Utilisateurs Totaux
              <Users className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.users}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">Membres inscrits</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Cours Actifs
              <BookOpen className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.courses}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">Planifications</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Groupes d'Étude
              <Users className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{stats.groups}</div>
            <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">Communautés actives</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-bold">
              <Activity className="h-5 w-5 text-primary" />
              Répartition des Ressources
            </CardTitle>
            <CardDescription>Visualisation de la distribution des données sur la plateforme.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Cours', count: stats.courses },
                { name: 'Supports', count: stats.materials },
                { name: 'Groupes', count: stats.groups },
                { name: 'Idées', count: stats.suggestions },
                { name: 'Users', count: stats.users },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: 'hsl(var(--muted)/0.3)'}}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }} 
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {[
                    'hsl(var(--primary))', 
                    'hsl(var(--primary)/0.8)', 
                    'hsl(var(--primary)/0.6)', 
                    'hsl(var(--primary)/0.4)',
                    'hsl(var(--primary)/0.2)'
                  ].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 font-bold">
              <Shield className="h-5 w-5 text-primary" />
              Santé du Système
            </CardTitle>
            <CardDescription>Indicateurs de charge et de santé.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium italic">Capacité Utilisateurs</span>
                <span className="font-bold">{Math.round((stats.users / 1000) * 100)}%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000" 
                  style={{ width: `${Math.min((stats.users / 1000) * 100, 100)}%` }} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium italic">Ressources / Stockage</span>
                <span className="font-bold text-emerald-500">Normal</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000" 
                  style={{ width: '45%' }} 
                />
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-primary/5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider">Base de données</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-500 bg-emerald-500/10 border-emerald-500/20">OK</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-primary/5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider">Serveurs Authentification</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-500 bg-emerald-500/10 border-emerald-500/20">OK</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 border rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger value="users" className="rounded-lg flex-1 min-w-[100px]"><Users className="h-4 w-4 mr-2" /> Utilisateurs</TabsTrigger>
          <TabsTrigger value="resources" className="rounded-lg flex-1 min-w-[100px]"><Package className="h-4 w-4 mr-2" /> Ressources</TabsTrigger>
          <TabsTrigger value="content" className="rounded-lg flex-1 min-w-[100px]"><FileText className="h-4 w-4 mr-2" /> Modération</TabsTrigger>
          <TabsTrigger value="videorooms" className="rounded-lg flex-1 min-w-[100px]"><Video className="h-4 w-4 mr-2" /> Visioconférence</TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg flex-1 min-w-[100px]"><History className="h-4 w-4 mr-2" /> Journaux</TabsTrigger>
          <TabsTrigger value="updates" className="rounded-lg flex-1 min-w-[100px]"><Package className="h-4 w-4 mr-2" /> Évolution</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg flex-1 min-w-[100px]"><Shield className="h-4 w-4 mr-2" /> Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card className="shadow-lg border-primary/10">
            <CardHeader>
              <CardTitle>Gestion des Utilisateurs</CardTitle>
              <CardDescription>Gérez les comptes, les rôles et les accès.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full bg-muted" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[80px]">Avatar</TableHead>
                        <TableHead>Identité</TableHead>
                        <TableHead>Infos</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell>
                            <Avatar className="h-10 w-10 border shadow-sm">
                              <AvatarImage src={u.avatar_url} />
                              <AvatarFallback>{(u.username || u.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm">{u.username || 'Sans pseudo'}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {u.email || 'Aucun'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="w-fit text-[10px]">{u.profession || 'Non défini'}</Badge>
                              <span className="text-xs text-muted-foreground">{u.university || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={u.role === 'admin' ? 'default' : u.role === 'teacher' ? 'outline' : 'secondary'} 
                              className={u.role === 'teacher' ? 'border-primary text-primary bg-primary/5 capitalize' : 'capitalize'}
                            >
                              {u.role === 'admin' ? 'Admin' : u.role === 'teacher' ? 'Prof' : 'Étudiant'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Actif
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => navigate(`/profile/${u.id}`)}>
                                  <Users className="mr-2 h-4 w-4" /> Voir Profil
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(u)}>
                                  <Settings className="mr-2 h-4 w-4" /> Modifier Infos
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => updateUserRole(u.id, 'user')}>
                                  <Users className="mr-2 h-4 w-4" /> Mettre Étudiant
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateUserRole(u.id, 'teacher')}>
                                  <GraduationCap className="mr-2 h-4 w-4" /> Mettre Enseignant
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateUserRole(u.id, 'admin')}>
                                  <Shield className="mr-2 h-4 w-4" /> Mettre Admin
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => setUserToDelete(u)}
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="videorooms" className="space-y-6">
          <Card className="shadow-lg border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-6 w-6 text-primary" />
                Salles de Visioconférence
              </CardTitle>
              <CardDescription>
                Gérez les salles de visioconférence permanentes associées aux cours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allResources.courses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucun cours avec visioconférence disponible</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allResources.courses
                      .filter((course: any) => course.video_room_enabled && course.video_room_name)
                      .map((course: any) => (
                        <Card key={course.id} className="border-l-4 border-l-primary/50">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <Video className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm truncate">{course.name}</h4>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {course.professor || 'Enseignant'}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="space-y-1 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px]">
                                      {course.type}
                                    </Badge>
                                    {course.room && (
                                      <span className="text-[10px]">Salle: {course.room}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 font-mono text-[10px] bg-muted/50 p-2 rounded">
                                    <span className="truncate">{course.video_room_name}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <Button
                                size="sm"
                                onClick={() => window.open(`/videoconference?room=${course.video_room_name}`, '_blank')}
                                className="gap-2 shrink-0"
                              >
                                <Video className="h-3 w-3" />
                                Ouvrir
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
                
                {allResources.courses.filter((c: any) => c.video_room_enabled && c.video_room_name).length > 0 && (
                  <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      Statistiques
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {allResources.courses.filter((c: any) => c.video_room_enabled).length}
                        </p>
                        <p className="text-xs text-muted-foreground">Salles actives</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">
                          {allResources.courses.length}
                        </p>
                        <p className="text-xs text-muted-foreground">Total cours</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-600">
                          {Math.round((allResources.courses.filter((c: any) => c.video_room_enabled).length / Math.max(allResources.courses.length, 1)) * 100)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Taux activation</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          {new Set(allResources.courses.filter((c: any) => c.video_room_enabled).map((c: any) => c.user_id)).size}
                        </p>
                        <p className="text-xs text-muted-foreground">Enseignants</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-amber-500" />
                  Suggestions Récentes
                </CardTitle>
                <CardDescription>Gérez les retours de la communauté</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentSuggestions.slice(0, 5).map(s => (
                  <div key={s.id} className="p-3 border rounded-lg space-y-2 hover:bg-muted/30 transition-all group">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium line-clamp-2">{s.content}</p>
                      <Badge variant={s.status === 'pending' ? 'outline' : 'secondary'}>{s.status}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>Par: {s.profiles?.username || s.profiles?.email?.split('@')[0]}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => api.suggestions.updateStatus(s.id, 'reviewed').then(() => loadData())}>
                           <CheckCircle className="h-3 w-3" />
                         </Button>
                         <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => supabase.from('suggestions').delete().eq('id', s.id).then(() => loadData())}>
                           <Trash2 className="h-3 w-3" />
                         </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full text-xs" asChild>
                  <Link to="/suggestions">Voir toutes les suggestions</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Derniers Supports
                </CardTitle>
                <CardDescription>Surveillez les documents partagés par les profs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentMaterials.slice(0, 5).map(m => (
                  <div key={m.id} className="p-3 border rounded-lg space-y-2 hover:bg-muted/30 transition-all group">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-bold">{m.title}</p>
                      <Badge variant="outline">{m.content_type}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                       <span>Prof: {m.profiles?.username || m.profiles?.email?.split('@')[0]}</span>
                       <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => api.materials.delete(m.id).then(() => loadData())}>
                          <Trash2 className="h-3 w-3" />
                       </Button>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full text-xs" asChild>
                  <Link to="/materials">Voir tous les supports</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <Card className="shadow-lg border-primary/10">
            <CardHeader>
              <CardTitle>Gestion des Groupes</CardTitle>
              <CardDescription>Visualisez et modérez les groupes d'étude.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Nom du Groupe</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Membres</TableHead>
                      <TableHead>Visibilité</TableHead>
                      <TableHead>Créé le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allGroups.length > 0 ? allGroups.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-bold">{g.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{g.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-medium">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {g.members_count || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                           {g.is_private ? (
                             <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Privé</Badge>
                           ) : (
                             <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Public</Badge>
                           )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(g.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => {
                            if (confirm('Voulez-vous vraiment supprimer ce groupe ?')) {
                               supabase.from('groups').delete().eq('id', g.id).then(() => loadData());
                            }
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">Aucun groupe trouvé.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="resources" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-lg border-primary/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Cours Planifiés</CardTitle>
                  <CardDescription>Visualisez tous les cours programmés sur le site.</CardDescription>
                </div>
                <Badge variant="outline">{allResources.courses.length} cours</Badge>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cours</TableHead>
                      <TableHead>Professeur</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allResources.courses.map((course: any) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.name}</TableCell>
                        <TableCell className="text-xs">{course.teacher?.username || course.teacher?.email || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive h-8 w-8"
                            onClick={async () => {
                              if (confirm('Supprimer ce cours ?')) {
                                await api.admin.deleteCourse(course.id);
                                loadData();
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {allResources.courses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground italic">Aucun cours trouvé</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-primary/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Supports de Cours</CardTitle>
                  <CardDescription>Gérez les fichiers et documents déposés.</CardDescription>
                </div>
                <Badge variant="outline">{allResources.materials.length} fichiers</Badge>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Auteur</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allResources.materials.map((mat: any) => (
                      <TableRow key={mat.id}>
                        <TableCell className="font-medium text-xs truncate max-w-[150px]">{mat.title}</TableCell>
                        <TableCell className="text-[10px]">{mat.teacher?.username || mat.teacher?.email || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive h-8 w-8"
                            onClick={async () => {
                              if (confirm('Supprimer ce support ?')) {
                                await api.admin.deleteMaterial(mat.id);
                                loadData();
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {allResources.materials.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground italic">Aucun support trouvé</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card className="shadow-lg border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Journaux Système
                </CardTitle>
                <CardDescription>Les 20 actions les plus récentes sur la plateforme.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
                <Activity className="h-3.5 w-3.5" /> Actualiser
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[180px]">Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Acteur</TableHead>
                      <TableHead className="text-right">Sévérité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: any) => (
                      <TableRow key={log.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{log.action}</TableCell>
                        <TableCell className="text-xs">
                          {log.actor?.username || log.actor?.email || 'Système'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] capitalize",
                              log.severity === 'error' && "border-red-500 text-red-500 bg-red-500/5",
                              log.severity === 'warning' && "border-amber-500 text-amber-500 bg-amber-500/5",
                              log.severity === 'info' && "border-blue-500 text-blue-500 bg-blue-500/5"
                            )}
                          >
                            {log.severity}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                          <div className="flex flex-col items-center gap-2">
                            <Database className="h-8 w-8 opacity-20" />
                            <span>Aucun journal disponible pour le moment</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 shadow-lg border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Nouvelle Version
                </CardTitle>
                <CardDescription>Ajoutez une étape à l'évolution du site.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Version (ex: 1.3.0)</Label>
                  <Input value={newUpdate.version} onChange={e => setNewUpdate({...newUpdate, version: e.target.value})} placeholder="1.3.0" />
                </div>
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input value={newUpdate.title} onChange={e => setNewUpdate({...newUpdate, title: e.target.value})} placeholder="Mise à jour majeure" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={newUpdate.description} onChange={e => setNewUpdate({...newUpdate, description: e.target.value})} placeholder="Brève description..." />
                </div>
                <div className="space-y-2">
                  <Label>Changements (un par ligne)</Label>
                  <Textarea value={newUpdate.changes} onChange={e => setNewUpdate({...newUpdate, changes: e.target.value})} placeholder="Changement 1\nChangement 2..." className="h-32" />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="major" checked={newUpdate.is_major} onCheckedChange={(checked: boolean) => setNewUpdate({...newUpdate, is_major: !!checked})} />
                  <Label htmlFor="major" className="text-sm font-medium leading-none cursor-pointer">Version Majeure (Étoile)</Label>
                </div>
                <Button className="w-full" onClick={handleCreateUpdate} disabled={isCreatingUpdate}>
                  {isCreatingUpdate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
                  Publier la mise à jour
                </Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 shadow-lg border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Historique de l'Évolution
                </CardTitle>
                <CardDescription>Visualisez le journal des modifications public.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {siteUpdates.map((u) => (
                    <div key={u.id} className="p-4 border rounded-xl flex items-center justify-between group hover:bg-muted/30 transition-all">
                      <div className="flex items-center gap-4">
                        <Badge variant={u.is_major ? 'default' : 'outline'} className="font-bold">v{u.version}</Badge>
                        <div>
                          <p className="font-bold">{u.title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={async () => {
                        await supabase.from('site_updates').delete().eq('id', u.id);
                        loadData();
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres du Site</CardTitle>
              <CardDescription>Configuration globale de l'application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-bold italic">Inscriptions</h4>
                  <p className="text-sm text-muted-foreground italic">Autoriser de nouveaux utilisateurs à s'inscrire</p>
                </div>
                <Button 
                  variant={siteSettings.registration_enabled ? "default" : "outline"}
                  onClick={() => toggleSetting('registration_enabled')}
                >
                  {siteSettings.registration_enabled ? 'Activé' : 'Désactivé'}
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-bold italic">Mode Maintenance</h4>
                  <p className="text-sm text-muted-foreground italic">Mettre le site en maintenance (accès admin uniquement)</p>
                </div>
                <Button 
                  variant={siteSettings.maintenance_mode ? "destructive" : "outline"}
                  onClick={() => toggleSetting('maintenance_mode')}
                >
                  {siteSettings.maintenance_mode ? 'Activé' : 'Désactivé'}
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Shield className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-bold">Inscription Administrateur</h4>
                    <p className="text-sm text-muted-foreground italic">Verrouiller la création de nouveaux comptes administrateurs</p>
                  </div>
                </div>
                <Button 
                  variant={siteSettings.admin_registration_enabled === false ? "destructive" : "default"}
                  onClick={() => toggleSetting('admin_registration_enabled')}
                  className="gap-2"
                >
                  {siteSettings.admin_registration_enabled === false ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  {siteSettings.admin_registration_enabled === false ? 'Verrouillé' : 'Ouvert'}
                </Button>
              </div>

              <div className="flex flex-col gap-4 p-4 border rounded-lg bg-primary/5">
                <div>
                  <h4 className="font-bold flex items-center gap-2 text-primary">
                    <Store className="h-4 w-4" />
                    Liens des Stores
                  </h4>
                  <p className="text-xs text-muted-foreground italic mt-1">
                    Renseignez les URLs de l'application sur les stores officiels. Les badges apparaîtront automatiquement sur la page d'accueil et les paramètres.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="google-play-url" className="text-xs font-medium">
                      Google Play Store
                    </Label>
                    <Input
                      id="google-play-url"
                      placeholder="https://play.google.com/store/apps/details?id=..."
                      value={googlePlayUrl}
                      onChange={(e) => setGooglePlayUrl(e.target.value)}
                      className="bg-background font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="app-store-url" className="text-xs font-medium">
                      Apple App Store
                    </Label>
                    <Input
                      id="app-store-url"
                      placeholder="https://apps.apple.com/app/..."
                      value={appStoreUrl}
                      onChange={(e) => setAppStoreUrl(e.target.value)}
                      className="bg-background font-mono text-sm"
                    />
                  </div>
                  <Button
                    variant="default"
                    className="w-full gap-2"
                    onClick={saveStoreUrls}
                    disabled={isSavingStoreUrls}
                  >
                    {isSavingStoreUrls
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</>
                      : <><Save className="h-4 w-4" /> Enregistrer les URLs</>
                    }
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-4 p-4 border rounded-lg bg-primary/5">
                <div>
                  <h4 className="font-bold flex items-center gap-2 text-primary">
                    <Megaphone className="h-4 w-4" />
                    Notification Globale
                  </h4>
                  <p className="text-xs text-muted-foreground italic mt-1">
                    Envoyez une notification Push à TOUS les utilisateurs inscrits simultanément.
                  </p>
                </div>
                <div className="space-y-3">
                  <Input 
                    placeholder="Sujet de l'annonce..." 
                    id="push-title"
                    className="bg-background"
                  />
                  <Textarea 
                    placeholder="Message détaillé pour tous les utilisateurs..." 
                    id="push-message"
                    rows={2}
                    className="bg-background"
                  />
                  <Button 
                    variant="default" 
                    className="w-full font-bold shadow-lg shadow-primary/20"
                    onClick={async () => {
                      const title = (document.getElementById('push-title') as HTMLInputElement).value;
                      const message = (document.getElementById('push-message') as HTMLTextAreaElement).value;
                      if (!title || !message) return toast.error('Sujet et Message requis');
                      
                      try {
                        await api.admin.pushGlobalNotification(title, message, 'success');
                        toast.success('Notification poussée à tous les utilisateurs !');
                        (document.getElementById('push-title') as HTMLInputElement).value = '';
                        (document.getElementById('push-message') as HTMLTextAreaElement).value = '';
                      } catch (err) {
                        toast.error('Erreur lors du déploiement global');
                      }
                    }}
                  >
                    Déployer la Mise à Jour Globale 🚀
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Modifier l'utilisateur
            </DialogTitle>
            <DialogDescription>
              Modifiez les informations de {editingUser?.username || editingUser?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right text-xs">Pseudo</Label>
              <Input id="username" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="profession" className="text-right text-xs">Profession</Label>
              <Input id="profession" value={editProfession} onChange={(e) => setEditProfession(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="university" className="text-right text-xs">Université</Label>
              <Input id="university" value={editUniversity} onChange={(e) => setEditUniversity(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Annuler</Button>
            <Button onClick={() => editingUser && updateUserProfile(editingUser.id, { username: editUsername, profession: editProfession, university: editUniversity })}>
              Enregistrer les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Supprimer l'utilisateur ?
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. L'utilisateur <strong>{userToDelete?.email}</strong> sera définitivement supprimé ainsi que toutes ses données associées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Confirmer la suppression</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}