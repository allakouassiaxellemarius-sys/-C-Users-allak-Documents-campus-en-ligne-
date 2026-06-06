import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { Course, CourseType } from '@/types/index';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  BookOpen, 
  GraduationCap, 
  MapPin, 
  Clock, 
  Calendar,
  AlertCircle,
  Video
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Skeleton } from '@/components/ui/skeleton';

const DAYS = [
  { label: 'Lundi', value: '0' },
  { label: 'Mardi', value: '1' },
  { label: 'Mercredi', value: '2' },
  { label: 'Jeudi', value: '3' },
  { label: 'Vendredi', value: '4' },
  { label: 'Samedi', value: '5' },
  { label: 'Dimanche', value: '6' },
];

const COURSE_TYPES: CourseType[] = ['CM', 'TD', 'TP'];

const courseSchema = z.object({
  name: z.string().min(2, "Le nom du cours est requis"),
  professor: z.string().optional(),
  room: z.string().optional(),
  day_of_week: z.string(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Heure de début invalide (HH:mm)"),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Heure de fin invalide (HH:mm)"),
  type: z.enum(['CM', 'TD', 'TP']),
  color: z.string().optional(),
}).refine((data) => {
  const start = data.start_time.split(':').map(Number);
  const end = data.end_time.split(':').map(Number);
  return (start[0] * 60 + start[1]) < (end[0] * 60 + end[1]);
}, {
  message: "L'heure de fin doit être après l'heure de début",
  path: ["end_time"],
});

type CourseFormValues = z.infer<typeof courseSchema>;

