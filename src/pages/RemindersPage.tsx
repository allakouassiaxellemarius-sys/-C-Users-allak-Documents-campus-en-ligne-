import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { Course, Reminder } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Clock, 
  Calendar, 
  BookOpen, 
  AlertCircle,
  Settings2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function RemindersPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // New reminder form state
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [minutesBefore, setMinutesBefore] = useState('15');

  useEffect(() => {
    if (user) {
      loadData();

      const channel = supabase
        .channel('reminders-page')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reminders',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [coursesData, remindersData] = await Promise.all([
        api.courses.list(user!.id),
        api.reminders.list(user!.id)
      ]);
      setCourses(coursesData);
      setReminders(remindersData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Erreur lors du chargement des rappels');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddReminder = async () => {
    if (!selectedCourseId) {
      toast.error('Veuillez sélectionner un cours');
      return;
    }

    try {
      await api.reminders.create({
        course_id: selectedCourseId,
        user_id: user!.id,
        minutes_before: parseInt(minutesBefore),
        is_enabled: true
      });
      toast.success('Rappel ajouté');
      setIsAdding(false);
      setSelectedCourseId('');
      loadData();
    } catch (error) {
      console.error('Failed to add reminder:', error);
      toast.error('Erreur lors de l\'ajout du rappel');
    }
  };

  const handleToggleReminder = async (id: string, isEnabled: boolean) => {
    try {
      await api.reminders.update(id, { is_enabled: isEnabled });
      setReminders(reminders.map(r => r.id === id ? { ...r, is_enabled: isEnabled } : r));
    } catch (error) {
      console.error('Failed to update reminder:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      await api.reminders.delete(id);
      toast.success('Rappel supprimé');
      loadData();
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Ce navigateur ne supporte pas les notifications');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast.success('Notifications activées !');
    } else {
      toast.error('Permission de notification refusée');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Système de Rappels</h1>
          <p className="text-muted-foreground mt-1">Configurez des notifications pour ne jamais manquer vos cours.</p>
        </div>
        <Button onClick={requestNotificationPermission} variant="outline" className="gap-2">
          <Settings2 className="h-4 w-4" /> Activer les notifications
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 h-fit shadow-md border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Nouveau Rappel</CardTitle>
            <CardDescription>Planifier une alerte.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cours</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un cours" />
                </SelectTrigger>
                <SelectContent>
                  {courses.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">Aucun cours disponible</div>
                  ) : (
                    courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alerte avant</Label>
              <Select value={minutesBefore} onValueChange={setMinutesBefore}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un délai" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 heure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleAddReminder} className="w-full shadow-sm" disabled={!selectedCourseId}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter le rappel
            </Button>
          </CardFooter>
        </Card>

        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Mes Rappels Actifs
          </h2>
          
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full bg-muted" />
            ))
          ) : reminders.length === 0 ? (
            <Card className="border-dashed py-12 text-center bg-muted/20">
              <CardContent>
                <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">Vous n'avez aucun rappel configuré.</p>
              </CardContent>
            </Card>
          ) : (
            reminders.map((reminder) => (
              <Card key={reminder.id} className="group hover:border-primary/30 transition-all border shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/5 rounded-full group-hover:bg-primary/10 transition-colors">
                      <Bell className={`h-6 w-6 ${reminder.is_enabled ? 'text-primary' : 'text-muted-foreground opacity-50'}`} />
                    </div>
                    <div>
                      <h4 className={`font-bold text-lg ${!reminder.is_enabled && 'text-muted-foreground'}`}>
                        {reminder.courses.name}
                      </h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {reminder.minutes_before} min avant
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Début: {reminder.courses.start_time.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 mr-2">
                       <Label htmlFor={`reminder-${reminder.id}`} className="sr-only">Activé</Label>
                       <Switch 
                        id={`reminder-${reminder.id}`}
                        checked={reminder.is_enabled}
                        onCheckedChange={(checked) => handleToggleReminder(reminder.id, checked)}
                       />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          <Card className="bg-primary/5 border-none shadow-none mt-8">
            <CardContent className="p-6">
               <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Comment ça marche ?</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      L'application vérifie vos prochains cours et déclenche une notification locale sur votre navigateur 
                      selon le délai choisi. Assurez-vous d'avoir autorisé les notifications dans les paramètres de votre navigateur.
                    </p>
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}