import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { api } from '@/db/api';
import type { ExamTimer, Profile } from '@/types/index';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Timer, 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  Plus, 
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface ExamTimerProps {
  profile: Profile | null;
}

export const ExamTimerComponent: React.FC<ExamTimerProps> = ({ profile }) => {
  const [timers, setTimers] = useState<ExamTimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTimerTitle, setNewTimerTitle] = useState('');
  const [newTimerDuration, setNewTimerDuration] = useState(60); // minutes
  const [isAdding, setIsAdding] = useState(false);

  const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin';

  const fetchTimers = useCallback(async () => {
    try {
      const data = await api.timers.list();
      setTimers(data);
    } catch (error) {
      console.error('Error fetching timers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimers();

    const channel = supabase
      .channel('exam_timers_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exam_timers' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTimers(prev => [payload.new as ExamTimer, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTimers(prev => prev.map(t => t.id === payload.new.id ? payload.new as ExamTimer : t));
          } else if (payload.eventType === 'DELETE') {
            setTimers(prev => prev.filter(t => t.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTimers]);

  const handleCreateTimer = async () => {
    if (!newTimerTitle) return toast.error('Le titre est requis');
    if (newTimerDuration <= 0) return toast.error('La durée doit être supérieure à 0');
    if (!profile) return;

    try {
      const durationSeconds = newTimerDuration * 60;
      await api.timers.create({
        title: newTimerTitle,
        duration: durationSeconds,
        remaining_seconds: durationSeconds,
        started_at: null,
        is_running: false,
        teacher_id: profile.id,
      });
      setNewTimerTitle('');
      setNewTimerDuration(60);
      setIsAdding(false);
      toast.success('Chronomètre créé');
    } catch (error) {
      toast.error('Erreur lors de la création du chronomètre');
    }
  };

  const handleStartTimer = async (timer: ExamTimer) => {
    try {
      await api.timers.update(timer.id, {
        is_running: true,
        started_at: new Date().toISOString(),
      });
    } catch (error) {
      toast.error('Erreur lors du démarrage');
    }
  };

  const handlePauseTimer = async (timer: ExamTimer) => {
    const elapsedSinceStart = timer.started_at 
      ? Math.floor((new Date().getTime() - new Date(timer.started_at).getTime()) / 1000)
      : 0;
    const newRemaining = Math.max(0, timer.remaining_seconds - elapsedSinceStart);

    try {
      await api.timers.update(timer.id, {
        is_running: false,
        remaining_seconds: newRemaining,
        started_at: null,
      });
    } catch (error) {
      toast.error('Erreur lors de la pause');
    }
  };

  const handleResetTimer = async (timer: ExamTimer) => {
    try {
      await api.timers.update(timer.id, {
        is_running: false,
        remaining_seconds: timer.duration,
        started_at: null,
      });
    } catch (error) {
      toast.error('Erreur lors de la réinitialisation');
    }
  };

  const handleDeleteTimer = async (id: string) => {
    try {
      await api.timers.delete(id);
      toast.success('Chronomètre supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return null;
  if (timers.length === 0 && !isTeacher) return null;

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            <CardTitle>Chronomètre d'Évaluation</CardTitle>
          </div>
          {isTeacher && (
            <Button size="sm" variant="outline" onClick={() => setIsAdding(!isAdding)}>
              {isAdding ? 'Annuler' : <><Plus className="h-4 w-4 mr-1" /> Nouveau</>}
            </Button>
          )}
        </div>
        <CardDescription>
          Temps restant pour les examens en cours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && isTeacher && (
          <div className="p-4 border rounded-xl bg-accent/5 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="space-y-2">
              <Label>Titre de l'examen</Label>
              <Input 
                placeholder="Ex: Examen de Physique" 
                value={newTimerTitle} 
                onChange={(e) => setNewTimerTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Durée (minutes)</Label>
              <Input 
                type="number" 
                value={newTimerDuration} 
                onChange={(e) => setNewTimerDuration(parseInt(e.target.value) || 0)}
              />
            </div>
            <Button className="w-full" onClick={handleCreateTimer}>Créer le chronomètre</Button>
          </div>
        )}

        <div className="grid gap-4">
          {timers.map((timer) => (
            <TimerRow 
              key={timer.id} 
              timer={timer} 
              isTeacher={isTeacher}
              onStart={() => handleStartTimer(timer)}
              onPause={() => handlePauseTimer(timer)}
              onReset={() => handleResetTimer(timer)}
              onDelete={() => handleDeleteTimer(timer.id)}
              formatTime={formatTime}
            />
          ))}
          {timers.length === 0 && !isAdding && (
            <div className="text-center py-6 text-muted-foreground italic text-sm">
              Aucun chronomètre actif.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface TimerRowProps {
  timer: ExamTimer;
  isTeacher: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onDelete: () => void;
  formatTime: (s: number) => string;
}

const TimerRow: React.FC<TimerRowProps> = ({ 
  timer, 
  isTeacher, 
  onStart, 
  onPause, 
  onReset, 
  onDelete,
  formatTime
}) => {
  const [displaySeconds, setDisplaySeconds] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const updateDisplay = () => {
      if (timer.is_running && timer.started_at) {
        const elapsed = Math.floor((new Date().getTime() - new Date(timer.started_at).getTime()) / 1000);
        const remaining = Math.max(0, timer.remaining_seconds - elapsed);
        setDisplaySeconds(remaining);
      } else {
        setDisplaySeconds(timer.remaining_seconds);
      }
    };

    updateDisplay();
    if (timer.is_running) {
      interval = setInterval(updateDisplay, 1000);
    }

    return () => clearInterval(interval);
  }, [timer]);

  const isExpired = displaySeconds === 0;

  return (
    <div className={`p-4 border rounded-xl flex items-center justify-between gap-4 transition-all ${timer.is_running ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' : 'bg-card'}`}>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold truncate text-sm flex items-center gap-2">
          {timer.title}
          {timer.is_running && <Badge variant="default" className="bg-green-500 animate-pulse h-2 w-2 p-0 rounded-full" />}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className={`text-2xl font-black font-mono tracking-tighter ${isExpired ? 'text-destructive' : 'text-foreground'}`}>
            {formatTime(displaySeconds)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isTeacher ? (
          <>
            {timer.is_running ? (
              <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={onPause}>
                <Pause className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="icon" variant="outline" className="h-8 w-8 rounded-full text-green-600 border-green-200 hover:bg-green-50" onClick={onStart} disabled={isExpired}>
                <Play className="h-4 w-4 fill-current" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={onReset}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          timer.is_running ? (
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 px-3 py-1 font-bold">
              EN COURS
            </Badge>
          ) : isExpired ? (
            <Badge variant="destructive" className="px-3 py-1 font-bold">
              TERMINÉ
            </Badge>
          ) : (
            <Badge variant="secondary" className="px-3 py-1 font-bold">
              EN ATTENTE
            </Badge>
          )
        )}
      </div>
    </div>
  );
};