import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import type { UserGrade } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { 
  Plus, 
  Trophy, 
  TrendingUp, 
  GraduationCap, 
  Trash2, 
  Calendar as CalendarIcon,
  BookOpen,
  PlusCircle,
  BarChart2,
  List,
  AlertCircle,
  Download,
  Award,
  Target,
  TrendingDown,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';

export default function GradesPage() {
  const { user } = useAuth();
  const [userGrades, setUserGrades] = useState<UserGrade[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Form state
  const [courseName, setCourseName] = useState('');
  const [grade, setGrade] = useState('');
  const [maxGrade, setMaxGrade] = useState('20');
  const [coefficient, setCoefficient] = useState('1');
  const [examDate, setExamDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [semester, setSemester] = useState<string>('S1');

  useEffect(() => {
    if (user) {
      loadGrades();
    }
  }, [user]);

  const loadGrades = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const [uGrades, subs] = await Promise.all([
        api.grades.list(user.id),
        api.submissions.listForStudent(user.id)
      ]);
      setUserGrades(uGrades);
      setSubmissions(subs.filter((s: any) => s.grade));
    } catch (error) {
      console.error('Failed to load grades:', error);
      toast.error('Erreur lors du chargement des notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGrade = async () => {
    if (!user) return;
    if (!courseName || !grade) {
      return toast.error('Veuillez remplir tous les champs obligatoires');
    }

    try {
      setIsAdding(true);
      await api.grades.create({
        student_id: user.id,
        course_name: courseName,
        grade: parseFloat(grade),
        max_grade: parseFloat(maxGrade),
        coefficient: parseFloat(coefficient),
        exam_date: examDate,
        semester: semester,
        academic_year: selectedYear
      });
      toast.success('✅ Note ajoutée avec succès !');
      setCourseName('');
      setGrade('');
      setIsAdding(false);
      loadGrades();
    } catch (error) {
      toast.error('❌ Erreur lors de l\'ajout de la note');
      setIsAdding(false);
    }
  };

  const handleDeleteGrade = async (id: string) => {
    try {
      await api.grades.delete(id);
      toast.success('Note supprimée');
      loadGrades();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Process all grades for calculations and display
  const allGrades = useMemo(() => {
    const grades = [
      ...userGrades.map(g => ({
        id: g.id,
        name: g.course_name,
        grade: Number(g.grade),
        max: Number(g.max_grade),
        coeff: Number(g.coefficient),
        date: g.exam_date,
        type: 'Manuel',
        semester: (g as any).semester || 'S1',
        year: (g as any).academic_year || selectedYear
      })),
      ...submissions.map(s => {
        const gradeParts = s.grade?.split('/');
        const val = parseFloat(gradeParts?.[0] || '0');
        const maxVal = parseFloat(gradeParts?.[1] || '20');
        return {
          id: s.id,
          name: s.material?.title || 'Note de cours',
          grade: val,
          max: maxVal,
          coeff: 1,
          date: s.created_at,
          type: 'Système',
          semester: 'S1',
          year: selectedYear
        };
      })
    ];

    // Filter by semester and year
    return grades.filter(g => {
      const matchesSemester = selectedSemester === 'all' || g.semester === selectedSemester;
      const matchesYear = selectedYear === 'all' || g.year === selectedYear;
      return matchesSemester && matchesYear;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [userGrades, submissions, selectedSemester, selectedYear]);

  const calculateAverage = (grades = allGrades) => {
    if (grades.length === 0) return 0;
    
    let totalGrade = 0;
    let totalCoeff = 0;
    
    grades.forEach(g => {
      const normalizedGrade = (g.grade / g.max) * 20;
      totalGrade += normalizedGrade * g.coeff;
      totalCoeff += g.coeff;
    });
    
    return totalCoeff > 0 ? (totalGrade / totalCoeff) : 0;
  };

  const stats = useMemo(() => {
    const avg = calculateAverage();
    const normalizedGrades = allGrades.map(g => (g.grade / g.max) * 20);
    const best = normalizedGrades.length > 0 ? Math.max(...normalizedGrades) : 0;
    const worst = normalizedGrades.length > 0 ? Math.min(...normalizedGrades) : 0;
    const passing = normalizedGrades.filter(g => g >= 10).length;
    const failing = normalizedGrades.filter(g => g < 10).length;
    
    return {
      average: avg.toFixed(2),
      best: best.toFixed(2),
      worst: worst.toFixed(2),
      total: allGrades.length,
      passing,
      failing,
      passRate: allGrades.length > 0 ? ((passing / allGrades.length) * 100).toFixed(1) : 0
    };
  }, [allGrades]);

  const chartData = useMemo(() => {
    return [...allGrades]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(g => ({
        date: format(new Date(g.date), 'dd/MM'),
        note: parseFloat(((g.grade / g.max) * 20).toFixed(2)),
        nom: g.name
      }));
  }, [allGrades]);

  const gradeDistribution = useMemo(() => {
    const ranges = [
      { name: '0-5', min: 0, max: 5, count: 0, color: '#ef4444' },
      { name: '5-10', min: 5, max: 10, count: 0, color: '#f97316' },
      { name: '10-12', min: 10, max: 12, count: 0, color: '#eab308' },
      { name: '12-14', min: 12, max: 14, count: 0, color: '#84cc16' },
      { name: '14-16', min: 14, max: 16, count: 0, color: '#22c55e' },
      { name: '16-20', min: 16, max: 20, count: 0, color: '#10b981' }
    ];

    allGrades.forEach(g => {
      const normalized = (g.grade / g.max) * 20;
      const range = ranges.find(r => normalized >= r.min && normalized < r.max);
      if (range) range.count++;
    });

    return ranges.filter(r => r.count > 0);
  }, [allGrades]);

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Gestion des Notes</h1>
          <p className="text-muted-foreground">Suivez vos résultats et votre progression académique.</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg hover:shadow-primary/20 transition-all gap-2">
              <Plus className="h-4 w-4" />
              Ajouter une Note
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle Note</DialogTitle>
              <DialogDescription>Saisissez les informations de votre évaluation.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="course">Matière / Évaluation</Label>
                <Input 
                  id="course" 
                  placeholder="ex: Mathématiques - DS1" 
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">Note obtenue</Label>
                  <Input 
                    id="grade" 
                    type="number" 
                    step="0.25" 
                    placeholder="15.5" 
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max">Note maximale</Label>
                  <Input 
                    id="max" 
                    type="number" 
                    placeholder="20" 
                    value={maxGrade}
                    onChange={(e) => setMaxGrade(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="coeff">Coefficient</Label>
                  <Input 
                    id="coeff" 
                    type="number" 
                    step="0.5" 
                    placeholder="1" 
                    value={coefficient}
                    onChange={(e) => setCoefficient(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date de l'examen</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="semester">Semestre</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger id="semester">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S1">Semestre 1</SelectItem>
                      <SelectItem value="S2">Semestre 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Année</Label>
                  <Input 
                    id="year" 
                    placeholder="2025-2026" 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddGrade} disabled={isAdding} className="w-full rounded-xl">
                {isAdding ? 'Enregistrement...' : 'Enregistrer la note'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Section Filtres */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filtrer par période
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semestre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les semestres</SelectItem>
                <SelectItem value="S1">Semestre 1</SelectItem>
                <SelectItem value="S2">Semestre 2</SelectItem>
              </SelectContent>
            </Select>

            <Input 
              placeholder="Année (ex: 2025-2026)" 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-[200px]"
            />

            {(selectedSemester !== 'all' || selectedYear !== new Date().getFullYear().toString()) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedSemester('all');
                  setSelectedYear(new Date().getFullYear().toString());
                }}
              >
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section Statistiques */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            Statistiques de performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-none shadow-sm hover:scale-[1.02] transition-transform">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-2xl">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Moyenne Générale</p>
              <p className="text-3xl font-black text-primary">{stats.average}/20</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-none shadow-sm hover:scale-[1.02] transition-transform">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-2xl">
              <Trophy className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Meilleure Note</p>
              <p className="text-3xl font-black text-emerald-600">{stats.best}/20</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-none shadow-sm hover:scale-[1.02] transition-transform">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 rounded-2xl">
              <Target className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Taux de Réussite</p>
              <p className="text-3xl font-black text-amber-600">{stats.passRate}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-none shadow-sm hover:scale-[1.02] transition-transform">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-2xl">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Total Notes</p>
              <p className="text-3xl font-black text-blue-600">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
      </div>
        </CardContent>
      </Card>

      {/* Section Graphiques et Visualisations */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Visualisations et analyses</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-primary" />
                  Progression des Résultats
                </CardTitle>
                <CardDescription>Visualisation de vos notes sur une échelle de 20.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-10 h-[350px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorNote" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      domain={[0, 20]} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      ticks={[0, 5, 10, 15, 20]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        backgroundColor: 'hsl(var(--card))',
                        fontSize: '12px'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="note" 
                      name="Note"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorNote)" 
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 bg-muted/30 rounded-full">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">Aucune donnée graphique disponible.<br/>Ajoutez vos premières notes pour voir votre progression.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Distribution des Notes */}
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-primary" />
                Distribution des Notes
              </CardTitle>
              <CardDescription>Répartition de vos notes par tranche.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-10 h-[300px]">
              {gradeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        backgroundColor: 'hsl(var(--card))',
                        fontSize: '12px'
                      }} 
                    />
                    <Bar dataKey="count" name="Nombre de notes" radius={[8, 8, 0, 0]}>
                      {gradeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 bg-muted/30 rounded-full">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">Aucune donnée disponible.</p>
                </div>
              )}
            </CardContent>
          </Card>
          </div>

          {/* Sidebar avec résumé */}
          <div className="space-y-6">
            <Card className="border-none shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <List className="h-5 w-5 text-primary" />
                Derniers Résultats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {allGrades.length > 0 ? (
                  allGrades.map((g, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${((g.grade/g.max)*20) >= 10 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                          <BookOpen className={`h-5 w-5 ${((g.grade/g.max)*20) >= 10 ? 'text-emerald-500' : 'text-red-500'}`} />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{g.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {format(new Date(g.date), 'dd MMMM yyyy', { locale: fr })}
                            </span>
                            <Badge variant="outline" className="text-[8px] h-4 py-0 font-black px-1 uppercase tracking-tighter opacity-70">
                              {g.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-black leading-none">
                            {g.grade}<span className="text-[10px] text-muted-foreground font-medium"> / {g.max}</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Coeff: {g.coeff}</p>
                        </div>
                        {g.type === 'Manuel' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-lg"
                            onClick={() => handleDeleteGrade(g.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-muted-foreground">
                    <p>Aucune note enregistrée pour le moment.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Sidebar avec résumé */}
          <div className="space-y-6">
            <Card className="border-none shadow-md bg-gradient-to-br from-primary/10 via-background to-background">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Aide au Calcul</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Toutes vos notes sont automatiquement ramenées sur une échelle de 20 pour le calcul de votre moyenne générale.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span>Pondération Coeff</span>
                  <span>Activée</span>
                </div>
                <div className="w-full bg-muted h-1 rounded-full">
                  <div className="bg-primary h-full w-full rounded-full" />
                </div>
              </div>
              <div className="p-3 bg-muted/30 rounded-xl space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest">Conseil</p>
                <p className="text-xs italic leading-tight text-muted-foreground">"Visez toujours au moins 12 pour sécuriser vos modules !"</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-muted/20">
              <CardTitle className="text-sm font-black uppercase tracking-widest">Matières actives</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {Array.from(new Set(allGrades.map(g => g.name))).slice(0, 5).map(course => (
                  <div key={course} className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate max-w-[150px]">{course}</span>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {(allGrades.filter(g => g.name === course).length)} évaluation(s)
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}