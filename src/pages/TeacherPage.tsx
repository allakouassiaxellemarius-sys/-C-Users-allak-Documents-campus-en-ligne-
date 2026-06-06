import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  FileText, 
  ClipboardCheck, 
  BookOpen, 
  Send, 
  Trash2, 
  Clock, 
  Eye,
  CheckCircle,
  MessageSquare,
  AlertCircle,
  Loader2,
  GraduationCap,
  Calendar,
  Users,
  Check,
  X,
  History,
  ClipboardList,
  UserMinus,
  BarChart3,
  Download,
  Bell,
  TrendingUp,
  Video
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export default function TeacherPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'course' | 'quiz' | 'assignment'>('course');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const [viewingSubmissions, setViewingSubmissions] = useState<any[]>([]);
  const [isSubViewOpen, setIsSubViewOpen] = useState(false);
  const [gradingSub, setGradingSub] = useState<any>(null);
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<any>(null);

  // Attendance states
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, string>>({});
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);

  // Student management states
  const [allEnrollments, setAllEnrollments] = useState<any[]>([]);
  const [isManagingStudents, setIsManagingStudents] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');

  // Statistics states
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    attendanceRate: 0,
    pendingSubmissions: 0
  });

  // Announcement states
  const [announcementCourseId, setAnnouncementCourseId] = useState<string>('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);

  // Filtered enrollments based on search and course filter
  const filteredEnrollments = allEnrollments.filter(enrollment => {
    const matchesSearch = studentSearchQuery === '' || 
      enrollment.profiles?.username?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      enrollment.profiles?.email?.toLowerCase().includes(studentSearchQuery.toLowerCase());
    
    const matchesCourse = selectedCourseFilter === 'all' || enrollment.course_id === selectedCourseFilter;
    
    return matchesSearch && matchesCourse;
  });

  useEffect(() => {
    loadInitialData();

    if (user) {
      // Abonnement Realtime pour les inscriptions aux cours
      const enrollmentsChannel = supabase
        .channel('teacher-enrollments-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'enrollments'
          },
          (payload) => {
            console.log('Enrollment change detected:', payload);
            loadInitialData();
            if (payload.eventType === 'INSERT') {
              toast.success('Nouvel étudiant inscrit', { duration: 3000 });
            } else if (payload.eventType === 'DELETE') {
              toast.info('Étudiant désinscrit', { duration: 2000 });
            }
          }
        )
        .subscribe();

      // Abonnement pour les modifications de cours
      const coursesChannel = supabase
        .channel('teacher-courses-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'courses',
            filter: `teacher_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Course change detected:', payload);
            loadInitialData();
            toast.info('Cours mis à jour', { duration: 2000 });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(enrollmentsChannel);
        supabase.removeChannel(coursesChannel);
      };
    }
  }, [profile, user]);

  const loadInitialData = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const [materialsData, coursesData, enrollmentsData, submissionsData] = await Promise.all([
        api.materials.list(),
        api.courses.list(user.id),
        api.enrollments.listByTeacher(user.id),
        api.submissions.listAll()
      ]);
      
      if (profile?.role === 'admin') {
        setMaterials(materialsData);
      } else {
        setMaterials(materialsData.filter(m => m.teacher_id === user?.id));
      }
      setCourses(coursesData);
      setAllEnrollments(enrollmentsData);
      
      // Calculer les statistiques
      const uniqueStudents = new Set(enrollmentsData.map((e: any) => e.student_id));
      const pendingSubs = submissionsData.filter((s: any) => 
        s.status === 'submitted' && 
        materialsData.some(m => m.id === s.material_id && m.teacher_id === user.id)
      );
      
      setStats({
        totalStudents: uniqueStudents.size,
        totalCourses: coursesData.length,
        attendanceRate: 0, // Sera calculé après le chargement de l'assiduité
        pendingSubmissions: pendingSubs.length
      });
      
      if (coursesData.length > 0) {
        setSelectedCourseId(coursesData[0].id);
        setAnnouncementCourseId(coursesData[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      loadAttendance();
    }
  }, [selectedCourseId, attendanceDate]);

  const loadAttendance = async () => {
    try {
      setIsAttendanceLoading(true);
      const [students, attendance] = await Promise.all([
        api.attendance.getEnrolledStudents(selectedCourseId),
        api.attendance.list(selectedCourseId, attendanceDate)
      ]);
      setEnrolledStudents(students);
      const initialAttendance: Record<string, string> = {};
      attendance.forEach((a: any) => {
        initialAttendance[a.student_id] = a.status;
      });
      setAttendanceData(initialAttendance);
      
      // Calculer le taux de présence
      if (attendance.length > 0) {
        const presentCount = attendance.filter((a: any) => a.status === 'present').length;
        const rate = Math.round((presentCount / attendance.length) * 100);
        setStats(prev => ({ ...prev, attendanceRate: rate }));
      }
    } catch (error) {
      console.error('Failed to load attendance:', error);
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  const markAttendance = async (studentId: string, status: string) => {
    try {
      await api.attendance.mark({
        course_id: selectedCourseId,
        student_id: studentId,
        date: attendanceDate,
        status: status
      });
      setAttendanceData(prev => ({ ...prev, [studentId]: status }));
      toast.success('Présence mise à jour');
    } catch (error) {
      toast.error('Erreur lors du marquage');
    }
  };

  const handleAddQuestion = () => {
    setQuizQuestions([...quizQuestions, { question: '', options: ['', '', '', ''], correctOption: 0 }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQs = [...quizQuestions];
    newQs[index][field] = value;
    setQuizQuestions(newQs);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const newQs = [...quizQuestions];
    newQs[qIndex].options[oIndex] = value;
    setQuizQuestions(newQs);
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !user || !selectedCourseId) {
      toast.error('Veuillez remplir le titre et sélectionner un cours.');
      return;
    }

    try {
      setIsAdding(true);
      let materialData: any = {};
      
      if (newType === 'quiz') {
        materialData = { questions: quizQuestions };
      } else if (newFile) {
        // Upload file first
        const uploadedFile = await api.files.upload(user.id, newFile, selectedCourseId);
        materialData = { 
          file_path: uploadedFile.file_path, 
          file_name: uploadedFile.name,
          file_size: uploadedFile.file_size,
          file_type: uploadedFile.file_type
        };
      }

      await api.materials.create({
        teacher_id: user.id,
        course_id: selectedCourseId,
        title: newTitle,
        description: newDesc,
        content_type: newType,
        data: materialData
      });
      setNewTitle('');
      setNewDesc('');
      setQuizQuestions([]);
      setNewFile(null);
      setIsAddOpen(false);
      toast.success('Contenu pédagogique ajouté avec succès !');
      loadInitialData();
    } catch (error) {
      toast.error('Erreur lors de l\'ajout du contenu');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce contenu ?')) return;
    try {
      await api.materials.delete(id);
      toast.success('Contenu supprimé');
      loadInitialData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleRemoveStudent = async (enrollmentId: string, studentName: string) => {
    if (!confirm(`Voulez-vous vraiment retirer ${studentName} de ce cours ?`)) return;
    try {
      setIsManagingStudents(true);
      const enrollment = allEnrollments.find(e => e.id === enrollmentId);
      if (enrollment) {
        await api.enrollments.unenroll(enrollment.course_id, enrollment.student_id);
        toast.success(`${studentName} a été retiré du cours`);
        const updatedEnrollments = await api.enrollments.listByTeacher(user!.id);
        setAllEnrollments(updatedEnrollments);
      }
    } catch (error) {
      toast.error('Erreur lors du retrait de l\'étudiant');
    } finally {
      setIsManagingStudents(false);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementCourseId || !announcementTitle || !announcementMessage) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      setIsSendingAnnouncement(true);
      const courseEnrollments = allEnrollments.filter(e => e.course_id === announcementCourseId);
      
      // Créer une notification pour chaque étudiant inscrit
      const notifications = courseEnrollments.map((enrollment: any) => ({
        user_id: enrollment.student_id,
        title: announcementTitle,
        message: announcementMessage,
        type: 'announcement',
        is_read: false
      }));

      await api.notifications.createBulk(notifications);
      
      toast.success(`Annonce envoyée à ${courseEnrollments.length} étudiant(s)`);
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setIsAnnouncementOpen(false);
    } catch (error) {
      console.error('Failed to send announcement:', error);
      toast.error('Erreur lors de l\'envoi de l\'annonce');
    } finally {
      setIsSendingAnnouncement(false);
    }
  };

  const exportAttendanceToCSV = () => {
    if (!selectedCourseId || enrolledStudents.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const course = courses.find(c => c.id === selectedCourseId);
    const csvRows = [
      ['Nom', 'Email', 'Statut', 'Date'],
      ...enrolledStudents.map(student => [
        student.username || student.email?.split('@')[0] || 'Inconnu',
        student.email || '',
        attendanceData[student.id] === 'present' ? 'Présent' : 
        attendanceData[student.id] === 'absent' ? 'Absent' : 'Non marqué',
        attendanceDate
      ])
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `presence_${course?.name}_${attendanceDate}.csv`;
    link.click();
    toast.success('Fichier CSV téléchargé');
  };

  const handleViewSubmissions = async (material: any) => {
    setCurrentMaterial(material);
    try {
      const data = await api.submissions.listForMaterial(material.id);
      setViewingSubmissions(data);
      setIsSubViewOpen(true);
    } catch (error) {
      toast.error('Échec du chargement des soumissions');
    }
  };

  const handleOpenGrading = (submission: any) => {
    setGradingSub(submission);
    setGrade(submission.grade || '');
    setFeedback(submission.feedback || '');
    setIsGradingOpen(true);
  };

  const handleSaveGrade = async () => {
    if (!gradingSub) return;
    try {
      setIsGrading(true);
      await api.submissions.grade(gradingSub.id, grade, feedback);
      toast.success('Note et feedback enregistrés');
      setIsGradingOpen(false);
      const data = await api.submissions.listForMaterial(gradingSub.material_id);
      setViewingSubmissions(data);
    } catch (error) {
      toast.error('Erreur lors de la notation');
    } finally {
      setIsGrading(false);
    }
  };

  if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h2 className="text-2xl font-bold">Accès non autorisé</h2>
        <p className="text-muted-foreground text-center max-w-sm">Cet espace est réservé aux enseignants.</p>
        <Button onClick={() => window.history.back()}>Retour</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            Espace Enseignant
          </h1>
          <p className="text-muted-foreground">Bonjour, {user?.email?.split('@')[0]} ! Gérez vos cours et suivez vos étudiants.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="shadow-sm font-bold"
            onClick={() => navigate('/teacher/maintenance')}
          >
            <ClipboardCheck className="mr-2 h-4 w-4" /> Maintenance
          </Button>
          <Dialog open={isAnnouncementOpen} onOpenChange={setIsAnnouncementOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="shadow-sm font-bold">
                <Bell className="mr-2 h-4 w-4" /> Annonce
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Envoyer une Annonce</DialogTitle>
                <DialogDescription>
                  Envoyez un message à tous les étudiants d'un cours
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSendAnnouncement} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Cours</Label>
                  <Select value={announcementCourseId} onValueChange={setAnnouncementCourseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un cours" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ann-title">Titre</Label>
                  <Input
                    id="ann-title"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="Titre de l'annonce"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ann-message">Message</Label>
                  <Textarea
                    id="ann-message"
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                    placeholder="Votre message..."
                    rows={4}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSendingAnnouncement}>
                    {isSendingAnnouncement ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Envoyer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-sm font-bold">
                <Plus className="mr-2 h-4 w-4" /> Créer un contenu
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouveau Contenu Pédagogique</DialogTitle>
                <DialogDescription>Remplissez les détails pour vos étudiants.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddMaterial} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre</Label>
                  <Input 
                    id="title" 
                    value={newTitle} 
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="ex: Cours d'Algèbre Linéaire"
                    required
                  />
                </div>
                <div className="space-y-2">
                   <Label>Associer à un cours</Label>
                   <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un cours" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description / Consignes</Label>
                  <Textarea 
                    id="desc" 
                    value={newDesc} 
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Décrivez brièvement le contenu ou donnez des instructions..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type de contenu</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      type="button" 
                      variant={newType === 'course' ? 'default' : 'outline'}
                      onClick={() => setNewType('course')}
                      className="w-full text-xs h-9 px-2"
                    >
                      <BookOpen className="mr-1 h-3 w-3" /> Support
                    </Button>
                    <Button 
                      type="button" 
                      variant={newType === 'quiz' ? 'default' : 'outline'}
                      onClick={() => setNewType('quiz')}
                      className="w-full text-xs h-9 px-2"
                    >
                      <ClipboardCheck className="mr-1 h-3 w-3" /> Quiz
                    </Button>
                    <Button 
                      type="button" 
                      variant={newType === 'assignment' ? 'default' : 'outline'}
                      onClick={() => setNewType('assignment')}
                      className="w-full text-xs h-9 px-2"
                    >
                      <FileText className="mr-1 h-3 w-3" /> Devoir
                    </Button>
                  </div>
                </div>

                {newType !== 'quiz' && (
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="file-upload">Fichier à partager (Optionnel)</Label>
                    <div className="flex items-center gap-3">
                      <Input 
                        id="file-upload" 
                        type="file" 
                        onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                        className="cursor-pointer h-10 py-1.5"
                      />
                      {newFile && (
                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => setNewFile(null)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {newFile && (
                      <p className="text-[10px] text-muted-foreground italic font-bold">
                        {(newFile.size / 1024 / 1024).toFixed(2)} MB - {newFile.name}
                      </p>
                    )}
                  </div>
                )}

                {newType === 'quiz' && (
                  <div className="space-y-4 border-t pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <Label className="font-bold text-primary">Questions du Quiz</Label>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddQuestion}>
                        <Plus className="h-3 w-3 mr-1" /> Ajouter Question
                      </Button>
                    </div>
                    {quizQuestions.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-4">Ajoutez votre première question...</p>
                    )}
                    {quizQuestions.map((q, qIdx) => (
                      <Card key={qIdx} className="p-4 space-y-3 bg-accent/5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-primary">Question {qIdx + 1}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => setQuizQuestions(quizQuestions.filter((_, i) => i !== qIdx))}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input 
                          placeholder="Quelle est la capitale de la France ?" 
                          value={q.question} 
                          onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          {q.options.map((opt: string, oIdx: number) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <input 
                                type="radio" 
                                name={`q-${qIdx}`} 
                                checked={q.correctOption === oIdx}
                                onChange={() => updateQuestion(qIdx, 'correctOption', oIdx)}
                                className="accent-primary"
                              />
                              <Input 
                                placeholder={`Réponse ${oIdx + 1}`} 
                                value={opt} 
                                onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                <DialogFooter className="mt-8 border-t pt-4">
                  <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>Annuler</Button>
                  <Button type="submit" disabled={isAdding} className="font-bold">
                    {isAdding ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                    Créer le contenu
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Cours gérés</p>
              <h3 className="text-xl font-bold">{courses.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <FileText className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Contenus créés</p>
              <h3 className="text-xl font-bold">{materials.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Users className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Étudiants</p>
              <h3 className="text-xl font-bold">{enrolledStudents.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20 shadow-sm cursor-pointer hover:shadow-md transition-all"
          onClick={() => navigate('/videoconference')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Video className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Visioconférence</p>
              <h3 className="text-sm font-bold text-blue-600">Démarrer</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Visioconférence */}
      <Card className="bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-2xl">
                <Video className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Créer une Salle de Cours Virtuelle</h3>
                <p className="text-sm text-muted-foreground">
                  Lancez une visioconférence pour vos étudiants
                </p>
              </div>
            </div>
            <Button 
              size="lg" 
              onClick={() => navigate('/videoconference')}
              className="gap-2"
            >
              <Video className="h-5 w-5" />
              Démarrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ display: 'none' }}>
        <Card className="bg-blue-500/5 border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <ClipboardCheck className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Présence</p>
              <h3 className="text-xl font-bold">
                {enrolledStudents.length > 0 ? 
                  Math.round((Object.values(attendanceData).filter(s => s === 'present').length / enrolledStudents.length) * 100) : 0}%
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Étudiants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">Inscrits dans vos cours</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Cours Actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground mt-1">Cours que vous enseignez</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Devoirs en Attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats.pendingSubmissions}</div>
            <p className="text-xs text-muted-foreground mt-1">À corriger</p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Taux de Présence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Moyenne globale</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="attendance" className="gap-2">
            <Users className="h-4 w-4" /> Appel & Présence
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2">
            <GraduationCap className="h-4 w-4" /> Gestion Étudiants
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Statistiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <Card className="shadow-lg border-primary/10 overflow-hidden">
            <CardHeader className="bg-accent/5 border-b pb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Feuille d'Appel</CardTitle>
                  <CardDescription>Gérez la présence des étudiants pour vos cours.</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-[200px]">
                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un cours" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input 
                    type="date" 
                    className="w-auto h-10" 
                    value={attendanceDate} 
                    onChange={(e) => setAttendanceDate(e.target.value)} 
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={exportAttendanceToCSV}
                    disabled={enrolledStudents.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exporter CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isAttendanceLoading ? (
                <div className="p-8 space-y-4">
                  {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : enrolledStudents.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground italic">
                  Aucun étudiant inscrit à ce cours. Les étudiants doivent s'inscrire pour apparaître ici.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Étudiant</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Statut Actuel</TableHead>
                      <TableHead className="text-right">Actions de marquage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrolledStudents.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex items-center gap-3 font-bold">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={s.avatar_url} />
                              <AvatarFallback>{s.email.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            {s.username || s.email.split('@')[0]}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.email}</TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={attendanceData[s.id] === 'present' ? 'default' : attendanceData[s.id] === 'absent' ? 'destructive' : attendanceData[s.id] === 'late' ? 'secondary' : 'outline'}
                            className={attendanceData[s.id] === 'present' ? 'bg-emerald-500' : attendanceData[s.id] === 'late' ? 'bg-amber-500 text-white' : ''}
                          >
                            {attendanceData[s.id] ? attendanceData[s.id].toUpperCase() : 'Non marqué'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className={`h-8 w-8 p-0 rounded-full hover:bg-emerald-100 hover:text-emerald-700 ${attendanceData[s.id] === 'present' ? 'bg-emerald-100 text-emerald-700' : ''}`}
                              onClick={() => markAttendance(s.id, 'present')}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className={`h-8 w-8 p-0 rounded-full hover:bg-amber-100 hover:text-amber-700 ${attendanceData[s.id] === 'late' ? 'bg-amber-100 text-amber-700' : ''}`}
                              onClick={() => markAttendance(s.id, 'late')}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className={`h-8 w-8 p-0 rounded-full hover:bg-red-100 hover:text-red-700 ${attendanceData[s.id] === 'absent' ? 'bg-red-100 text-red-700' : ''}`}
                              onClick={() => markAttendance(s.id, 'absent')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <Card className="border-primary/10 shadow-md">
            <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent border-b">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <GraduationCap className="h-6 w-6 text-primary" />
                Gestion des Étudiants
              </CardTitle>
              <CardDescription>
                Gérez les inscriptions de vos étudiants dans vos cours
              </CardDescription>
              
              {/* Filtres et recherche */}
              <div className="flex flex-col md:flex-row gap-3 mt-4">
                <div className="flex-1">
                  <Input
                    placeholder="Rechercher un étudiant..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={selectedCourseFilter} onValueChange={setSelectedCourseFilter}>
                  <SelectTrigger className="w-full md:w-[250px]">
                    <SelectValue placeholder="Filtrer par cours" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les cours</SelectItem>
                    {courses.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl bg-muted" />
                  ))}
                </div>
              ) : filteredEnrollments.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed rounded-2xl">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                  <p className="text-muted-foreground italic">
                    {studentSearchQuery || selectedCourseFilter !== 'all' 
                      ? 'Aucun étudiant ne correspond à vos critères de recherche.'
                      : 'Aucun étudiant inscrit dans vos cours pour le moment.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {courses.map((course) => {
                    const courseEnrollments = filteredEnrollments.filter(e => e.course_id === course.id);
                    if (courseEnrollments.length === 0) return null;
                    
                    return (
                      <Card key={course.id} className="border-l-4 border-l-primary/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            {course.name}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {courseEnrollments.length} étudiant{courseEnrollments.length > 1 ? 's' : ''} inscrit{courseEnrollments.length > 1 ? 's' : ''}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {courseEnrollments.map((enrollment: any) => (
                              <div 
                                key={enrollment.id} 
                                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 border-2 border-primary/10">
                                    <AvatarImage src={enrollment.profiles?.avatar_url} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                      {enrollment.profiles?.username?.[0]?.toUpperCase() || enrollment.profiles?.email?.[0]?.toUpperCase() || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold text-sm">
                                      {enrollment.profiles?.username || enrollment.profiles?.email?.split('@')[0] || 'Utilisateur'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {enrollment.profiles?.email || 'Pas d\'email'}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRemoveStudent(enrollment.id, enrollment.profiles?.username || enrollment.profiles?.email || 'cet étudiant')}
                                  disabled={isManagingStudents}
                                >
                                  {isManagingStudents ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <UserMinus className="h-4 w-4 mr-1" />
                                      Retirer
                                    </>
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card className="border-primary/10 shadow-md">
            <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent border-b">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <BarChart3 className="h-6 w-6 text-primary" />
                Statistiques Détaillées
              </CardTitle>
              <CardDescription>
                Vue d'ensemble de vos activités d'enseignement
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Statistiques par cours */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Répartition par Cours
                </h3>
                <div className="grid gap-4">
                  {courses.map(course => {
                    const courseEnrollments = allEnrollments.filter(e => e.course_id === course.id);
                    const courseMaterials = materials.filter(m => m.course_id === course.id);
                    
                    return (
                      <Card key={course.id} className="border-l-4 border-l-primary/50">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-lg">{course.name}</h4>
                            <Badge variant="secondary">{course.type}</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Étudiants</p>
                              <p className="text-2xl font-bold text-primary">{courseEnrollments.length}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Contenus</p>
                              <p className="text-2xl font-bold text-emerald-600">{courseMaterials.length}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Salle</p>
                              <p className="text-sm font-semibold">{course.room}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Horaire</p>
                              <p className="text-sm font-semibold">{course.start_time} - {course.end_time}</p>
                            </div>
                          </div>
                          {course.video_room_enabled && course.video_room_name && (
                            <div className="mt-4 pt-4 border-t">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/videoconference?room=${course.video_room_name}`)}
                                className="w-full gap-2"
                              >
                                <Video className="h-4 w-4" />
                                Démarrer la visioconférence
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Actions rapides */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Actions Rapides
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">Contenus Pédagogiques</p>
                          <p className="text-sm text-muted-foreground">{materials.length} contenu(s) créé(s)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-amber-500/20 hover:border-amber-500/40 transition-colors cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <ClipboardCheck className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold">Devoirs à Corriger</p>
                          <p className="text-sm text-muted-foreground">{stats.pendingSubmissions} en attente</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-emerald-500/20 hover:border-emerald-500/40 transition-colors cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <Users className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-semibold">Étudiants Actifs</p>
                          <p className="text-sm text-muted-foreground">{stats.totalStudents} inscrit(s)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-500/20 hover:border-blue-500/40 transition-colors cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">Cours Planifiés</p>
                          <p className="text-sm text-muted-foreground">{stats.totalCourses} cours actif(s)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Emploi du temps de la semaine */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Emploi du Temps de la Semaine
                </h3>
                <Card className="border-primary/10">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {courses.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Aucun cours planifié</p>
                      ) : (
                        courses.map(course => (
                          <div 
                            key={course.id}
                            className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <BookOpen className="h-6 w-6 text-primary" />
                              </div>
                              <div>
                                <p className="font-bold text-lg">{course.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {course.day} • {course.start_time} - {course.end_time}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="mb-1">{course.type}</Badge>
                              <p className="text-xs text-muted-foreground">Salle {course.room}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={isSubViewOpen} onOpenChange={setIsSubViewOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Soumissions : {currentMaterial?.title}</SheetTitle>
            <SheetDescription>Consultez et notez les travaux des étudiants.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {viewingSubmissions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground italic">Aucune soumission pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {viewingSubmissions.map((sub) => (
                  <Card key={sub.id} className="overflow-hidden border-primary/10">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-primary/20">
                            <AvatarImage src={sub.profiles?.avatar_url} />
                            <AvatarFallback>{sub.profiles?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-black">{sub.profiles?.username || sub.profiles?.email?.split('@')[0]}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                               <Clock className="h-3 w-3" /> {new Date(sub.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {sub.grade ? (
                          <Badge className="bg-emerald-500 font-bold">Note: {sub.grade}</Badge>
                        ) : (
                          <Badge variant="outline" className="animate-pulse">À Noter</Badge>
                        )}
                      </div>
                      <div className="mt-4 p-4 bg-muted/50 rounded-xl text-sm border italic">
                        {sub.content?.text || 'Pas de contenu textuel fourni.'}
                      </div>
                      {sub.feedback && (
                        <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10 text-xs">
                           <span className="font-bold text-primary block mb-1">Feedback :</span>
                           {sub.feedback}
                        </div>
                      )}
                      <div className="mt-4 flex justify-end">
                        <Button size="sm" variant="secondary" className="font-bold" onClick={() => handleOpenGrading(sub)}>
                          <CheckCircle className="mr-2 h-4 w-4" /> Noter / Feedback
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isGradingOpen} onOpenChange={setIsGradingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Évaluation</DialogTitle>
            <DialogDescription>Donnez une note et un feedback à l'étudiant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="grade">Note (ex: 18/20 ou A+)</Label>
              <Input 
                id="grade" 
                value={grade} 
                onChange={(e) => setGrade(e.target.value)} 
                placeholder="Entrez la note..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback">Commentaire / Feedback</Label>
              <Textarea 
                id="feedback" 
                value={feedback} 
                onChange={(e) => setFeedback(e.target.value)} 
                placeholder="Excellent travail, continuez ainsi..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setIsGradingOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveGrade} disabled={isGrading} className="font-bold">
              {isGrading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              Enregistrer l'évaluation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}