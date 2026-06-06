import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  ClipboardCheck, 
  BookOpen, 
  Clock, 
  ArrowRight,
  User,
  Send,
  Loader2,
  Users,
  Download,
  Printer
} from 'lucide-react';
import { supabase } from '@/db/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';

export default function MaterialsPage() {
  const { user, profile } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null);

  useEffect(() => {
    loadMaterials();
    if (user) {
      loadSubmissions();
      loadEnrollments();
    }
  }, [profile, user]);

  const loadEnrollments = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id);
      if (error) throw error;
      setEnrollments(data.map((e: any) => e.course_id));
    } catch (error) {
      console.error('Failed to load enrollments:', error);
    }
  };

  const loadMaterials = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('teacher_materials')
        .select(`
          *,
          profiles:teacher_id(email, username, avatar_url),
          courses:course_id(id, name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMaterials(data);
    } catch (error) {
      console.error('Failed to load materials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubmissions = async () => {
    if (!user) return;
    try {
      const data = await api.submissions.listForStudent(user.id);
      setSubmissions(data);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    }
  };

  const handleDownload = async (material: any) => {
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

  const handleOpenDialog = (material: any) => {
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
      loadSubmissions();
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de la réponse');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasSubmitted = (materialId: string) => {
    return submissions.some(s => s.material_id === materialId);
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    try {
      setIsEnrolling(courseId);
      await api.enrollments.enroll(courseId, user.id);
      toast.success('Inscrit au cours avec succès !');
      loadEnrollments();
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

  const isEnrolled = (courseId: string) => {
    return enrollments.includes(courseId);
  };

  const getSubmissionStatus = (materialId: string) => {
    const s = submissions.find(s => s.material_id === materialId);
    if (!s) return null;
    return s;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Supports de Cours</h1>
          <p className="text-muted-foreground">Accédez aux ressources partagées par vos enseignants.</p>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedMaterial?.title}</DialogTitle>
            <DialogDescription>
              {selectedMaterial?.content_type === 'quiz' ? 'Remplissez le quiz ci-dessous.' : 'Soumettez votre travail ici.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="p-3 bg-muted rounded-lg text-sm italic">
              {selectedMaterial?.description || 'Aucune consigne supplémentaire.'}
            </div>
            
            {selectedMaterial?.content_type === 'quiz' && selectedMaterial?.data?.questions ? (
              <div className="space-y-6">
                {selectedMaterial.data.questions.map((q: any, qIdx: number) => (
                  <div key={qIdx} className="space-y-3 p-4 border rounded-xl bg-accent/5">
                    <p className="font-bold text-sm">{qIdx + 1}. {q.question}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {q.options.map((opt: string, oIdx: number) => (
                        <Button 
                          key={oIdx} 
                          variant={quizAnswers[qIdx] === oIdx ? 'default' : 'outline'}
                          className="justify-start h-auto py-3 px-4 text-xs"
                          onClick={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                        >
                          <span className="w-6 h-6 flex items-center justify-center rounded-full border mr-3 text-[10px] shrink-0">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          {opt}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="submission-content">Votre réponse / Contenu du devoir</Label>
                <Textarea 
                  id="submission-content" 
                  value={submissionContent} 
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  placeholder="Écrivez votre réponse ou collez un lien vers votre travail..."
                  rows={6}
                />
              </div>
            )}
          </div>
          <DialogFooter className="mt-4 border-t pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button 
              onClick={handleSendSubmission} 
              disabled={isSubmitting || (selectedMaterial?.content_type !== 'quiz' && !submissionContent.trim())}
              className="font-bold"
            >
              {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Envoyer ma réponse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Tout</TabsTrigger>
          <TabsTrigger value="course">Supports</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="assignment">Devoirs</TabsTrigger>
        </TabsList>
        
        {['all', 'course', 'quiz', 'assignment'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full bg-muted" />)}
              </div>
            ) : materials.filter(m => tab === 'all' || m.content_type === tab).length === 0 ? (
              <Card className="border-dashed py-12 text-center bg-accent/10">
                <CardContent>
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Aucune ressource disponible pour cette catégorie.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {materials
                  .filter(m => tab === 'all' || m.content_type === tab)
                  .map((material) => (
                    <Card key={material.id} className="group hover:shadow-lg transition-all border-l-4" style={{ borderLeftColor: 
                      material.content_type === 'course' ? '#3b82f6' : 
                      material.content_type === 'quiz' ? '#10b981' : '#f59e0b' 
                    }}>
                      <CardHeader>
                        <Badge variant="secondary" className="mb-2 w-fit">
                          {material.content_type === 'course' ? 'Support de cours' : 
                           material.content_type === 'quiz' ? 'Quiz / Interro' : 'Devoir / TP'}
                        </Badge>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">{material.title}</CardTitle>
                        {material.courses && (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-primary mb-2 uppercase tracking-wider">
                            <BookOpen className="h-3 w-3" /> {material.courses.name}
                          </div>
                        )}
                        <CardDescription className="line-clamp-2">{material.description || 'Aucune description.'}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(material.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {material.profiles?.email?.split('@')[0]}
                          </span>
                        </div>
                        
                        {material.data?.file_path && (
                          <div className="mt-4 p-3 border rounded-xl bg-accent/5 flex items-center justify-between group/file">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-[10px] font-bold truncate">
                                {material.data.file_name || 'Document attaché'}
                              </span>
                            </div>
                            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary" onClick={() => handleDownload(material)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}

                        {material.course_id && !isEnrolled(material.course_id) && (
                           <div className="mt-4 p-4 border rounded-2xl bg-primary/5 flex flex-col items-center gap-2 text-center">
                              <p className="text-[10px] font-bold">Inscrivez-vous pour participer</p>
                              <Button 
                                size="sm" 
                                className="w-full h-8 text-[10px] font-black" 
                                variant="outline"
                                disabled={isEnrolling === material.course_id}
                                onClick={() => handleEnroll(material.course_id)}
                              >
                                {isEnrolling === material.course_id ? <Loader2 className="animate-spin h-3 w-3 mr-2" /> : <Users className="h-3 w-3 mr-2" />}
                                S'inscrire au cours
                              </Button>
                           </div>
                        )}
                        {hasSubmitted(material.id) && (
                          <div className="mt-2 space-y-1">
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                              Déjà soumis
                            </Badge>
                            {getSubmissionStatus(material.id)?.grade && (
                              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                Note : {getSubmissionStatus(material.id).grade}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="border-t bg-accent/5 p-4">
                         {material.content_type === 'course' ? (
                            <Button size="sm" className="w-full h-9 text-xs gap-2" onClick={() => handleOpenDialog(material)}>
                              Consulter le cours <BookOpen className="h-3.5 w-3.5" />
                            </Button>
                         ) : (
                            <Button 
                              size="sm" 
                              className="w-full h-9 text-xs gap-2 font-bold" 
                              disabled={hasSubmitted(material.id) || (material.course_id && !isEnrolled(material.course_id))}
                              onClick={() => handleOpenDialog(material)}
                            >
                              {hasSubmitted(material.id) ? 'Déjà soumis' : (
                                <>
                                  Participer <ArrowRight className="h-3.5 w-3.5" />
                                </>
                              )}
                            </Button>
                         )}
                      </CardFooter>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}