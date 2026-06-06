import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, RotateCcw, Coffee, Brain, Timer } from 'lucide-react';

type Phase = 'focus' | 'shortBreak' | 'longBreak';

const PHASES: { key: Phase; label: string; duration: number; icon: any }[] = [
  { key: 'focus', label: 'Concentration', duration: 25 * 60, icon: Brain },
  { key: 'shortBreak', label: 'Petite pause', duration: 5 * 60, icon: Coffee },
  { key: 'longBreak', label: 'Grande pause', duration: 15 * 60, icon: Coffee },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

export default function PomodoroPage() {
  const [phase, setPhase] = useState<Phase>('focus');
  const [timeLeft, setTimeLeft] = useState(PHASES[0].duration);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const currentPhase = PHASES.find(p => p.key === phase)!;
  const progress = 1 - timeLeft / currentPhase.duration;

  const stopTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const switchPhase = useCallback((newPhase: Phase) => {
    stopTimer();
    setIsRunning(false);
    setPhase(newPhase);
    setTimeLeft(PHASES.find(p => p.key === newPhase)!.duration);
  }, [stopTimer]);

  const finishPhase = useCallback(() => {
    stopTimer();
    setIsRunning(false);
    playBeep();
    if (phase === 'focus') {
      const newCount = sessions + 1;
      setSessions(newCount);
      if (newCount % 4 === 0) switchPhase('longBreak');
      else switchPhase('shortBreak');
    } else {
      switchPhase('focus');
    }
  }, [phase, sessions, stopTimer, switchPhase]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { finishPhase(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return stopTimer;
  }, [isRunning, finishPhase, stopTimer]);

  const toggle = () => {
    if (timeLeft === 0) {
      setTimeLeft(currentPhase.duration);
      setIsRunning(true);
    } else {
      setIsRunning(!isRunning);
    }
  };

  const reset = () => {
    stopTimer();
    setIsRunning(false);
    setTimeLeft(currentPhase.duration);
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b">
        <h1 className="text-3xl font-extrabold tracking-tight">Timer Pomodoro</h1>
        <p className="text-muted-foreground mt-1">Boostez votre concentration avec la technique Pomodoro</p>
      </div>

      <div className="flex justify-center gap-2">
        {PHASES.map(p => (
          <Button key={p.key} variant={phase === p.key ? 'default' : 'outline'} size="sm" onClick={() => { if (phase !== p.key) switchPhase(p.key); }}>
            <p.icon className="w-4 h-4 mr-1.5" />{p.label}
          </Button>
        ))}
      </div>

      <Card className="max-w-md mx-auto border-primary/20">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="text-7xl font-mono font-bold tracking-wider tabular-nums">
            {formatTime(timeLeft)}
          </div>

          <Progress value={progress * 100} className="h-2 w-3/4 mx-auto" />

          <div className="flex justify-center gap-3">
            <Button size="lg" onClick={toggle} className="w-32">
              {isRunning ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
              {isRunning ? 'Pause' : timeLeft === currentPhase.duration ? 'Démarrer' : 'Reprendre'}
            </Button>
            <Button variant="outline" size="lg" onClick={reset}>
              <RotateCcw className="w-5 h-5 mr-2" />Reset
            </Button>
          </div>

          <div className="flex justify-center gap-6 pt-2 text-sm text-muted-foreground">
            <div className="text-center">
              <Brain className="w-5 h-5 mx-auto mb-1" />
              <p className="font-medium text-foreground">{sessions}</p>
              <p>Session{sessions > 1 ? 's' : ''}</p>
            </div>
            <div className="text-center">
              <Timer className="w-5 h-5 mx-auto mb-1" />
              <p className="font-medium text-foreground">{formatTime(sessions * 25 * 60)}</p>
              <p>Focus total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-sm">Comment ça marche ?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>1. Choisissez une tâche à accomplir</p>
          <p>2. Lancez le timer de concentration (25 min)</p>
          <p>3. Travaillez jusqu'au signal sonore</p>
          <p>4. Prenez 5 min de pause</p>
          <p>5. Après 4 cycles, prenez 15 min de pause</p>
        </CardContent>
      </Card>
    </div>
  );
}
