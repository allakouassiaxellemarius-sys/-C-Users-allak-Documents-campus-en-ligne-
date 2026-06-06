import { useState, useEffect, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { Course, Profile, UserGrade } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  MapPin, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  BookOpen,
  Users,
  GraduationCap,
  ClipboardList,
  FolderOpen,
  History,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  FileText,
  LayoutDashboard,
  Search,
  Bell,
  Star,
  Settings,
  HelpCircle,
  Send,
  Loader2,
  CheckCircle,
  Download,
  Printer, 
  BarChart2,
  Video
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ExamTimerComponent } from '@/components/ExamTimer';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DAYS = [
  { name: 'Lundi', icon: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_3e270c13-80a2-4459-b61c-bfab71a2870e.jpg' },
  { name: 'Mardi', icon: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_dac8bd4b-f4db-449e-9d71-cc3ae4dd5623.jpg' },
  { name: 'Mercredi', icon: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_52a8c3e2-5fe5-4bed-bda9-6d8b729d8c82.jpg' },
  { name: 'Jeudi', icon: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_b166c590-ee89-4176-90f1-a5c0e80656d1.jpg' },
  { name: 'Vendredi', icon: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_74292e4a-7d8a-413e-aa45-ba436bd14416.jpg' },
  { name: 'Samedi', icon: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_54d75d80-d0e6-48a7-a711-163551595874.jpg' },
  { name: 'Dimanche', icon: 'https://miaoda-site-img.s3cdn.medo.dev/images/KLing_d0cbab02-a932-4d53-bcd8-c319367411d6.jpg' }
];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 to 21:00

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [recentMaterials, setRecentMaterials] = useState<any[]>([]);
  const [newMembers, setNewMembers] = useState<Profile[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [userGrades, setUserGrades] = useState<UserGrade[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  // Participation state
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'teacher') {
      navigate('/teacher', { replace: true });
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (user) {
      loadData();

      // Canal pour les modifications de cours
      const coursesChannel = supabase
        .channel('dashboard-courses-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'courses',
          },
          (payload) => {
            console.log('Course change detected:', payload);
            loadData();
            toast.info('Cours mis à jour', { duration: 2000 });
          }
        )
        .subscribe();

      // Canal pour les modifications d'inscriptions
      const enrollmentsChannel = supabase
        .channel('dashboard-enrollments-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'enrollments',
            filter: `student_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Enrollment change detected:', payload);
            loadData();
            if (payload.eventType === 'INSERT') {
              toast.success('Nouvelle inscription confirmée', { duration: 3000 });
            } else if (payload.eventType === 'DELETE') {
              toast.info('Désinscription effectuée', { duration: 2000 });
            }
          }
        )
        .subscribe();

      // Canal pour les annonces
      const announcementsChannel = supabase
        .channel('dashboard-announcements')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'announcements',
          },
          (payload) => {
            console.log('New announcement:', payload);
            toast.success('Nouvelle annonce disponible', { 
              duration: 5000,
              description: 'Consultez la section annonces pour plus de détails'
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(coursesChannel);
        supabase.removeChannel(enrollmentsChannel);
        supabase.removeChannel(announcementsChannel);
      };
    }
  }, [user]);

  // Mise à jour automatique des données si activée dans le profil
  useEffect(() => {
    if (profile?.auto_update && user) {
      const interval = setInterval(() => {
        loadData();
        toast.info("Actualisation automatique des données...", {
          description: "Vos cours et ressources sont à jour.",
          duration: 3000,
        });
      }, 300000); // Toutes les 5 minutes

      return () => clearInterval(interval);
    }
  }, [profile?.auto_update, user]);

  const loadData = async () => {
    if (!user) return;
    try {
      // Split loading to allow partial data display
      api.courses.list(user.id).then(setCourses).catch((e: any) => console.error("Courses load error:", e));
      api.submissions.listForStudent(user.id).then(setSubmissions).catch((e: any) => console.error("Submissions load error:", e));
      api.grades.list(user.id).then(setUserGrades).catch((e: any) => console.error("Grades load error:", e));
      api.profiles.listAll(6).then(setNewMembers).catch((e: any) => console.error("Members load error:", e));
      
      const fetchMaterials = async () => {
        try {
          const { data } = await supabase
            .from('teacher_materials')
            .select(`*, profiles:teacher_id(username, email), courses:course_id(name)`)
            .order('created_at', { ascending: false })
            .limit(3);
          setRecentMaterials(data || []);
        } catch (e) {
          console.error("Materials load error:", e);
        }
      };
        
      const fetchEnrollments = async () => {
        try {
          const { data } = await supabase
            .from('enrollments')
            .select('course_id')
            .eq('student_id', user.id);
          setEnrollments(data || []);
        } catch (e) {
          console.error("Enrollments load error:", e);
        }
      };
        
      const fetchAvailable = async () => {
        try {
          const { data } = await supabase
            .from('courses')
            .select('*, profiles:user_id!inner(role, username, email)')
            .eq('profiles.role', 'teacher')
            .limit(10);
          setAvailableCourses(data || []);
        } catch (e) {
          console.error("Available courses load error:", e);
        }
      };

      // Just wait for everything to mark initial load as complete
      await Promise.allSettled([
        fetchMaterials(),
        fetchEnrollments(),
        fetchAvailable()
      ]);
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const averageGrade = useMemo(() => {
    if (submissions.length === 0 && userGrades.length === 0) return '0.0';
    
    let total = 0;
    let totalCoeff = 0;
    
    // Submissions
    submissions.forEach(sub => {
      if (sub.grade) {
        const parts = sub.grade.split('/');
        const value = parseFloat(parts[0]);
        const maxVal = parts.length > 1 ? parseFloat(parts[1]) : 20;
        if (!isNaN(value) && maxVal > 0) {
          total += (value / maxVal) * 20;
          totalCoeff += 1;
        }
      }
    });

    // User manual grades
    userGrades.forEach(g => {
      total += (Number(g.grade) / Number(g.max_grade)) * 20 * Number(g.coefficient);
      totalCoeff += Number(g.coefficient);
    });
    
    if (totalCoeff === 0) return '0.0';
    return (total / totalCoeff).toFixed(1);
  }, [submissions, userGrades]);

  const coursesByDay = useMemo(() => {
    const grouped: Record<number, Course[]> = {};
    for (let i = 0; i < 7; i++) {
      grouped[i] = courses.filter(c => c.day_of_week === i);
    }
    return grouped;
  }, [courses]);

  const getDayCourses = (dayIndex: number) => {
    return coursesByDay[dayIndex] || [];
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    try {
      setIsEnrolling(courseId);
      await api.enrollments.enroll(courseId, user.id);
      toast.success('Inscrit au cours avec succès !');
      loadData();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.info('Vous êtes déjà inscrit à ce cours.');
      } else {
        toast.error('Erreur lors de l\'inscription.');
      }
    } finally {
      setIsEnrolling(null);
    }
  };

  const handleOpenParticipate = (material: any) => {
    setSelectedMaterial(material);
    setSubmissionContent('');
    setQuizAnswers({});
    setIsDialogOpen(true);
  };

  const handleSendSubmission = async () => {
    if (!selectedMaterial || !user) return;

    let content: any = { text: submissionContent };
    if (selectedMaterial.content_type === 'quiz') {
      content = { ...content, quizAnswers };
    } else if (!submissionContent.trim()) {
      return toast.error('Veuillez remplir votre réponse');
    }

    try {
      setIsSubmitting(true);
      await api.submissions.create({
        material_id: selectedMaterial.id,
        student_id: user.id,
        content: content
      });
      toast.success('Réponse envoyée avec succès !');
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de la réponse');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadFile = async (material: any) => {
    if (!material.data?.file_path) return;
    try {
      const blob = await api.files.download(material.data.file_path);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = material.data.file_name || 'document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Téléchargement démarré');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const isEnrolled = (courseId: string) => {
    return enrollments.some(e => e.course_id === courseId);
  };

  const hasSubmitted = (materialId: string) => {
    return submissions.some(s => s.material_id === materialId);
  };

  const renderWeeklyView = useMemo(() => (
    <section aria-label="Emploi du temps hebdomadaire" className="grid grid-cols-1 lg:grid-cols-7 gap-4 min-h-[600px] border-l border-t rounded-xl overflow-hidden shadow-sm bg-background">
      {DAYS.map((day, idx) => (
        <article key={day.name} className="flex flex-col border-r border-b min-w-[150px]" aria-labelledby={`day-${idx}`}>
          <header className="p-3 bg-muted/30 text-center border-b sticky top-0 z-10 backdrop-blur-sm flex flex-col items-center gap-1">
            <img src={day.icon} alt="" className="h-6 w-6 rounded-full object-cover shadow-sm mb-1" aria-hidden="true" />
            <h3 id={`day-${idx}`} className="font-bold text-[10px] text-primary uppercase tracking-wider">{day.name}</h3>
          </header>
          <div className="flex-1 p-3 space-y-3 bg-slate-50/30 dark:bg-slate-900/10">
            {isLoading ? (
               Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full bg-muted/50" />)
            ) : getDayCourses(idx).length > 0 ? (
              getDayCourses(idx).map((course) => (
                <CourseCard key={course.id} course={course} />
              ))
            ) : (
              <div className="h-20 flex items-center justify-center border-2 border-dashed rounded-lg opacity-40">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Vide</span>
              </div>
            )}
          </div>
        </article>
      ))}
    </section>
  ), [isLoading, getDayCourses]);

  const renderDailyView = useMemo(() => (
    <section aria-label="Aperçu quotidien" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {DAYS.map((day, idx) => (
        <article key={day.name} className="overflow-hidden border-none shadow-md bg-accent/5 rounded-2xl" aria-labelledby={`daily-day-${idx}`}>
          <header className="bg-primary/5 border-b py-4 px-4">
            <h3 id={`daily-day-${idx}`} className="text-lg font-bold flex items-center gap-2">
              <img src={day.icon} alt="" className="h-7 w-7 rounded-full object-cover shadow-sm" aria-hidden="true" />
              {day.name}
            </h3>
          </header>
          <div className="p-4 space-y-4">
            {isLoading ? (
               Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full bg-muted/50" />)
            ) : getDayCourses(idx).length > 0 ? (
              getDayCourses(idx).map((course) => (
                <CourseCard key={course.id} course={course} compact />
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-6">Aucun cours prévu</p>
            )}
          </div>
        </article>
      ))}
    </section>
  ), [isLoading, getDayCourses]);

    const renderStudentSpace = () => (
    <div className="space-y-8">
      {/* Key Metrics Cards */}
      <section aria-label="Statistiques Clés" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
             <Skeleton key={i} className="h-36 w-full rounded-3xl bg-muted/50" />
          ))
        ) : (
          <>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link to="/courses" className="block h-full">
                <Card className="h-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl shadow-blue-500/20 text-white border-none rounded-3xl overflow-hidden relative group">
                  <div className="absolute right-0 top-0 p-10 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2 group-hover:bg-white/20 transition-colors" />
                  <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
                    <div className="p-3 bg-white/20 w-fit rounded-2xl mb-4 backdrop-blur-sm">
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-4xl font-black mb-1">{courses.length}</h3>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-80">Mes Cours</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link to="/materials" className="block h-full">
                <Card className="h-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-xl shadow-emerald-500/20 text-white border-none rounded-3xl overflow-hidden relative group">
                  <div className="absolute right-0 top-0 p-10 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2 group-hover:bg-white/20 transition-colors" />
                  <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
                    <div className="p-3 bg-white/20 w-fit rounded-2xl mb-4 backdrop-blur-sm">
                      <ClipboardList className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-4xl font-black mb-1">{enrollments.length}</h3>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-80">Inscriptions</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link to="/materials" className="block h-full">
                <Card className="h-full bg-gradient-to-br from-violet-500 to-violet-600 shadow-xl shadow-violet-500/20 text-white border-none rounded-3xl overflow-hidden relative group">
                  <div className="absolute right-0 top-0 p-10 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2 group-hover:bg-white/20 transition-colors" />
                  <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
                    <div className="p-3 bg-white/20 w-fit rounded-2xl mb-4 backdrop-blur-sm">
                      <History className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-4xl font-black mb-1">{submissions.length}</h3>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-80">Devoirs Rendus</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link to="/grades" className="block h-full">
                <Card className="h-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-xl shadow-amber-500/20 text-white border-none rounded-3xl overflow-hidden relative group">
                  <div className="absolute right-0 top-0 p-10 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2 group-hover:bg-white/20 transition-colors" />
                  <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
                    <div className="p-3 bg-white/20 w-fit rounded-2xl mb-4 backdrop-blur-sm">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-4xl font-black mb-1">{averageGrade}</h3>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-80">Moyenne Générale</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          </>
        )}
      </section>

      {/* Quick Actions - Visioconférence */}
      <section aria-label="Accès Rapide" className="mb-8">
        <Card className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-2xl">
                  <Video className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Visioconférence</h3>
                  <p className="text-sm text-muted-foreground">
                    Rejoignez ou créez une salle de cours en ligne
                  </p>
                </div>
              </div>
              <Button 
                size="lg" 
                onClick={() => navigate('/videoconference')}
                className="gap-2"
              >
                <Video className="h-5 w-5" />
                Accéder
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="xl:col-span-2 space-y-10">
          
          {/* Pedagogical Resources */}
          <section aria-labelledby="resources-title" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 id="resources-title" className="text-2xl font-black flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                   <BookOpen className="h-5 w-5 text-primary" />
                </div>
                Ressources Pédagogiques
              </h2>
              <Button variant="ghost" size="sm" asChild className="text-xs font-bold text-muted-foreground hover:text-primary">
                <Link to="/materials">Tout voir <ChevronRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {isLoading ? (
                 Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-3xl bg-muted/50" />)
              ) : recentMaterials.length > 0 ? (
                recentMaterials.map((material) => (
                  <motion.div key={material.id} whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                    <Card className="h-full border-none shadow-lg shadow-muted/20 hover:shadow-xl hover:shadow-primary/5 transition-all rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm group">
                      <div className={cn("h-1.5 w-full", 
                        material.content_type === 'course' ? 'bg-blue-500' : 
                        material.content_type === 'quiz' ? 'bg-emerald-500' : 'bg-amber-500'
                      )} />
                      <CardHeader className="pb-3 pt-5 px-6">
                        <div className="flex justify-between items-start mb-3">
                           <Badge variant="secondary" className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg",
                             material.content_type === 'course' ? 'bg-blue-500/10 text-blue-600' : 
                             material.content_type === 'quiz' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                           )}>
                             {material.content_type === 'course' ? 'Support' : material.content_type === 'quiz' ? 'Quiz' : 'Devoir'}
                           </Badge>
                           <span className="text-[10px] text-muted-foreground font-bold bg-muted/50 px-2 py-1 rounded-lg">
                              {new Date(material.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                           </span>
                        </div>
                        <CardTitle className="text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors">{material.title}</CardTitle>
                        {material.courses && (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/50" /> {material.courses.name}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="px-6 pb-6 pt-0">
                        <div className="flex items-center gap-2 mb-4 p-2 bg-muted/30 rounded-xl w-fit">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                              {(material.profiles?.username || 'P').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground font-medium truncate max-w-[150px]">
                            {material.profiles?.username || 'Professeur'}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          {material.data?.file_path && (
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="h-9 px-3 rounded-xl flex-1 text-xs font-bold" 
                              onClick={() => handleDownloadFile(material)}
                            >
                              <Download className="h-3.5 w-3.5 mr-2" /> Télécharger
                            </Button>
                          )}
                          
                          {material.course_id && !isEnrolled(material.course_id) ? (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-9 px-3 rounded-xl flex-1 text-xs font-bold border-primary text-primary hover:bg-primary/10"
                              disabled={isEnrolling === material.course_id}
                              onClick={() => handleEnroll(material.course_id)}
                            >
                              {isEnrolling === material.course_id ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-2" /> : <Plus className="h-3.5 w-3.5 mr-2" />}
                              S'inscrire
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant={hasSubmitted(material.id) && material.content_type !== 'course' ? "secondary" : "default"} 
                              className={cn("h-9 px-3 rounded-xl flex-1 text-xs font-bold shadow-lg",
                                hasSubmitted(material.id) ? "shadow-none" : "shadow-primary/20"
                              )}
                              onClick={() => handleOpenParticipate(material)}
                              disabled={hasSubmitted(material.id) && material.content_type !== 'course'}
                            >
                              {hasSubmitted(material.id) && material.content_type !== 'course' ? (
                                <><CheckCircle className="mr-2 h-3.5 w-3.5" /> Fait</>
                              ) : material.content_type === 'course' ? (
                                <><BookOpen className="mr-2 h-3.5 w-3.5" /> Ouvrir</>
                              ) : (
                                <><Plus className="mr-2 h-3.5 w-3.5" /> Commencer</>
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-muted rounded-[2rem]">
                  <div className="bg-muted/30 p-4 rounded-full w-fit mx-auto mb-4">
                     <FolderOpen className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">Aucune ressource récente disponible.</p>
                </div>
              )}
            </div>
          </section>

          {/* Teacher Courses */}
          <section aria-labelledby="courses-title" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 id="courses-title" className="text-2xl font-black flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-xl">
                   <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                Cours Disponibles
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableCourses.length > 0 ? (
                availableCourses.map((c) => (
                  <motion.div key={c.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Card className="border-none shadow-sm hover:shadow-md transition-all bg-accent/5 rounded-2xl overflow-hidden">
                      <CardContent className="p-0 flex flex-col h-full">
                         <div className="p-5 flex-1">
                           <div className="flex justify-between items-start mb-3">
                             <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider bg-background">{c.type}</Badge>
                             <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-background px-2 py-1 rounded-lg">
                               <User className="h-3 w-3" /> {c.profiles?.username || c.professor}
                             </div>
                           </div>
                           <h3 className="font-bold text-base mb-1">{c.name}</h3>
                           <p className="text-xs text-muted-foreground line-clamp-2">{c.description || 'Aucune description disponible pour ce cours.'}</p>
                         </div>
                         <div className="p-3 bg-background/50 border-t flex justify-end">
                            {isEnrolled(c.id) ? (
                              <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-600 font-bold border-emerald-500/20 px-3 py-1.5 rounded-lg">
                                <CheckCircle className="h-3 w-3" /> Inscrit
                              </Badge>
                            ) : (
                              <Button 
                                size="sm" 
                                className="h-8 text-[10px] font-black rounded-lg" 
                                onClick={() => handleEnroll(c.id)}
                                disabled={isEnrolling === c.id}
                              >
                                {isEnrolling === c.id ? <Loader2 className="animate-spin h-3 w-3 mr-2" /> : <Plus className="h-3 w-3 mr-2" />}
                                Rejoindre
                              </Button>
                            )}
                         </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-10 text-center border-2 border-dashed rounded-3xl">
                  <p className="text-muted-foreground italic">Aucun cours externe disponible pour le moment.</p>
                </div>
              )}
            </div>
          </section>

          {/* New Members */}
          <section aria-labelledby="members-title" className="space-y-6 pt-6 border-t border-dashed">
             <div className="flex items-center justify-between">
                <h3 id="members-title" className="text-lg font-bold flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" /> Nouveaux inscrits
                </h3>
                <Link to="/directory" className="text-xs font-bold text-primary hover:underline">Voir l'annuaire</Link>
             </div>
             <div className="flex flex-wrap gap-4">
                {newMembers.slice(0, 5).map(member => (
                  <Link key={member.id} to={`/profile/${member.id}`} className="group relative">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-sm group-hover:scale-110 transition-transform ring-2 ring-transparent group-hover:ring-primary/20">
                      <AvatarImage src={member.avatar_url} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-black text-xs">
                        {(member.username || 'U').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                ))}
                <Link to="/directory" className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors border-2 border-dashed border-muted-foreground/20 text-xs font-bold">
                   +{Math.max(0, newMembers.length - 5)}
                </Link>
             </div>
          </section>
        </div>

        {/* Sidebar Widgets */}
        <aside className="space-y-8">
           {/* Shortcuts */}
           <Card className="border-none shadow-xl shadow-primary/5 rounded-[2rem] overflow-hidden bg-card relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-blue-500" />
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                   <div className="p-1.5 bg-primary/10 rounded-lg">
                      <LayoutDashboard className="h-4 w-4 text-primary" />
                   </div>
                   Accès Rapide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                 {[
                   { to: '/courses', icon: BookOpen, label: 'Mes Cours', sub: 'Emploi du temps', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                   { to: '/materials', icon: FileText, label: 'Supports', sub: 'Documents partagés', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                   { to: '/files', icon: FolderOpen, label: 'Fichiers', sub: 'Stockage personnel', color: 'text-amber-500', bg: 'bg-amber-500/10' },
                   { to: '/groups', icon: Users, label: 'Groupes', sub: 'Travail collaboratif', color: 'text-purple-500', bg: 'bg-purple-500/10' },
                 ].map((item, i) => (
                   <Button key={i} variant="ghost" className="w-full justify-start gap-4 h-auto py-3 px-4 rounded-2xl hover:bg-muted/50 border border-transparent hover:border-muted-foreground/10 transition-all group" asChild>
                      <Link to={item.to}>
                         <div className={cn("p-2.5 rounded-xl transition-colors group-hover:bg-background shadow-sm", item.bg)}>
                            <item.icon className={cn("h-5 w-5", item.color)} />
                         </div>
                         <div className="flex flex-col items-start gap-0.5">
                            <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{item.label}</span>
                            <span className="text-[10px] text-muted-foreground font-medium">{item.sub}</span>
                         </div>
                         <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30 group-hover:text-primary/50" />
                      </Link>
                   </Button>
                 ))}
              </CardContent>
           </Card>

           {/* Important Notice */}
           <Card className="border-none shadow-xl shadow-amber-500/5 rounded-[2rem] overflow-hidden bg-gradient-to-b from-amber-500/10 to-transparent relative">
              <CardHeader className="pb-2 relative z-10">
                 <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-black text-sm uppercase tracking-wider">À ne pas manquer</span>
                 </div>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                 {courses.filter(c => c.day_of_week === (new Date().getDay() || 7) - 1).length > 0 ? (
                    <div className="space-y-3">
                       <p className="text-xs font-medium text-muted-foreground">Cours importants aujourd'hui :</p>
                       {courses.filter(c => c.day_of_week === (new Date().getDay() || 7) - 1).slice(0, 3).map(c => (
                         <div key={c.id} className="flex items-center gap-3 p-3 bg-background/80 backdrop-blur-sm rounded-2xl shadow-sm border border-amber-500/10">
                            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400">
                               <Clock className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="text-xs font-black truncate">{c.name}</p>
                               <p className="text-[10px] text-muted-foreground font-mono">{c.start_time.slice(0, 5)}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 ) : (
                    <div className="py-6 text-center bg-background/50 rounded-2xl border border-dashed border-amber-500/20">
                      <Star className="h-8 w-8 text-amber-500/30 mx-auto mb-2 animate-pulse" />
                      <p className="text-[10px] text-muted-foreground italic px-4">Aucun cours prioritaire détecté. Profitez-en pour réviser !</p>
                    </div>
                 )}
              </CardContent>
           </Card>

           {/* Help Box */}
           <Card className="border-none shadow-lg rounded-[2rem] overflow-hidden bg-primary text-primary-foreground relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
              <div className="absolute -right-6 -bottom-6 h-24 w-24 bg-white/10 rounded-full blur-2xl" />
              
              <CardHeader className="pb-2 relative">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" /> Besoin d'assistance ?
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-4 relative">
                 <p className="text-xs opacity-90 leading-relaxed font-medium">Une question sur vos cours ou un problème technique ? La communauté est là pour vous.</p>
                 <Button variant="secondary" size="sm" className="w-full text-xs font-bold h-9 rounded-xl shadow-lg shadow-black/10" asChild>
                    <Link to="/suggestions">Accéder au support</Link>
                 </Button>
              </CardContent>
           </Card>
        </aside>
      </div>
    </div>
  );

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-10 pb-12"
    >
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {/* ... (Dialog content same as before) */}
        <DialogContent className="max-w-lg rounded-3xl border-primary/10 shadow-2xl backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{selectedMaterial?.title}</DialogTitle>
            <DialogDescription className="font-medium italic">
              {selectedMaterial?.content_type === 'quiz' ? 'Remplissez le quiz pour valider vos connaissances.' : 'Veuillez soumettre votre travail avant la date limite.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl text-sm leading-relaxed text-muted-foreground italic">
              {selectedMaterial?.description || 'Aucune consigne supplémentaire fournie.'}
            </div>
            
            {selectedMaterial?.content_type === 'quiz' && selectedMaterial?.data?.questions ? (
              <div className="space-y-6">
                {selectedMaterial.data.questions.map((q: any, qIdx: number) => (
                  <div key={qIdx} className="space-y-4 p-5 border rounded-2xl bg-card hover:border-primary/20 transition-all shadow-sm">
                    <p className="font-black text-sm flex items-center gap-2">
                       <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">{qIdx + 1}</span>
                       {q.question}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {q.options.map((opt: string, oIdx: number) => (
                        <Button 
                          key={oIdx} 
                          variant={quizAnswers[qIdx] === oIdx ? 'default' : 'outline'}
                          className={cn(
                             "justify-start h-auto py-4 px-5 text-xs rounded-xl transition-all duration-300",
                             quizAnswers[qIdx] === oIdx ? "shadow-lg shadow-primary/20" : "hover:bg-primary/5 hover:border-primary/20"
                          )}
                          onClick={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                        >
                          <span className={cn(
                             "w-6 h-6 flex items-center justify-center rounded-full border mr-3 text-[10px] font-bold shrink-0 transition-colors",
                             quizAnswers[qIdx] === oIdx ? "bg-white text-primary border-white" : "text-muted-foreground"
                          )}>
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span className="font-medium">{opt}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <Label htmlFor="submission-content" className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Votre réponse / Contenu du devoir</Label>
                <Textarea 
                  id="submission-content" 
                  value={submissionContent} 
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  placeholder="Expliquez brièvement votre travail ou collez un lien vers votre rendu..."
                  rows={8}
                  className="rounded-2xl border-primary/10 focus:ring-primary/20 p-4 resize-none transition-all duration-300"
                />
              </div>
            )}
          </div>
          <DialogFooter className="mt-4 border-t pt-4 flex gap-3">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold">Annuler</Button>
            <Button 
              onClick={handleSendSubmission} 
              disabled={isSubmitting || (selectedMaterial?.content_type !== 'quiz' && !submissionContent.trim())}
              className="font-bold rounded-xl px-8 shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Envoyer ma réponse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header Section */}
      <motion.section variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pb-10 border-b border-white/10">
        <div className="space-y-4">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit shadow-sm">
             <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
             Espace Universitaire Certifié
          </Badge>
          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-foreground/40 pb-2">
              Bonjour, {user?.email?.split('@')[0]} 👋
            </h1>
            <p className="text-lg text-muted-foreground font-medium max-w-2xl leading-relaxed">
              Bienvenue sur votre plateforme académique sécurisée. Suivez votre progression, vos cours et vos examens en temps réel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
             <Button 
               variant="outline" 
               className="rounded-2xl h-10 px-5 font-black text-[10px] uppercase tracking-widest border-primary/20 hover:bg-primary/5 shadow-sm transition-all hover:translate-y-[-1px]" 
               onClick={() => window.dispatchEvent(new CustomEvent('open-usage-tour'))}
             >
                <HelpCircle className="h-4 w-4 mr-2 text-primary" /> Guide & Démo
             </Button>
             <Button 
               variant="secondary" 
               asChild 
               className="rounded-2xl h-10 px-5 font-black text-[10px] uppercase tracking-widest shadow-sm transition-all hover:translate-y-[-1px]"
             >
                <Link to="/updates">
                  <History className="h-4 w-4 mr-2" /> Nouveautés
                </Link>
             </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button asChild className="rounded-2xl h-14 px-8 shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:translate-y-[-2px] transition-all duration-300 font-bold text-base">
            <Link to="/courses">
              <Plus className="mr-2 h-6 w-6" /> Nouveau cours
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => window.print()} title="Imprimer le planning" className="rounded-2xl h-14 w-14 hover:bg-primary/5 hover:border-primary/20 transition-all shadow-md group">
              <Printer className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-2xl h-14 w-14 hover:bg-primary/5 hover:border-primary/20 transition-all shadow-md group" asChild>
               <Link to="/profile">
                  <Settings className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
               </Link>
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Exam Timer */}
      <motion.div variants={itemVariants}>
        <ExamTimerComponent profile={profile} />
      </motion.div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="student-space" className="w-full">
        <motion.nav variants={itemVariants} className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6 bg-background/40 backdrop-blur-xl p-3 rounded-[2.5rem] border border-white/10 shadow-xl">
          <TabsList className="bg-muted/30 p-1.5 rounded-[2rem] h-auto gap-2">
            <TabsTrigger value="student-space" className="rounded-[1.5rem] h-11 px-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-500 font-black text-sm uppercase tracking-widest">
               Dashboard
            </TabsTrigger>
            <TabsTrigger value="daily" className="rounded-[1.5rem] h-11 px-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-500 font-black text-sm uppercase tracking-widest">
               Journalier
            </TabsTrigger>
            <TabsTrigger value="weekly" className="rounded-[1.5rem] h-11 px-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-500 font-black text-sm uppercase tracking-widest">
               Semaine
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-3 pr-4">
             <Button variant="ghost" size="icon" className="h-11 w-11 hover:bg-primary/5 rounded-2xl transition-all" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
               <ChevronLeft className="h-6 w-6" />
             </Button>
             <div className="bg-primary/5 px-6 py-2.5 rounded-2xl border border-primary/10 shadow-inner flex items-center gap-3">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                  {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMMM yyyy', { locale: fr })}
                </span>
             </div>
             <Button variant="ghost" size="icon" className="h-11 w-11 hover:bg-primary/5 rounded-2xl transition-all" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
               <ChevronRight className="h-6 w-6" />
             </Button>
          </div>
        </motion.nav>

        <AnimatePresence mode="wait">
          <TabsContent value="weekly" className="m-0 focus-visible:outline-none">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
              {renderWeeklyView}
            </motion.div>
          </TabsContent>

          <TabsContent value="daily" className="m-0 focus-visible:outline-none">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
               {renderDailyView}
             </motion.div>
          </TabsContent>

          <TabsContent value="student-space" className="m-0 focus-visible:outline-none">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              {renderStudentSpace()}
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      {courses.length === 0 && !isLoading && (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-2 py-20 text-center bg-primary/[0.02] rounded-[3rem] border-primary/20 shadow-inner">
            <CardContent className="flex flex-col items-center max-w-lg mx-auto">
              <div className="p-8 bg-primary/5 rounded-full mb-8 relative">
                 <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping opacity-30" />
                 <BookOpen className="h-20 w-20 text-primary opacity-80" />
              </div>
              <h3 className="text-3xl font-black mb-4 tracking-tighter">Votre emploi du temps est vide</h3>
              <p className="text-muted-foreground text-lg mb-10 leading-relaxed font-medium">
                Préparez votre semestre en ajoutant vos premiers cours universitaires pour bénéficier d'une vue d'ensemble structurée.
              </p>
              <Button asChild size="lg" className="rounded-2xl h-14 px-10 text-lg font-black shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                 <Link to="/courses">Démarrer ma configuration</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

const CourseCard = memo(({ course, compact = false }: { course: Course; compact?: boolean }) => {
  const navigate = useNavigate();
  const typeColors: Record<string, string> = {
    CM: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
    TD: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
    TP: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  };

  return (
    <article 
      className="group hover:shadow-lg transition-all duration-300 border-l-4 rounded-xl bg-card overflow-hidden" 
      style={{ borderLeftColor: course.color || '#3b82f6' }}
      aria-labelledby={`course-${course.id}`}
    >
      <div className={compact ? "p-3" : "p-4"}>
        <header className="flex justify-between items-start mb-2 gap-2">
          <h4 id={`course-${course.id}`} className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {course.name}
          </h4>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${typeColors[course.type]}`}>
            {course.type}
          </Badge>
        </header>
        
        <div className="space-y-1.5">
          <div className="flex items-center text-[11px] text-muted-foreground" aria-label={`Horaire: de ${course.start_time.slice(0, 5)} à ${course.end_time.slice(0, 5)}`}>
            <Clock className="mr-1.5 h-3 w-3" aria-hidden="true" />
            <span className="font-medium">{course.start_time.slice(0, 5)} - {course.end_time.slice(0, 5)}</span>
          </div>
          
          {course.room && (
            <div className="flex items-center text-[11px] text-muted-foreground" aria-label={`Salle: ${course.room}`}>
              <MapPin className="mr-1.5 h-3 w-3" aria-hidden="true" />
              <span>Salle: {course.room}</span>
            </div>
          )}
          
          {!compact && course.professor && (
            <div className="flex items-center text-[11px] text-muted-foreground" aria-label={`Professeur: ${course.professor}`}>
              <User className="mr-1.5 h-3 w-3" aria-hidden="true" />
              <span className="truncate">{course.professor}</span>
            </div>
          )}
          
          {course.video_room_enabled && course.video_room_name && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/videoconference?room=${course.video_room_name}`)}
              className="w-full mt-2 gap-2 text-xs h-7"
            >
              <Video className="h-3 w-3" />
              Rejoindre la visio
            </Button>
          )}
        </div>
      </div>
    </article>
  );
});

CourseCard.displayName = 'CourseCard';