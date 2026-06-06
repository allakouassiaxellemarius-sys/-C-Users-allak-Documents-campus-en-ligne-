import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle2, Circle, Plus, Trash2, ListTodo, Calendar, Flag, ArrowUpDown } from 'lucide-react';

type Priority = 'low' | 'medium' | 'high';
type TaskStatus = 'active' | 'completed';

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  courseName: string;
  status: TaskStatus;
  createdAt: string;
}

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: 'Haute', color: 'bg-red-500' },
  { value: 'medium', label: 'Moyenne', color: 'bg-amber-500' },
  { value: 'low', label: 'Basse', color: 'bg-green-500' },
];

function loadTasks(): Task[] {
  try {
    return JSON.parse(localStorage.getItem('campus-tasks') || '[]');
  } catch { return []; }
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem('campus-tasks', JSON.stringify(tasks));
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt'>('createdAt');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [courseName, setCourseName] = useState('');

  useEffect(() => { saveTasks(tasks); }, [tasks]);

  const addTask = () => {
    if (!title.trim()) { toast.error('Le titre est requis'); return; }
    const task: Task = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      dueDate,
      priority,
      courseName: courseName.trim(),
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [task, ...prev]);
    setTitle(''); setDescription(''); setDueDate(''); setPriority('medium'); setCourseName('');
    setShowForm(false);
    toast.success('Tâche ajoutée');
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: t.status === 'active' ? 'completed' : 'active' } : t
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success('Tâche supprimée');
  };

  const filtered = tasks
    .filter(t => filter === 'all' || t.status === filter)
    .sort((a, b) => {
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1; if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortBy === 'priority') {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

  const activeCount = tasks.filter(t => t.status === 'active').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Mes Tâches</h1>
          <p className="text-muted-foreground mt-1">{activeCount} active{activeCount > 1 ? 's' : ''} · {completedCount} terminée{completedCount > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" /> {showForm ? 'Annuler' : 'Nouvelle tâche'}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Titre de la tâche" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
            <Textarea placeholder="Description (optionnelle)" value={description} onChange={e => setDescription(e.target.value)} className="min-h-[60px]" />
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[140px]">
                <p className="text-xs text-muted-foreground mb-1">Échéance</p>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div className="flex-1 min-w-[140px]">
                <p className="text-xs text-muted-foreground mb-1">Priorité</p>
                <Select value={priority} onValueChange={v => setPriority(v as Priority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[140px]">
                <p className="text-xs text-muted-foreground mb-1">Matière (optionnel)</p>
                <Input placeholder="Ex: Mathématiques" value={courseName} onChange={e => setCourseName(e.target.value)} />
              </div>
            </div>
            <Button onClick={addTask} className="w-full">Ajouter</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        {(['all', 'active', 'completed'] as const).map(f => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
            {f === 'all' ? 'Toutes' : f === 'active' ? 'Actives' : 'Terminées'}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Récentes</SelectItem>
              <SelectItem value="dueDate">Échéance</SelectItem>
              <SelectItem value="priority">Priorité</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="h-40 flex flex-col items-center justify-center text-muted-foreground italic gap-2">
          <ListTodo className="w-8 h-8 opacity-40" />
          <p>Aucune tâche {filter !== 'all' ? filter : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <Card key={task.id} className={`transition-all hover:shadow-md ${task.status === 'completed' ? 'opacity-60' : ''}`}>
              <CardContent className="flex items-start gap-3 p-4">
                <Checkbox checked={task.status === 'completed'} onCheckedChange={() => toggleTask(task.id)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium truncate ${task.status === 'completed' ? 'line-through' : ''}`}>{task.title}</span>
                    <Badge variant="outline" className={`text-[10px] ${PRIORITIES.find(p => p.value === task.priority)?.color.replace('bg-', 'text-') || ''}`}>
                      {PRIORITIES.find(p => p.value === task.priority)?.label}
                    </Badge>
                  </div>
                  {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    {task.dueDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(task.dueDate).toLocaleDateString('fr-FR')}</span>}
                    {task.courseName && <span className="flex items-center gap-1"><Flag className="w-3 h-3" />{task.courseName}</span>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="text-destructive shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