export default function CoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: '',
      professor: '',
      room: '',
      day_of_week: '0',
      start_time: '08:00',
      end_time: '10:00',
      type: 'CM',
      color: '#3b82f6',
    },
  });

  useEffect(() => {
    if (user) {
      loadCourses();

      const channel = supabase
        .channel('courses-page')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'courses',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadCourses();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadCourses = async () => {
    try {
      setIsLoading(true);
      const data = await api.courses.list(user!.id);
      setCourses(data);
    } catch (error) {
      console.error('Failed to load courses:', error);
      toast.error('Erreur lors du chargement des cours');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: CourseFormValues) => {
    try {
      // Validation supplémentaire
      if (!values.name.trim()) {
        toast.error('Le nom du cours est requis');
        return;
      }

      // Formatage des heures
      const formatTime = (time: string) => {
        if (time.includes(':')) {
          const parts = time.split(':');
          if (parts.length === 2) {
            return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
          }
        }
        return `${time}:00`;
      };

      const courseData = {
        name: values.name.trim(),
        professor: values.professor?.trim() || undefined,
        room: values.room?.trim() || undefined,
        user_id: user!.id,
        day_of_week: parseInt(values.day_of_week),
        start_time: formatTime(values.start_time),
        end_time: formatTime(values.end_time),
        type: values.type,
        color: values.color || '#3b82f6',
      };

      if (editingCourse) {
        await api.courses.update(editingCourse.id, courseData);
        toast.success('✅ Cours mis à jour avec succès');
      } else {
        await api.courses.create(courseData);
        toast.success('✅ Nouveau cours ajouté avec succès');
      }
      
      setIsDialogOpen(false);
      setEditingCourse(null);
      form.reset();
      await loadCourses();
    } catch (error: any) {
      console.error('Failed to save course:', error);
      const errorMessage = error?.message || 'Erreur lors de l\'enregistrement du cours';
      toast.error(`❌ ${errorMessage}`);
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    form.reset({
      name: course.name,
      professor: course.professor || '',
      room: course.room || '',
      day_of_week: course.day_of_week.toString(),
      start_time: course.start_time.slice(0, 5),
      end_time: course.end_time.slice(0, 5),
      type: course.type,
      color: course.color || '#3b82f6',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.courses.delete(id);
      toast.success('Cours supprimé avec succès');
      loadCourses();
    } catch (error) {
      console.error('Failed to delete course:', error);
      toast.error('Erreur lors de la suppression du cours');
    }
  };

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.professor?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* En-tête avec action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Mes Cours</h1>
          <p className="text-muted-foreground mt-1">Gérez vos modules et horaires universitaires.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingCourse(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-md">
              <Plus className="mr-2 h-4 w-4" /> Ajouter un cours
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingCourse ? 'Modifier le cours' : 'Ajouter un nouveau cours'}</DialogTitle>
              <DialogDescription>
                Remplissez les détails du cours ci-dessous.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du cours</FormLabel>
                      <FormControl>
                        <Input placeholder="Analyse Mathématique" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="professor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Professeur</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr. Dupont" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="room"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salle</FormLabel>
                        <FormControl>
                          <Input placeholder="Amphi A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <FormField
                    control={form.control}
                    name="day_of_week"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jour</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir un jour" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DAYS.map((day) => (
                              <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de cours</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir un type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {COURSE_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Début (HH:mm)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fin (HH:mm)</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Couleur</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                           <Input type="color" className="w-12 h-10 p-1 rounded-md" {...field} />
                           <span className="text-sm text-muted-foreground">Couleur pour le calendrier</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full sm:w-auto">
                    {editingCourse ? 'Enregistrer les modifications' : 'Ajouter le cours'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Section Recherche */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Rechercher un cours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom ou professeur..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section Liste des cours */}
      <Card>
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Liste des cours ({filteredCourses.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
      {/* Mobile card list (hidden on md+) */}
      <div className="block md:hidden divide-y">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))
        ) : filteredCourses.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground italic">
            Aucun cours trouvé.
          </div>
        ) : (
          filteredCourses.map((course) => (
            <div key={course.id} className="p-4 space-y-2 active:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{course.name}</div>
                    <div className="text-xs text-muted-foreground">{course.professor}</div>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px] uppercase">{course.type}</Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{DAYS[course.day_of_week].label}</span>
                <span>{course.start_time.slice(0, 5)} - {course.end_time.slice(0, 5)}</span>
                {course.room && <span>• {course.room}</span>}
              </div>
              <div className="flex gap-2 pt-1">
                {course.video_room_enabled && course.video_room_name && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/videoconference?room=${course.video_room_name}`)}>
                    <Video className="h-3.5 w-3.5 mr-1" /> Rejoindre
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleEdit(course)}>
                  <Pencil className="h-4 w-4 text-blue-500" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action supprimera définitivement le cours "{course.name}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(course.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Desktop table (hidden on mobile) */}
      <div className="hidden md:block rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Cours</TableHead>
              <TableHead>Jour</TableHead>
              <TableHead>Horaires</TableHead>
              <TableHead>Salle</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
            </TableRow>
          ))
        ) : filteredCourses.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
              Aucun cours trouvé.
            </TableCell>
          </TableRow>
        ) : (
          filteredCourses.map((course) => (
            <TableRow key={course.id} className="hover:bg-muted/10 transition-colors">
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: course.color }} />
                   <div className="flex flex-col">
                      <span>{course.name}</span>
                      <span className="text-xs text-muted-foreground font-normal">{course.professor}</span>
                   </div>
                </div>
              </TableCell>
              <TableCell>{DAYS[course.day_of_week].label}</TableCell>
              <TableCell className="text-muted-foreground">
                {course.start_time.slice(0, 5)} - {course.end_time.slice(0, 5)}
              </TableCell>
              <TableCell>{course.room || '-'}</TableCell>
              <TableCell>
                <Badge variant="outline" className="font-semibold text-[10px] tracking-wider uppercase">
                  {course.type}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {course.video_room_enabled && course.video_room_name && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/videoconference?room=${course.video_room_name}`)}
                      className="gap-2"
                    >
                      <Video className="h-4 w-4" />
                      Rejoindre
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(course)}>
                    <Pencil className="h-4 w-4 text-blue-500" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action supprimera définitivement le cours "{course.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(course.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
        </CardContent>
      </Card>
    </div>
  );
}