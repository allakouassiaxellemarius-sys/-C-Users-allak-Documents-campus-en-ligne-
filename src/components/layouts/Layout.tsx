import { useState, useEffect, useMemo, memo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  CalendarDays, 
  BookOpen, 
  Bell, 
  LogOut, 
  User, 
  Menu,
  GraduationCap,
  FolderOpen,
  Users,
  Shield,
  MessageSquare,
  FileText,
  ClipboardList,
  History,
  ArrowLeft,
  BarChart2,
  Bot,
  CheckSquare,
  Timer,
  Video,
  FileSearch,
  Mic,
  Settings
} from 'lucide-react';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  useSidebar
} from '@/components/ui/sidebar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useReminders } from '@/hooks/use-reminders';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { NotificationBell } from '@/components/common/NotificationBell';
import { UsageTour } from '@/components/common/UsageTour';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { PWAInstallBanner } from '@/components/common/PWAInstallBanner';
import { InstallButton } from '@/components/common/InstallButton';

const commonItems = [
  { label: 'Espace Étudiant', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Visioconférence', path: '/videoconference', icon: Video },
  { label: 'Annuaire', path: '/directory', icon: Users },
  { label: 'Supports & Devoirs', path: '/materials', icon: FileText },
  { label: 'Mes Documents', path: '/files', icon: FolderOpen },
  { label: 'Lecteur de Fichiers', path: '/file-viewer', icon: FileSearch },
  { label: 'Assistant Vocal', path: '/voice-assistant', icon: Mic },
  { label: 'Assistant IA', path: '/assistant', icon: Bot },
  { label: 'Tâches', path: '/tasks', icon: CheckSquare },
  { label: 'Timer Pomodoro', path: '/pomodoro', icon: Timer },
  { label: 'Paramètres App', path: '/app-settings', icon: Settings },
  { label: 'Groupes d\'étude', path: '/groups', icon: Users },
  { label: 'Mises à jour', path: '/updates', icon: History },
  { label: 'Boîte à idées', path: '/suggestions', icon: MessageSquare },
];

const SidebarLinks = memo(function SidebarLinks() {
  const location = useLocation();
  const { profile } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const studentItems = useMemo(() => [
    { label: 'Emploi du temps', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Mes Cours', path: '/courses', icon: BookOpen },
    { label: 'Inscription aux Cours', path: '/courses/enroll', icon: GraduationCap },
    { label: 'Notes & Résultats', path: '/grades', icon: BarChart2 },
    { label: 'Calendrier', path: '/calendar', icon: CalendarDays },
    { label: 'Rappels', path: '/reminders', icon: Bell },
  ], []);

  const teacherItems = useMemo(() => [
    { label: 'Espace Enseignant', path: '/teacher', icon: ClipboardList },
  ], []);

  const adminItems = useMemo(() => [
    { label: 'Gestion du Site', path: '/admin', icon: Shield },
    { label: 'Analytics PWA', path: '/pwa-analytics', icon: BarChart2 },
  ], []);

  const currentNavItems = useMemo(() => {
    const items = [];
    if (profile?.role === 'admin') {
      items.push(...adminItems);
      items.push(...commonItems.filter(item => item.path === '/directory' || item.path === '/suggestions' || item.path === '/updates' || item.path === '/file-viewer' || item.path === '/voice-assistant' || item.path === '/app-settings'));
    } else if (profile?.role === 'teacher') {
      items.push(...teacherItems);
      items.push(...commonItems.filter(item => item.path === '/directory' || item.path === '/materials' || item.path === '/files' || item.path === '/suggestions' || item.path === '/file-viewer' || item.path === '/voice-assistant' || item.path === '/app-settings'));
    } else {
      items.push(...studentItems);
      items.push(...commonItems.filter(item => item.path === '/directory' || item.path === '/materials' || item.path === '/files' || item.path === '/groups' || item.path === '/suggestions' || item.path === '/file-viewer' || item.path === '/voice-assistant' || item.path === '/app-settings'));
    }
    return items;
  }, [profile?.role, adminItems, teacherItems, studentItems]);

  return (
    <SidebarMenu>
      <nav aria-label="Navigation principale">
        {currentNavItems.map((item) => (
          <SidebarMenuItem key={item.path}>
            <SidebarMenuButton 
              asChild 
              isActive={location.pathname === item.path}
              tooltip={item.label}
              className={cn(
                "transition-all duration-200",
                location.pathname === item.path && "bg-primary/10 text-primary font-bold shadow-sm"
              )}
            >
              <Link 
                to={item.path} 
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg"
                onClick={handleLinkClick}
                aria-current={location.pathname === item.path ? 'page' : undefined}
              >
                <item.icon className={cn("h-5 w-5", location.pathname === item.path ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                <span className="text-sm">{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </nav>
    </SidebarMenu>
  );
});

const allItems = [
  { label: 'Emploi du temps', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Mes Cours', path: '/courses', icon: BookOpen },
  { label: 'Notes & Résultats', path: '/grades', icon: BarChart2 },
  { label: 'Calendrier', path: '/calendar', icon: CalendarDays },
  { label: 'Rappels', path: '/reminders', icon: Bell },
  { label: 'Supports & Devoirs', path: '/materials', icon: FileText },
  { label: 'Mes Documents', path: '/files', icon: FolderOpen },
  { label: 'Groupes d\'étude', path: '/groups', icon: Users },
  { label: 'Boîte à idées', path: '/suggestions', icon: MessageSquare },
  { label: 'Espace Enseignant', path: '/teacher', icon: ClipboardList },
  { label: 'Administration', path: '/admin', icon: Shield },
  { label: 'Profil', path: '/profile', icon: User },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Activate reminders
  useReminders();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <SidebarProvider>
      <UsageTour />
      <div className="flex min-h-screen w-full bg-background transition-colors duration-500 safe-area-inset">
        <Sidebar className="border-r shadow-sm print:hidden">
          <SidebarHeader className="p-6 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg shadow-sm">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight animate-gradient-text hover-scale cursor-default">Campus en Ligne</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Emploi du temps</p>
              </div>
            </div>
            <ThemeToggle />
          </SidebarHeader>
          <SidebarContent className="p-4 overflow-y-auto">
            <SidebarLinks />
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 p-2 h-auto hover:bg-accent rounded-xl relative transition-all duration-300">
                  <Avatar className="h-9 w-9 border-2 border-primary/20 shadow-sm">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.email} className="object-cover" />
                    <AvatarFallback className="bg-primary/5 text-primary font-black">
                      {profile?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-sm font-bold truncate w-full">
                      {profile?.email?.split('@')[0] || 'Utilisateur'}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate w-full uppercase tracking-wider font-bold">
                      {profile?.role === 'admin' ? 'Administrateur' : profile?.role === 'teacher' ? 'Professeur' : 'Étudiant'}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl border-primary/10 shadow-xl">
                <DropdownMenuLabel className="px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Mon Compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')} className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer">
                  <div className="flex items-center">
                    <User className="mr-3 h-4 w-4 text-primary" />
                    <span className="font-medium">Profil</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/notifications/settings')} className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer">
                  <div className="flex items-center">
                    <Bell className="mr-3 h-4 w-4 text-primary" />
                    <span className="font-medium">Notifications</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive p-2.5 rounded-lg cursor-pointer focus:bg-destructive focus:text-destructive-foreground">
                  <LogOut className="mr-3 h-4 w-4" />
                  <span className="font-medium">Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Bouton d'installation PWA */}
            <div className="mt-3 px-2">
              <InstallButton 
                variant="outline" 
                size="sm" 
                fullWidth={true}
                showIcon={true}
                className="w-full justify-start"
                source="sidebar"
              >
                Installer l'App
              </InstallButton>
            </div>
            
            <div className="mt-4 px-2 py-1.5 border border-dashed rounded-lg bg-muted/30">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
                <span>Version Stable</span>
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">v1.4.0</span>
              </div>
              <p className="text-[9px] text-muted-foreground/60 italic mt-1 leading-tight">
                2026 Campus en Ligne • Plateforme universitaire
              </p>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <header className="flex h-16 items-center border-b px-6 bg-background/60 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300 print:hidden border-white/10 shadow-sm">
            <SidebarTrigger className="lg:hidden mr-4" />
            <div className="flex items-center gap-4 flex-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(-1)} 
                className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all rounded-full hidden md:flex"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                {allItems.find(item => location.pathname === item.path)?.label || 
                 allItems.find(item => location.pathname.startsWith(item.path + '/'))?.label || 
                 'Aperçu'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              {profile?.role === 'admin' && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 animate-pulse hidden md:flex">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Sync Live</span>
                </div>
              )}
              <InstallButton 
                variant="outline" 
                size="sm" 
                className="hidden md:flex"
                showIcon={false}
                source="header"
              >
                Installer
              </InstallButton>
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-x-hidden transition-all duration-500 safe-area-bottom">
            <div className="max-w-7xl mx-auto h-full animate-in fade-in duration-700">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
      <OfflineIndicator />
      <PWAInstallBanner />
    </SidebarProvider>
  );
}