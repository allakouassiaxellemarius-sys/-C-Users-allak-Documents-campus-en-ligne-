import { useState, useEffect } from 'react';
import { api } from '@/db/api';
import type { Profile } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  UserCircle, 
  GraduationCap, 
  Briefcase, 
  Mail,
  Filter,
  Users,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function DirectoryPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<'all' | 'user' | 'teacher'>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await api.profiles.listAll(100);
      // Filtrer les administrateurs de l'annuaire public
      setUsers(data.filter(u => u.role !== 'admin'));
    } catch (error) {
      console.error('Erreur chargement annuaire:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadUsers();
      return;
    }
    
    try {
      setIsLoading(true);
      const data = await api.profiles.search(searchTerm);
      // Filtrer les administrateurs des résultats de recherche
      setUsers(data.filter(u => u.role !== 'admin'));
    } catch (error) {
      console.error('Erreur recherche:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (filterRole === 'all') return true;
    return user.role === filterRole;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Annuaire Universitaire</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium italic">
            Découvrez et reconnaissez vos camarades, professeurs et membres du personnel.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-primary/5 p-2 px-4 rounded-2xl border border-primary/10 shadow-sm">
          <Users className="h-5 w-5 text-primary" />
          <span className="text-sm font-black text-primary uppercase tracking-tighter">{filteredUsers.length} Membres</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 h-fit shadow-xl border-primary/5 sticky top-20 rounded-[2rem] overflow-hidden bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tighter">
               <Filter className="h-4 w-4 text-primary" /> Filtres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Nom, email..." 
                  className="pl-10 text-sm rounded-xl h-12 border-primary/10 bg-background/50 focus:bg-background transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} className="w-full h-11 rounded-xl font-bold shadow-lg shadow-primary/20" size="sm">
                Lancer la recherche
              </Button>
            </div>

            <div className="space-y-3 pt-2">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Type de membre</label>
               <div className="flex flex-col gap-2">
                 <Button 
                   variant={filterRole === 'all' ? 'default' : 'ghost'} 
                   size="sm" 
                   className={cn(
                     "justify-start gap-3 h-11 rounded-xl font-bold transition-all",
                     filterRole === 'all' ? "shadow-md shadow-primary/20" : "hover:bg-primary/5"
                   )}
                   onClick={() => setFilterRole('all')}
                 >
                   <Users className="h-4 w-4" /> Tous les membres
                 </Button>
                 <Button 
                   variant={filterRole === 'user' ? 'default' : 'ghost'} 
                   size="sm" 
                   className={cn(
                     "justify-start gap-3 h-11 rounded-xl font-bold transition-all",
                     filterRole === 'user' ? "shadow-md shadow-primary/20" : "hover:bg-primary/5"
                   )}
                   onClick={() => setFilterRole('user')}
                 >
                   <GraduationCap className="h-4 w-4" /> Étudiants
                 </Button>
                 <Button 
                   variant={filterRole === 'teacher' ? 'default' : 'ghost'} 
                   size="sm" 
                   className={cn(
                     "justify-start gap-3 h-11 rounded-xl font-bold transition-all",
                     filterRole === 'teacher' ? "shadow-md shadow-primary/20" : "hover:bg-primary/5"
                   )}
                   onClick={() => setFilterRole('teacher')}
                 >
                   <Briefcase className="h-4 w-4" /> Professeurs
                 </Button>
               </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <Card key={i} className="border-none shadow-sm bg-muted/20 animate-pulse rounded-3xl overflow-hidden">
                  <CardContent className="p-8 flex flex-col items-center gap-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card className="border-dashed py-32 text-center bg-muted/5 rounded-[2.5rem] border-2 border-primary/10">
              <CardContent className="flex flex-col items-center gap-6">
                <div className="p-6 bg-primary/5 rounded-full">
                  <Search className="h-16 w-16 text-primary/20" />
                </div>
                <div className="space-y-2">
                  <p className="text-xl font-bold tracking-tight">Aucun résultat trouvé</p>
                  <p className="text-muted-foreground text-sm max-w-xs">Nous n'avons trouvé aucun membre correspondant à vos critères de recherche.</p>
                </div>
                <Button variant="outline" className="rounded-xl px-8 font-bold border-primary/20 hover:bg-primary/5" onClick={() => {setSearchTerm(''); setFilterRole('all'); loadUsers();}}>
                  Réinitialiser les filces
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserCard({ user }: { user: Profile }) {
  const roleColors = {
    user: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    teacher: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    admin: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
  };

  const roleLabels = {
    user: 'Étudiant',
    teacher: 'Enseignant',
    admin: 'Administration'
  };

  return (
    <Card className="group hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] transition-all duration-500 border border-primary/5 hover:border-primary/20 overflow-hidden relative rounded-[2rem] bg-card/50 backdrop-blur-sm">
      <div className={`absolute top-0 left-0 w-full h-1.5 ${user.role === 'teacher' ? 'bg-emerald-500' : user.role === 'admin' ? 'bg-purple-500' : 'bg-primary'}`} />
      <CardContent className="p-8">
        <div className="flex flex-col items-center text-center gap-5">
          <div className="relative">
             <div className={`absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 ${user.role === 'teacher' ? 'bg-emerald-500' : 'bg-primary'}`} />
             <Avatar className="h-24 w-24 border-4 border-background shadow-xl relative z-10 group-hover:scale-110 transition-transform duration-500">
                <AvatarImage src={user.avatar_url} alt={user.username || user.email || 'U'} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-black text-2xl uppercase">
                   {(user.username || user.email || 'U').charAt(0)}
                </AvatarFallback>
             </Avatar>
          </div>
          
          <div className="space-y-2 w-full">
             <h3 className="font-black text-xl leading-tight group-hover:text-primary transition-colors truncate px-2 tracking-tighter">
               {user.username || (user.email ? user.email.split('@')[0] : 'Inconnu')}
             </h3>
             <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full", roleColors[user.role])}>
               {roleLabels[user.role]}
             </Badge>
          </div>

          <div className="w-full space-y-3 pt-4 border-t border-muted/50">
             <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-semibold italic">
                {user.role === 'teacher' ? <Briefcase className="h-3.5 w-3.5 text-emerald-500/50" /> : <GraduationCap className="h-3.5 w-3.5 text-primary/50" />}
                <span className="truncate">{user.profession || "Non spécifié"}</span>
             </div>
             {user.role === 'teacher' && user.department && (
               <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground font-bold">
                  <Briefcase className="h-3.5 w-3.5 opacity-50" />
                  <span className="truncate">{user.department}</span>
               </div>
             )}
             <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground font-bold">
                <Mail className="h-3.5 w-3.5 opacity-50" />
                <span className="truncate max-w-[180px]">{user.email || 'Aucun e-mail'}</span>
             </div>
          </div>

          <Button asChild variant="secondary" className="w-full mt-4 h-11 text-xs font-black rounded-xl uppercase tracking-widest shadow-inner group/btn transition-all" size="sm">
            <Link to={`/profile/${user.id}`}>
              Voir le profil <ChevronRight className="ml-2 h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}