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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Suggestion } from '@/types/index';

export default function SuggestionsPage() {
  const { user, profile } = useAuth();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadSuggestions();
    } else {
      setIsLoading(false);
    }
  }, [profile]);

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      const data = await api.suggestions.list();
      setSuggestions(data || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuggestion.trim() || !user) return;

    try {
      setIsSubmitting(true);
      await api.suggestions.create({
        user_id: user.id,
        content: newSuggestion
      });
      setNewSuggestion('');
      toast.success('Suggestion envoyée avec succès !');
      loadSuggestions();
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de la suggestion');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: Suggestion['status']) => {
    try {
      await api.suggestions.updateStatus(id, status);
      toast.success('Statut mis à jour');
      loadSuggestions();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Espace de Suggestions</h1>
        <p className="text-muted-foreground">Aidez-nous à améliorer mon espace étudiant avec vos idées.</p>
      </div>

      {profile?.role !== 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Nouvelle Suggestion</CardTitle>
            <CardDescription>Partagez vos idées ou signalez un problème directement à l'administration.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="suggestion">Votre message</Label>
                <Textarea 
                  id="suggestion"
                  placeholder="Ex: J'aimerais pouvoir exporter mon emploi du temps en PDF..."
                  value={newSuggestion}
                  onChange={(e) => setNewSuggestion(e.target.value)}
                  rows={4}
                  required
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? 'Envoi...' : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Envoyer à l'administration
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {profile?.role === 'admin' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Toutes les suggestions reçues
          </h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full bg-muted" />)}
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Aucune suggestion pour le moment.</p>
          ) : (
            <div className="grid gap-4">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs bg-muted px-2 py-0.5 rounded-full">
                            {suggestion.profiles?.email?.split('@')[0]}
                          </span>
                          <Badge variant={
                            suggestion.status === 'implemented' ? 'default' : 
                            suggestion.status === 'reviewed' ? 'secondary' : 'outline'
                          }>
                            {suggestion.status === 'pending' ? 'En attente' : 
                             suggestion.status === 'reviewed' ? 'Examiné' : 'Implémenté'}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(suggestion.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{suggestion.content}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8"
                          onClick={() => handleUpdateStatus(suggestion.id, 'reviewed')}
                        >
                          Examiner
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8"
                          onClick={() => handleUpdateStatus(suggestion.id, 'implemented')}
                        >
                          Implémenter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}