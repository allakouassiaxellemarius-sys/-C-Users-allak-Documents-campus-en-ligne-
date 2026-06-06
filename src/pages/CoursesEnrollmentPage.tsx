import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { 
  BookOpen, 
  Clock, 
  MapPin, 
  User, 
  Search,
  CheckCircle,
  Loader2,
  Calendar,
  Filter,
  Users,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function CoursesEnrollmentPage() {
  const { user, profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [teachers, setTeachers] = useState<Record<string, any>>({});
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDay, setFilterDay] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');

  useEffect(() => {
    loadData();

    if (user) {
      // Abonnement Realtime pour synchroniser les modifications de cours
      const coursesChannel = supabase
        .channel('enrollment-courses-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'courses'
          },
          (payload) => {
            console.log('Course change detected:', payload);
            loadData();
            toast.info('Liste des cours mise à jour', { duration: 2000 });
          }
        )
        .subscribe();

      // Abonnement pour les inscriptions
      const enrollmentsChannel = supabase
        .channel('enrollment-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'enrollments',
            filter: `student_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Enrollment change detected:', payload);
            // Mettre à jour l'état local
            if (payload.eventType === 'INSERT') {
              const newEnrollment = payload.new as any;
              setEnrolledCourseIds(prev => new Set([...prev, newEnrollment.course_id]));
            } else if (payload.eventType === 'DELETE') {
              const deletedEnrollment = payload.old as any;
              setEnrolledCourseIds(prev => {
                const updated = new Set(prev);
                updated.delete(deletedEnrollment.course_id);
                return updated;
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(coursesChannel);
        supabase.removeChannel(enrollmentsChannel);
      };
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      
      // Charger tous les cours disponibles
      const allCourses = await api.courses.listAll();
      
      // Charger les inscriptions de l'étudiant
      const enrollments = await api.enrollments.listForStudent(user.id);
      const enrolledIds = new Set<string>(enrollments.map((e: any) => e.course_id));
      
      // Charger les profils des enseignants
      const teacherIds = [...new Set(allCourses.map((c: any) => c.teacher_id))];
      const teacherProfiles: Record<string, any> = {};
      
      await Promise.all(
        teacherIds.map(async (teacherId) => {
          const profile = await api.profiles.get(teacherId);
          if (profile) {
            teacherProfiles[teacherId] = profile;
          }
        })
      );
      
      setCourses(allCourses);
      setEnrolledCourseIds(enrolledIds);
      setTeachers(teacherProfiles);
    } catch (error) {
      console.error('Failed to load courses:', error);
      toast.error('Erreur lors du chargement des cours');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnroll = async (courseId: string, courseName: string) => {
    if (!user) return;
    
    try {
      setEnrollingCourseId(courseId);
      await api.enrollments.enroll(courseId, user.id);
      
      setEnrolledCourseIds(prev => new Set([...prev, courseId]));
      toast.success(`Vous êtes inscrit au cours "${courseName}"`);
    } catch (error) {
      console.error('Failed to enroll:', error);
      toast.error('Erreur lors de l\'inscription');
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const handleUnenroll = async (courseId: string, courseName: string) => {
    if (!user) return;
    
    if (!confirm(`Voulez-vous vraiment vous désinscrire du cours "${courseName}" ?`)) {
      return;
    }
    
    try {
      setEnrollingCourseId(courseId);
      await api.enrollments.unenroll(courseId, user.id);
      
      setEnrolledCourseIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(courseId);
        return newSet;
      });
      toast.success(`Vous êtes désinscrit du cours "${courseName}"`);
    } catch (error) {
      console.error('Failed to unenroll:', error);
      toast.error('Erreur lors de la désinscription');
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const filteredCourses = courses
    .filter(course => {
      // Recherche textuelle
      const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.room?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teachers[course.teacher_id]?.username?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filtre par type
      const matchesType = filterType === 'all' || course.type === filterType;
      
      // Filtre par jour
      const matchesDay = filterDay === 'all' || course.day_of_week.toString() === filterDay;
      
      return matchesSearch && matchesType && matchesDay;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'day':
          return a.day_of_week - b.day_of_week;
        case 'time':
          return a.start_time.localeCompare(b.start_time);
        case 'enrolled':
          return (enrolledCourseIds.has(b.id) ? 1 : 0) - (enrolledCourseIds.has(a.id) ? 1 : 0);
        default:
          return 0;
      }
    });

  const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  
  const enrollmentStats = {
    total: courses.length,
    enrolled: enrolledCourseIds.size,
    available: courses.length - enrolledCourseIds.size
  };

  if (profile?.role !== 'user') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h2 className="text-2xl font-bold">Accès Réservé</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Cette page est réservée aux étudiants.
        </p>
        <Button onClick={() => window.history.back()}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* En-tête */}
      <div className="pb-6 border-b">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          Inscription aux Cours
        </h1>
        <p className="text-muted-foreground mt-2">
          Parcourez et inscrivez-vous aux cours disponibles
        </p>
      </div>

      {/* Section Statistiques */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Statistiques d'inscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Cours</p>
                    <p className="text-2xl font-bold">{enrollmentStats.total}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-muted-foreground opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-primary/50 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mes Inscriptions</p>
                    <p className="text-2xl font-bold text-primary">{enrollmentStats.enrolled}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-emerald-500/50 bg-emerald-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Disponibles</p>
                    <p className="text-2xl font-bold text-emerald-600">{enrollmentStats.available}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Section Recherche */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Rechercher et filtrer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
            placeholder="Rechercher un cours, professeur ou salle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtres et tri */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type de cours" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="CM">CM - Cours Magistral</SelectItem>
              <SelectItem value="TD">TD - Travaux Dirigés</SelectItem>
              <SelectItem value="TP">TP - Travaux Pratiques</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDay} onValueChange={setFilterDay}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Jour de la semaine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les jours</SelectItem>
              {DAYS.map((day, index) => (
                <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nom du cours</SelectItem>
              <SelectItem value="day">Jour de la semaine</SelectItem>
              <SelectItem value="time">Heure de début</SelectItem>
              <SelectItem value="enrolled">Mes inscriptions</SelectItem>
            </SelectContent>
          </Select>

          {(filterType !== 'all' || filterDay !== 'all' || searchQuery) && (
            <Button 
              variant="outline" 
              onClick={() => {
                setFilterType('all');
                setFilterDay('all');
                setSearchQuery('');
              }}
            >
              Réinitialiser
            </Button>
          )}
        </div>
        </CardContent>
      </Card>

      {/* Section Liste des cours */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Cours disponibles ({filteredCourses.length})</h2>
        </div>

        {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="overflow-hidden">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 bg-muted" />
                <Skeleton className="h-4 w-1/2 bg-muted" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground">
              {searchQuery ? 'Aucun cours ne correspond à votre recherche.' : 'Aucun cours disponible pour le moment.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => {
            const isEnrolled = enrolledCourseIds.has(course.id);
            const isProcessing = enrollingCourseId === course.id;
            const teacher = teachers[course.teacher_id];

            return (
              <Card 
                key={course.id} 
                className={`overflow-hidden transition-all hover:shadow-lg ${
                  isEnrolled ? 'border-primary/50 bg-primary/5' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{course.name}</CardTitle>
                    {isEnrolled && (
                      <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <Badge variant="outline">{course.type}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={teacher?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {teacher?.username?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {teacher?.username || teacher?.email?.split('@')[0] || 'Enseignant'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{course.day}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{course.start_time} - {course.end_time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>Salle {course.room}</span>
                    </div>
                  </div>

                  {isEnrolled ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleUnenroll(course.id, course.name)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Inscrit
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      onClick={() => handleEnroll(course.id, course.name)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <BookOpen className="h-4 w-4 mr-2" />
                      )}
                      S'inscrire
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}