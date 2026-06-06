import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, Mail, Shield, Calendar, LogOut, Trash2, Camera, Loader2, Moon, Bell, 
  GraduationCap, BookOpen, Phone, Info, Save, Settings, ArrowLeft, FolderOpen, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types/index';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, profile: currentProfile, signOut, deleteAccount, refreshProfile, updateProfile } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');
  const [university, setUniversity] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [officeLocation, setOfficeLocation] = useState('');
  const [officeHours, setOfficeHours] = useState('');
  const [academicTitle, setAcademicTitle] = useState('');
  const [emails, setEmails] = useState<any[]>([]);

  useEffect(() => {
    const targetId = userId || currentUser?.id;
    if (targetId) {
      loadProfile(targetId);
      loadEmails(targetId);
      setIsOwnProfile(targetId === currentUser?.id);

      // Abonnement Realtime pour synchroniser les modifications de profil
      const profileChannel = supabase
        .channel(`profile-${targetId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${targetId}`
          },
          (payload) => {
            console.log('Profile updated:', payload);
            const updatedProfile = payload.new as Profile;
            setProfile(updatedProfile);
            setUsername(updatedProfile.username || '');
            setProfession(updatedProfile.profession || '');
            setBio(updatedProfile.bio || '');
            setUniversity(updatedProfile.university || '');
            setPhone(updatedProfile.phone || '');
            setDepartment(updatedProfile.department || '');
            setSpecialization(updatedProfile.specialization || '');
            setOfficeLocation(updatedProfile.office_location || '');
            setOfficeHours(updatedProfile.office_hours || '');
            setAcademicTitle(updatedProfile.academic_title || '');
            
            // Afficher une notification si c'est une modification externe
            if (!isOwnProfile || targetId !== currentUser?.id) {
              toast.info('Profil mis à jour par un administrateur', { duration: 3000 });
            }
          }
        )
        .subscribe();

      // Nettoyer l'abonnement lors du démontage
      return () => {
        supabase.removeChannel(profileChannel);
      };
    }
  }, [userId, currentUser, isOwnProfile]);

  const loadEmails = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Failed to load emails:', error);
    }
  };

  const loadProfile = async (id: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data) {
        setProfile(data as Profile);
        setUsername(data.username || '');
        setProfession(data.profession || '');
        setBio(data.bio || '');
        setUniversity(data.university || '');
        setPhone(data.phone || '');
        setDepartment(data.department || '');
        setSpecialization(data.specialization || '');
        setOfficeLocation(data.office_location || '');
        setOfficeHours(data.office_hours || '');
        setAcademicTitle(data.academic_title || '');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Impossible de charger le profil.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground font-medium">Chargement du profil...</p>
      </div>
    );
  }

  const handleUpdateProfile = async () => {
    try {
      setIsSaving(true);
      await updateProfile({
        username,
        profession,
        bio,
        university,
        phone,
        department,
        specialization,
        office_location: officeLocation,
        office_hours: officeHours,
        academic_title: academicTitle
      });
      toast.success('Profil mis à jour avec succès !');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour.');
    } finally {
      setIsSaving(false);
    }
  };


  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      const { error } = await deleteAccount();
      if (error) throw error;
      toast.success('Votre compte a été supprimé.');
      window.location.href = '/login';
    } catch (error: any) {
      toast.error('Erreur lors de la suppression du compte : ' + (error.message || 'Une erreur est survenue'));
    } finally {
      setIsDeleting(false);
    }
  };

  const goToDocuments = () => {
    navigate('/files');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image valide.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image est trop grande (max 2Mo).');
      return;
    }

    try {
      setIsUploading(true);
      const publicUrl = await api.profiles.uploadAvatar(profile.id, file);
      await api.profiles.update(profile.id, { avatar_url: publicUrl });
      await refreshProfile();
      toast.success('Photo de profil mise à jour !');
    } catch (error) {
      console.error('Avatar upload failed:', error);
      toast.error('Échec de la mise à jour de la photo de profil.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between">
        {!isOwnProfile && (
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
        )}
        <div className="flex-1 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">
            {isOwnProfile ? 'Mon Profil' : 'Profil Étudiant'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isOwnProfile ? 'Gérez vos informations personnelles et votre compte.' : 'Consultez les informations de cet étudiant.'}
          </p>
        </div>
        {!isOwnProfile && <div className="w-20" />}
      </div>

      <Card className="shadow-lg border-primary/10 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/80 to-blue-600/60" />
        <CardHeader className="relative flex flex-col items-center -mt-16 pb-8">
          <div className={cn("relative group", isOwnProfile && "cursor-pointer")} onClick={isOwnProfile ? handleAvatarClick : undefined}>
            <Avatar className="h-32 w-32 border-4 border-background shadow-xl ring-2 ring-primary/20 transition-all duration-300">
              <AvatarImage src={profile.avatar_url} alt={profile.email} className="object-cover" />
              <AvatarFallback className="bg-primary/5 text-primary text-4xl font-black">
                {profile.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/30">
                {isUploading ? (
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </div>
            )}
            {isOwnProfile && (
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
                disabled={isUploading}
              />
            )}
          </div>
          <div className="mt-4 text-center px-4 w-full">
            <CardTitle className="text-2xl font-bold truncate max-w-full">
              {profile.username || profile.email?.split('@')[0]}
            </CardTitle>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="secondary" className="px-3 py-1 font-bold text-xs uppercase tracking-wider">
                {profile.role === 'admin' ? 'Administrateur' : profile.role === 'teacher' ? 'Professeur' : 'Étudiant'}
              </Badge>
            </div>
            {!isOwnProfile && profile.role === 'teacher' && (
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                {profile.academic_title && (
                  <p className="font-semibold text-foreground">{profile.academic_title}</p>
                )}
                {profile.department && (
                  <p className="flex items-center justify-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    {profile.department}
                  </p>
                )}
                {profile.specialization && (
                  <p className="text-xs italic">{profile.specialization}</p>
                )}
                {profile.office_location && (
                  <p className="text-xs">Bureau: {profile.office_location}</p>
                )}
                {profile.office_hours && (
                  <p className="text-xs">Permanence: {profile.office_hours}</p>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p-username">Pseudo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="p-username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    className="pl-10" 
                    placeholder="Non renseigné"
                    disabled={!isOwnProfile || (profile?.role === 'user')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-profession">Profession / Occupation</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="p-profession" 
                    value={profession} 
                    onChange={(e) => setProfession(e.target.value)} 
                    className="pl-10" 
                    placeholder="ex: Étudiant, Chercheur..."
                    disabled={!isOwnProfile || (profile?.role === 'user')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-university">Université / École</Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="p-university" 
                    value={university} 
                    onChange={(e) => setUniversity(e.target.value)} 
                    className="pl-10" 
                    placeholder="Non renseigné"
                    disabled={!isOwnProfile || (profile?.role === 'user')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-phone">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="p-phone" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    className="pl-10" 
                    placeholder="Non renseigné"
                    disabled={!isOwnProfile || (profile?.role === 'user')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="p-email" value={profile.email} disabled className="pl-10 bg-muted" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-bio">Bio</Label>
              <Textarea 
                id="p-bio" 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                placeholder={isOwnProfile ? "Racontez-nous un peu votre parcours étudiant..." : "Pas de biographie."}
                className="resize-none"
                rows={3}
                disabled={!isOwnProfile || (profile?.role === 'user')}
              />
            </div>

            {isOwnProfile && profile?.role === 'teacher' && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Informations Professionnelles
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Ces informations seront visibles par vos étudiants
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="academic-title" className="text-xs font-semibold">Titre Académique</Label>
                      <Input
                        id="academic-title"
                        value={academicTitle}
                        onChange={(e) => setAcademicTitle(e.target.value)}
                        placeholder="Dr., Prof., Maître de Conférences..."
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department" className="text-xs font-semibold">Département</Label>
                      <Input
                        id="department"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="Mathématiques, Informatique..."
                        className="h-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialization" className="text-xs font-semibold">Spécialisation</Label>
                    <Input
                      id="specialization"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="Intelligence Artificielle, Algèbre..."
                      className="h-10"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="office-location" className="text-xs font-semibold">Bureau</Label>
                      <Input
                        id="office-location"
                        value={officeLocation}
                        onChange={(e) => setOfficeLocation(e.target.value)}
                        placeholder="Bâtiment A, Salle 205..."
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="office-hours" className="text-xs font-semibold">Heures de Permanence</Label>
                      <Input
                        id="office-hours"
                        value={officeHours}
                        onChange={(e) => setOfficeHours(e.target.value)}
                        placeholder="Lun-Mer 14h-16h"
                        className="h-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isOwnProfile && (
              <div className="pt-4 border-t flex flex-col gap-3">
                <Button variant="outline" className="w-full gap-2 justify-start h-12" onClick={goToDocuments}>
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <span>Accéder à mes documents</span>
                </Button>
                {(profile.role === 'teacher' || profile.role === 'admin') && (
                  <Button className="w-full gap-2" onClick={handleUpdateProfile} disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                    Enregistrer les modifications
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
        {isOwnProfile && (
          <CardFooter className="flex flex-col md:flex-row gap-4 p-6 border-t bg-muted/20">
             <Button variant="outline" className="w-full md:w-auto gap-2" onClick={handleSignOut}>
               <LogOut className="h-4 w-4" /> Déconnexion
             </Button>
             
             <AlertDialog>
               <AlertDialogTrigger asChild>
                 <Button variant="destructive" className="w-full md:w-auto gap-2" disabled={isDeleting}>
                   {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                   Supprimer le compte
                 </Button>
               </AlertDialogTrigger>
               <AlertDialogContent>
                 <AlertDialogHeader>
                   <AlertDialogTitle className="text-destructive">Êtes-vous absolument sûr ?</AlertDialogTitle>
                   <AlertDialogDescription>
                     Cette action est irréversible. Elle supprimera définitivement votre compte, 
                     votre profil ainsi que toutes vos données (cours, fichiers, rappels) 
                     de nos serveurs.
                   </AlertDialogDescription>
                 </AlertDialogHeader>
                 <AlertDialogFooter>
                   <AlertDialogCancel>Annuler</AlertDialogCancel>
                   <AlertDialogAction 
                     onClick={handleDeleteAccount}
                     className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                   >
                     Supprimer définitivement
                   </AlertDialogAction>
                 </AlertDialogFooter>
               </AlertDialogContent>
             </AlertDialog>
          </CardFooter>
        )}
      </Card>

      {profile.role === 'admin' && (
        <Card className="border-none shadow-none bg-blue-500/5 p-6 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Settings className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg mb-1">Espace Administration</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  En tant qu'administrateur, vous pouvez superviser les utilisateurs inscrits et l'activité du site.
                </p>
              </div>
              <Button asChild variant="outline" className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10">
                <Link to="/admin">Gérer le site</Link>
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="border-none shadow-none bg-orange-500/5 p-6 rounded-2xl">
         <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-500/10 rounded-xl">
              <Mail className="h-6 w-6 text-orange-500" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-1">Derniers Courriels Reçus</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Consultez l'historique des emails que vous avez reçus du système.
                </p>
              </div>
              <div className="space-y-3 pt-2">
                {emails.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">Aucun courriel récent reçu.</p>
                ) : (
                  emails.map((email) => (
                    <div key={email.id} className="p-3 bg-background border border-orange-500/10 rounded-xl group hover:border-orange-500/30 transition-all cursor-default">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-orange-600">{email.title}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(email.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed italic">
                        {email.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
         </div>
      </Card>

      <Card className="border-none shadow-none bg-primary/5 p-6 rounded-2xl">
         <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-1">Préférences de Notification</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Choisissez comment vous souhaitez être informé des rappels de cours.
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="browser-notif" className="flex flex-col gap-1 cursor-pointer">
                    <span className="font-medium">Notifications du navigateur</span>
                    <span className="text-xs text-muted-foreground font-normal">Alertes système sur votre appareil</span>
                  </Label>
                  <Switch 
                    id="browser-notif"
                    checked={profile?.notification_settings?.browser_notifications ?? true}
                    onCheckedChange={(checked) => updateProfile({ 
                      notification_settings: { 
                        ...(profile?.notification_settings || { browser_notifications: true, in_app_notifications: true, email_notifications: false }),
                        browser_notifications: checked 
                      } 
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="in-app-notif" className="flex flex-col gap-1 cursor-pointer">
                    <span className="font-medium">Notifications intégrées</span>
                    <span className="text-xs text-muted-foreground font-normal">Historique dans la cloche de notification</span>
                  </Label>
                  <Switch 
                    id="in-app-notif"
                    checked={profile?.notification_settings?.in_app_notifications ?? true}
                    onCheckedChange={(checked) => updateProfile({ 
                      notification_settings: { 
                        ...(profile?.notification_settings || { browser_notifications: true, in_app_notifications: true, email_notifications: false }),
                        in_app_notifications: checked 
                      } 
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notif" className="flex flex-col gap-1 cursor-pointer">
                    <span className="font-medium">Notifications par e-mail</span>
                    <span className="text-xs text-muted-foreground font-normal">Recevez vos rappels de cours par courriel</span>
                  </Label>
                  <Switch 
                    id="email-notif"
                    checked={profile?.notification_settings?.email_notifications ?? false}
                    onCheckedChange={(checked) => updateProfile({ 
                      notification_settings: { 
                        ...(profile?.notification_settings || { browser_notifications: true, in_app_notifications: true, email_notifications: false }),
                        email_notifications: checked 
                      } 
                    })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                  Système & Mises à Jour
                  {profile?.auto_update && <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] py-0 px-2 h-4 uppercase font-black">Actif</Badge>}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Gérez la façon dont l'application se met à jour et synchronise vos données.
                </p>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <Label htmlFor="auto-update" className="flex flex-col gap-1 cursor-pointer">
                    <span className="font-bold">Mise à jour automatique</span>
                    <span className="text-xs text-muted-foreground font-normal">Actualiser automatiquement l'emploi du temps et les ressources</span>
                  </Label>
                  <Switch 
                    id="auto-update"
                    checked={profile?.auto_update ?? true}
                    onCheckedChange={(checked) => updateProfile({ auto_update: checked })}
                  />
                </div>
              </div>
            </div>
         </div>
      </Card>

      <Card className="border-none shadow-none bg-primary/5 p-6 rounded-2xl">
         <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Confidentialité & Sécurité</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Vos données sont stockées de manière sécurisée et ne sont accessibles que par vous. 
                L'application utilise le protocole de sécurité Supabase pour protéger vos informations personnelles.
              </p>
            </div>
         </div>
      </Card>

    </div>
  );
}