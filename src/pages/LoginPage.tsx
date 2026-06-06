import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  GraduationCap, 
  Mail, 
  Loader2, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ArrowLeft,
  Github,
  Chrome,
  Facebook,
  UserCircle,
  Briefcase,
  AtSign,
  Play
} from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/db/supabase';
import { motion } from 'framer-motion';
import { UsageTour } from '@/components/common/UsageTour';

export default function LoginPage() {
  const [mode, setMode] = React.useState<'login' | 'register' | 'forgot-password'>('login');
  const [authMethod, setAuthMethod] = React.useState<'email' | 'username'>('email');
  const [hasSelectedRole, setHasSelectedRole] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState<'user' | 'teacher' | 'admin'>('user');
  const [selectedProfession, setSelectedProfession] = React.useState<string>('Étudiant');
  const [showPassword, setShowPassword] = React.useState(false);
  const [acceptTerms, setAcceptTerms] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(false);
  const [isEmailSent, setIsEmailSent] = React.useState(false);

  const { 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithUsername, 
    signUpWithUsername, 
    resetPasswordForEmail,
    siteSettings,
    user,
    profile,
    loading 
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || '/dashboard';

  // Prevent redirecting to login page itself
  const safeFrom = from === '/login' ? '/dashboard' : from;

  const professions = [
    "Étudiant",
    "Professeur / Enseignant",
    "Chercheur",
    "Personnel Administratif",
    "Direction / Cadre",
    "Technicien / Support",
    "Autre"
  ];


  const filteredProfessions = React.useMemo(() => {
    if (selectedRole === 'user') return professions.filter(p => p === "Étudiant" || p === "Autre");
    if (selectedRole === 'teacher') return professions.filter(p => p === "Professeur / Enseignant" || p === "Chercheur" || p === "Autre");
    if (selectedRole === 'admin') return professions.filter(p => p === "Personnel Administratif" || p === "Direction / Cadre" || p === "Technicien / Support" || p === "Autre");
    return professions;
  }, [selectedRole]);

  React.useEffect(() => {
    if (user && !loading && profile) {
      if (profile.role === 'admin') navigate('/admin', { replace: true });
      else if (profile.role === 'teacher') navigate('/teacher', { replace: true });
      else navigate(safeFrom, { replace: true });
    }
  }, [user, profile, loading, navigate, safeFrom]);

  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground animate-pulse font-medium">Chargement de votre session...</p>
        </div>
      </div>
    );
  }

  const handleSocialLogin = async (provider: string) => {
    if (provider === 'Google') {
      try {
        const { data, error } = await supabase.auth.signInWithSSO({
          domain: 'miaoda-gg.com',
          options: { redirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data?.url) window.open(data.url, '_self');
      } catch (error: any) {
        toast.error(`Erreur de connexion Google: ${error.message}`);
      }
    } else {
      toast.info(`Connexion avec ${provider} en cours de simulation...`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { error } = authMethod === 'email' 
          ? await signInWithEmail(email, password)
          : await signInWithUsername(username, password);
        
        if (error) throw error;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
            
          toast.success('Connexion réussie !');
          if (profile?.role === 'admin') {
            navigate('/admin', { replace: true });
          } else if (profile?.role === 'teacher') {
            navigate('/teacher', { replace: true });
          } else {
            navigate(from, { replace: true });
          }
        }
      } else if (mode === 'register') {
        if (password !== confirmPassword) throw new Error("Les mots de passe ne correspondent pas");
        if (!acceptTerms) throw new Error("Veuillez accepter les conditions d'utilisation");
        
        if (authMethod === 'email') {
          const res = await signUpWithEmail(email, password, selectedRole, selectedProfession);
          if (res.error) throw res.error;
          
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            toast.success('Compte créé et connecté avec succès !');
            if (selectedRole === 'admin') {
              navigate('/admin', { replace: true });
            } else if (selectedRole === 'teacher') {
              navigate('/teacher', { replace: true });
            } else {
              navigate(from, { replace: true });
            }
          } else {
            toast.success('Compte créé ! Vous pouvez vous connecter maintenant.');
            toggleMode('login');
          }
        } else if (authMethod === 'username') {
          const res = await signUpWithUsername(username, password, selectedRole, selectedProfession);
          if (res.error) throw res.error;
          toast.success('Compte créé avec succès ! Connectez-vous maintenant.');
          toggleMode('login');
        }
      } else if (mode === 'forgot-password') {
        const { error } = await resetPasswordForEmail(email);
        if (error) throw error;
        toast.success('Email de réinitialisation envoyé !');
        setIsEmailSent(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (newMode: 'login' | 'register' | 'forgot-password') => {
    if (newMode === 'register' && siteSettings.registration_enabled === false) {
      toast.error("Les inscriptions sont temporairement désactivées par l'administrateur.");
      return;
    }
    setMode(newMode);
    setHasSelectedRole(false);
    setIsEmailSent(false);
    setPassword('');
    setConfirmPassword('');
  };

  const renderRoleSelectionCards = () => (
    <div className="grid grid-cols-1 gap-4 py-4 animate-in fade-in slide-in-from-bottom-4">
      <h3 className="text-center font-bold text-lg text-muted-foreground mb-2">Choisissez votre profil</h3>
      <div className="grid grid-cols-1 gap-3">
        <button
          type="button"
          onClick={() => { setSelectedRole('user'); setSelectedProfession('Étudiant'); setHasSelectedRole(true); }}
          className="flex items-center gap-4 p-5 rounded-2xl border-2 border-transparent bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all text-left group shadow-sm"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
            <UserCircle className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-black text-lg">Espace Étudiant</p>
            <p className="text-xs text-muted-foreground italic">Accédez à votre emploi du temps et cours</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setSelectedRole('teacher'); setSelectedProfession('Professeur / Enseignant'); setHasSelectedRole(true); }}
          className="flex items-center gap-4 p-5 rounded-2xl border-2 border-transparent bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all text-left group shadow-sm"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
            <GraduationCap className="h-8 w-8 text-indigo-500" />
          </div>
          <div>
            <p className="font-black text-lg text-indigo-600 dark:text-indigo-400">Espace Enseignant</p>
            <p className="text-xs text-muted-foreground italic">Gérez vos supports et évaluations</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setSelectedRole('admin'); setSelectedProfession('Administrateur'); setHasSelectedRole(true); }}
          className="flex items-center gap-4 p-5 rounded-2xl border-2 border-transparent bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all text-left group shadow-sm"
        >
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
            <Briefcase className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <p className="font-black text-lg text-amber-600 dark:text-amber-400">Administration</p>
            <p className="text-xs text-muted-foreground italic">Gestion globale de la plateforme</p>
          </div>
        </button>
      </div>
    </div>
  );

  const renderRoleSelection = () => (
    <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-2">
      {mode === 'register' && selectedRole !== 'admin' && (
        <div className="space-y-2">
          <Label htmlFor="profession">Profession spécifique</Label>
          <Select value={selectedProfession} onValueChange={setSelectedProfession}>
            <SelectTrigger id="profession" className="w-full">
              <SelectValue placeholder="Quelle est votre profession ?" />
            </SelectTrigger>
            <SelectContent>
              {filteredProfessions.map((prof) => (
                <SelectItem key={prof} value={prof}>
                  {prof}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const renderEmailInput = () => (
    <div className="space-y-2 animate-in fade-in slide-in-from-left-2">
      <Label htmlFor="email">Email Universitaire / Personnel</Label>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          id="email" 
          type="email" 
          placeholder="exemple@université.fr" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          className="pl-10"
          required 
        />
      </div>
    </div>
  );

  const renderUsernameInput = () => (
    <div className="space-y-2 animate-in fade-in slide-in-from-left-2">
      <Label htmlFor="username">Nom d'utilisateur (Pseudo)</Label>
      <div className="relative">
        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          id="username" 
          type="text" 
          placeholder="votre_pseudo" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
          className="pl-10"
          required 
        />
      </div>
    </div>
  );


  const renderPasswordInput = (isConfirm = false) => (
    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={isConfirm ? "confirm-password" : "password"}>
          {isConfirm ? "Confirmer le mot de passe" : "Mot de passe"}
        </Label>
        {!isConfirm && mode === 'login' && (
          <button 
            type="button"
            onClick={() => toggleMode('forgot-password')}
            className="text-xs text-primary hover:underline font-medium"
          >
            Mot de passe oublié ?
          </button>
        )}
      </div>
      <div className="relative">
        <Input 
          id={isConfirm ? "confirm-password" : "password"} 
          type={showPassword ? "text" : "password"} 
          value={isConfirm ? confirmPassword : password} 
          onChange={(e) => isConfirm ? setConfirmPassword(e.target.value) : setPassword(e.target.value)} 
          className="pr-10"
          required
          minLength={6}
        />
        {!isConfirm && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] w-full bg-white dark:bg-slate-950">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary via-primary/90 to-secondary overflow-hidden items-center justify-center p-12">
        {/* Abstract shapes */}
        <div className="absolute top-10 -left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-32 h-32 border border-white/10 rounded-full" />
        <div className="absolute bottom-1/3 left-1/3 w-20 h-20 border border-white/10 rounded-lg rotate-45" />
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 text-center text-white"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex p-6 bg-white/10 backdrop-blur-xl rounded-3xl mb-8"
          >
            <GraduationCap className="h-16 w-16" />
          </motion.div>
          <h1 className="text-5xl font-black mb-4 tracking-tight">Campus en Ligne</h1>
          <p className="text-xl text-white/70 max-w-md mx-auto leading-relaxed">
            Votre plateforme éducative tout-en-un. Accédez aux cours, devoirs et bien plus.
          </p>
          <div className="mt-12 flex flex-col gap-4 items-center">
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <div className="w-8 h-px bg-white/30" />
              <span>Fonctionnalités</span>
              <div className="w-8 h-px bg-white/30" />
            </div>
            <div className="flex gap-6 text-white/60 text-sm">
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-white/40" /> Cours</span>
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-white/40" /> Devoirs</span>
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-white/40" /> Messagerie</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative overflow-y-auto">
        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>

        {/* Mobile branding */}
        <div className="lg:hidden text-center mb-6 w-full">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl mb-4"
          >
            <GraduationCap className="h-10 w-10 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Campus en Ligne
          </h1>
          <p className="text-muted-foreground mt-1">
            {mode === 'login' && "Accédez à votre campus numérique"}
            {mode === 'register' && "Créez votre profil universitaire"}
            {mode === 'forgot-password' && "Réinitialisation sécurisée"}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >

          <Card className="shadow-lg border-border/50 relative bg-card rounded-2xl overflow-hidden">
            <CardHeader className="text-center pb-2 pt-8">
              {/* Desktop heading */}
              <div className="hidden lg:block">
                <CardTitle className="text-2xl font-bold">
                  {mode === 'login' && 'Connexion'}
                  {mode === 'register' && 'Inscription'}
                  {mode === 'forgot-password' && 'Mot de passe oublié'}
                </CardTitle>
                <CardDescription className="mt-1">
                  {mode === 'login' && "Bienvenue ! Connectez-vous à votre compte"}
                  {mode === 'register' && "Créez votre profil universitaire"}
                  {mode === 'forgot-password' && "Recevez un lien par email"}
                </CardDescription>
              </div>
              {mode === 'login' && siteSettings?.registration_enabled !== false && (
                <div className="hidden lg:block mt-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-full px-4 h-8"
                    onClick={() => window.dispatchEvent(new CustomEvent('open-usage-tour'))}
                  >
                    <Play className="h-3 w-3 mr-2 fill-primary" /> Voir la démo & Guide
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="pt-4">
              <UsageTour />
              {isEmailSent ? (
                <section className="text-center py-8 space-y-4">
                  <div className="p-4 bg-emerald-500/10 rounded-full w-fit mx-auto" aria-hidden="true">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold">Lien envoyé !</h3>
                  <p className="text-muted-foreground text-sm">Veuillez vérifier votre boîte de réception.</p>
                  <Button onClick={() => toggleMode('login')} variant="outline" className="w-full mt-4">Retour à la connexion</Button>
                </section>
              ) : !hasSelectedRole && (mode === 'login' || mode === 'register') ? (
                renderRoleSelectionCards()
              ) : (
                <div className="space-y-5">
                  {hasSelectedRole && (mode === 'login' || mode === 'register') && (
                    <button 
                      onClick={() => setHasSelectedRole(false)} 
                      className="flex items-center text-xs font-bold text-primary hover:text-primary/80 transition-colors group"
                    >
                      <ArrowLeft className="h-3 w-3 mr-1 transition-transform group-hover:-translate-x-1" /> 
                      Changer de profil ({selectedRole === 'admin' ? 'Administration' : selectedRole === 'teacher' ? 'Enseignant' : 'Étudiant'})
                    </button>
                  )}

                  {mode !== 'forgot-password' && (
                    <nav aria-label="Méthodes d'authentification">
                      <Tabs value={authMethod} onValueChange={(v: any) => setAuthMethod(v)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="email" className="text-xs">E-mail</TabsTrigger>
                          <TabsTrigger value="username" className="text-xs">Pseudo</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </nav>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {(mode === 'login' || mode === 'register') && renderRoleSelection()}

                    {authMethod === 'email' ? renderEmailInput() : renderUsernameInput()}

                    {mode !== 'forgot-password' && renderPasswordInput()}

                    {mode === 'register' && (
                      <>
                        {renderPasswordInput(true)}
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(c) => setAcceptTerms(c as boolean)} required aria-required="true" />
                          <Label htmlFor="terms" className="text-xs font-normal leading-tight cursor-pointer">
                            J'accepte les conditions d'utilisation de mon espace étudiant.
                          </Label>
                        </div>
                      </>
                    )}

                    <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      ) : (
                        <>
                          {mode === 'login' && 'Se connecter'}
                          {mode === 'register' && "Créer mon compte"}
                          {mode === 'forgot-password' && 'Envoyer le lien'}
                        </>
                      )}
                    </Button>
                  </form>

                  {mode !== 'forgot-password' && (
                    <section className="space-y-4" aria-label="Connexion sociale">
                      <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ou continuer avec</span></div></div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button variant="outline" className="w-full" onClick={() => handleSocialLogin('Google')} aria-label="Se connecter avec Google"><Chrome className="h-4 w-4" /></Button>
                        <Button variant="outline" className="w-full" onClick={() => handleSocialLogin('GitHub')} aria-label="Se connecter avec GitHub"><Github className="h-4 w-4" /></Button>
                        <Button variant="outline" className="w-full" onClick={() => handleSocialLogin('Facebook')} aria-label="Se connecter avec Facebook"><Facebook className="h-4 w-4" /></Button>
                      </div>
                    </section>
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-center border-t bg-muted/30 py-4">
              {mode === 'login' && (
                <p className="text-sm text-muted-foreground">
                  Pas encore de compte ? {' '}
                  {siteSettings.registration_enabled === false ? (
                    <span className="italic">Inscriptions fermées</span>
                  ) : (
                    <button onClick={() => toggleMode('register')} className="text-primary font-bold hover:underline">S'inscrire</button>
                  )}
                </p>
              )}
              {mode === 'register' && (
                <p className="text-sm text-muted-foreground">Déjà inscrit ? <button onClick={() => toggleMode('login')} className="text-primary font-bold hover:underline">Se connecter</button></p>
              )}
              {(mode === 'forgot-password') && (
                <button onClick={() => toggleMode('login')} className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"><ArrowLeft className="h-4 w-4 mr-1" /> Retour à la connexion</button>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}