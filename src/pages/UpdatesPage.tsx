import { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { History, CheckCircle2, Star, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function UpdatesPage() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    try {
      setIsLoading(true);
      const data = await api.updates.list();
      setUpdates(data);
    } catch (error) {
      console.error('Failed to load updates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-extrabold tracking-tight">Évolution & Mises à jour</h1>
          </div>
          <p className="text-muted-foreground">Découvrez les dernières améliorations apportées à mon espace étudiant.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 font-bold">
           <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-2xl bg-muted" />)}
        </div>
      ) : updates.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <CardContent className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <History className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">Aucune mise à jour répertoriée pour le moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/20 before:via-primary/50 before:to-primary/20">
          {updates.map((update, index) => (
            <div key={update.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group animate-in slide-in-from-bottom-5" style={{ animationDelay: `${index * 100}ms` }}>
              {/* Icon */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-primary/20 bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                {update.is_major ? <Star className="h-5 w-5 text-primary fill-primary" /> : <CheckCircle2 className="h-5 w-5 text-primary" />}
              </div>
              
              {/* Content */}
              <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-0 overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className={update.is_major ? 'bg-primary/5 pb-4' : 'pb-4'}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={update.is_major ? 'default' : 'secondary'} className="font-black px-3 py-0.5 rounded-full uppercase tracking-tighter">
                       v{update.version}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold">
                       <Clock className="h-3 w-3" />
                       {new Date(update.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-black">{update.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                   <p className="text-sm text-muted-foreground leading-relaxed italic mb-4">
                      {update.description}
                   </p>
                   {update.changes && Array.isArray(update.changes) && (
                     <ul className="space-y-2">
                        {update.changes.map((change: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm font-medium">
                             <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                             {change}
                          </li>
                        ))}
                     </ul>
                   )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}