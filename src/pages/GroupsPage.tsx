import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { Group, GroupMember, GroupMessage, Profile } from '@/types/index';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Plus, 
  MessageSquare, 
  Send, 
  UserPlus, 
  LogOut, 
  Search,
  BookOpen,
  Info,
  Loader2,
  ArrowLeft,
  Check,
  Settings,
  Key,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export default function GroupsPage() {
  const { user, profile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  // Create group form state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupType, setNewGroupType] = useState<'study' | 'td'>('study');
  const [newGroupIsPrivate, setNewGroupIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Join by token state
  const [tokenInput, setTokenInput] = useState('');
  const [isJoiningToken, setIsJoiningToken] = useState(false);

  // Group settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [editMaxMembers, setEditMaxMembers] = useState(5);

  // Add member state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Partial<Profile>[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.groups.list();
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
      toast.error('Erreur lors du chargement des groupes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadGroupDetails = useCallback(async (groupId: string) => {
    try {
      const [membersData, messagesData] = await Promise.all([
        api.groups.getMembers(groupId),
        api.groups.getMessages(groupId)
      ]);
      setMembers(membersData);
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load group details:', error);
    }
  }, []);

  const loadMessages = useCallback(async (groupId: string) => {
    try {
      const messagesData = await api.groups.getMessages(groupId);
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, []);

  useEffect(() => {
    loadGroups();

    // Realtime for groups and memberships
    const channel = supabase
      .channel('groups-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => loadGroups())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => {
        loadGroups();
        if (selectedGroup) loadGroupDetails(selectedGroup.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadGroups, selectedGroup, loadGroupDetails]);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupDetails(selectedGroup.id);
      
      const messageChannel = supabase
        .channel(`group-messages-${selectedGroup.id}`)
        .on(
          'postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'group_messages',
            filter: `group_id=eq.${selectedGroup.id}`
          }, 
          () => loadMessages(selectedGroup.id)
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(messageChannel);
      };
    }
  }, [selectedGroup, loadGroupDetails, loadMessages]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;

    try {
      setIsCreating(true);
      const groupData = {
        name: newGroupName,
        description: newGroupDesc,
        type: newGroupType,
        is_private: newGroupIsPrivate,
        created_by: user.id,
        max_members: newGroupType === 'study' ? 5 : undefined
      };
      
      const newGroup = await api.groups.create(groupData);
      toast.success('Groupe créé avec succès');
      setIsCreateOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupIsPrivate(false);
      loadGroups();
      setSelectedGroup(newGroup);
    } catch (error) {
      console.error('Failed to create group:', error);
      toast.error('Erreur lors de la création du groupe');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGroup = async (group: Group) => {
    if (!user) return;
    try {
      setIsJoining(true);
      await api.groups.join(group.id, user.id);
      toast.success(`Vous avez rejoint le groupe "${group.name}"`);
      loadGroups();
      setSelectedGroup(group);
    } catch (error: any) {
      console.error('Failed to join group:', error);
      toast.error(error.message || 'Erreur lors de l\'adhésion au groupe');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveGroup = async (group: Group) => {
    if (!user) return;
    try {
      await api.groups.leave(group.id, user.id);
      toast.success(`Vous avez quitté le groupe "${group.name}"`);
      setSelectedGroup(null);
      loadGroups();
    } catch (error) {
      console.error('Failed to leave group:', error);
      toast.error('Erreur lors du départ du groupe');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedGroup) return;

    try {
      setIsSending(true);
      await api.groups.sendMessage(selectedGroup.id, user.id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setIsSending(false);
    }
  };

  const handleUserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSearchQuery.trim()) return;
    try {
      setIsSearchingUsers(true);
      const results = await api.profiles.search(userSearchQuery);
      setSearchResults(results.filter(p => p.id !== user?.id));
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedGroup) return;
    try {
      await api.groups.join(selectedGroup.id, userId);
      toast.success('Membre ajouté avec succès');
      setSearchResults(prev => prev.filter(p => p.id !== userId));
      loadGroupDetails(selectedGroup.id);
    } catch (error: any) {
      toast.error(error.message || 'Échec de l\'ajout du membre');
    }
  };

  const handleJoinByToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || !user) return;
    try {
      setIsJoiningToken(true);
      const group = await api.groups.joinByToken(tokenInput, user.id);
      toast.success(`Vous avez rejoint le groupe "${group.name}"`);
      setTokenInput('');
      loadGroups();
      setSelectedGroup(group);
    } catch (error: any) {
      toast.error(error.message || 'Échec de l\'adhésion au groupe');
    } finally {
      setIsJoiningToken(false);
    }
  };

  const handleUpdateGroupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    try {
      setIsUpdatingSettings(true);
      const updated = await api.groups.update(selectedGroup.id, {
        is_private: selectedGroup.is_private,
        name: selectedGroup.name,
        description: selectedGroup.description
      });
      setSelectedGroup(updated);
      toast.success('Paramètres mis à jour');
      setIsSettingsOpen(false);
    } catch (error) {
      toast.error('Échec de la mise à jour');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleResetToken = async () => {
    if (!selectedGroup) return;
    try {
      setIsUpdatingSettings(true);
      const newToken = encodeURIComponent(Math.random().toString(36).substring(2, 8).toUpperCase());
      const updated = await api.groups.update(selectedGroup.id, { join_token: newToken });
      setSelectedGroup(updated);
      toast.success('Nouveau code généré');
    } catch (error) {
      toast.error('Échec de la génération du code');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const isMember = (groupId: string) => {
    return members.some(m => m.user_id === user?.id && m.group_id === groupId) || 
           groups.find(g => g.id === groupId)?.created_by === user?.id;
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Espaces d'Échange</h1>
          <p className="text-muted-foreground mt-1">Rejoignez des groupes d'études ou de TD pour collaborer.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Créer un groupe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau groupe</DialogTitle>
              <DialogDescription>
                Créez un espace pour étudier ou échanger sur vos cours.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Nom du groupe</Label>
                <Input 
                  id="group-name" 
                  value={newGroupName} 
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="ex: Groupe d'Algèbre L1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-desc">Description</Label>
                <Textarea 
                  id="group-desc" 
                  value={newGroupDesc} 
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Décrivez l'objectif du groupe..."
                />
              </div>
              <div className="space-y-2">
                <Label>Type de groupe</Label>
                <div className="flex gap-4">
                  <Button 
                    type="button"
                    variant={newGroupType === 'study' ? 'default' : 'outline'}
                    onClick={() => setNewGroupType('study')}
                    className="flex-1"
                  >
                    Études (Max 5)
                  </Button>
                  <Button 
                    type="button"
                    variant={newGroupType === 'td' ? 'default' : 'outline'}
                    onClick={() => setNewGroupType('td')}
                    className="flex-1"
                  >
                    TD (Illimité)
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-xl bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">Groupe Privé</Label>
                  <p className="text-xs text-muted-foreground leading-snug">Seul les personnes avec un code peuvent rejoindre.</p>
                </div>
                <Switch 
                  checked={newGroupIsPrivate} 
                  onCheckedChange={setNewGroupIsPrivate}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isCreating} className="w-full">
                  {isCreating ? <Loader2 className="animate-spin h-4 w-4" /> : 'Créer le groupe'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Groups List */}
        <div className={cn(
          "lg:col-span-4 space-y-6",
          selectedGroup && "max-md:hidden"
        )}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un groupe..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Card className="border shadow-none bg-accent/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                Rejoindre par code
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <form onSubmit={handleJoinByToken} className="flex gap-2">
                <Input 
                  placeholder="Code de groupe" 
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button type="submit" size="sm" className="h-8" disabled={isJoiningToken || !tokenInput.trim()}>
                  {isJoiningToken ? <Loader2 className="animate-spin h-3 w-3" /> : 'Go'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Tabs defaultValue="study" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="study">Études</TabsTrigger>
              <TabsTrigger value="td">TD</TabsTrigger>
            </TabsList>
            
            <TabsContent value="study" className="mt-4 space-y-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full bg-muted" />
                ))
              ) : filteredGroups.filter(g => g.type === 'study').length === 0 ? (
                <p className="text-center text-muted-foreground py-8 italic">Aucun groupe d'études trouvé.</p>
              ) : (
                filteredGroups.filter(g => g.type === 'study').map(group => (
                  <GroupCard 
                    key={group.id} 
                    group={group} 
                    isSelected={selectedGroup?.id === group.id}
                    onSelect={() => setSelectedGroup(group)}
                    onJoin={() => handleJoinGroup(group)}
                    isMember={isMember(group.id)}
                    isFull={(group.members_count || 0) >= (group.max_members || 5)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="td" className="mt-4 space-y-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full bg-muted" />
                ))
              ) : filteredGroups.filter(g => g.type === 'td').length === 0 ? (
                <p className="text-center text-muted-foreground py-8 italic">Aucun groupe de TD trouvé.</p>
              ) : (
                filteredGroups.filter(g => g.type === 'td').map(group => (
                  <GroupCard 
                    key={group.id} 
                    group={group} 
                    isSelected={selectedGroup?.id === group.id}
                    onSelect={() => setSelectedGroup(group)}
                    onJoin={() => handleJoinGroup(group)}
                    isMember={isMember(group.id)}
                    isFull={false}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Area: Chat / Details */}
        <div className={cn(
          "lg:col-span-8",
          !selectedGroup && "max-md:hidden"
        )}>
          {selectedGroup ? (
            <div className="flex flex-col h-[700px] border rounded-2xl bg-background overflow-hidden shadow-sm">
              {/* Chat Header */}
              <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden" 
                    onClick={() => setSelectedGroup(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {selectedGroup.type === 'study' ? <Users className="h-5 w-5 text-primary" /> : <BookOpen className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{selectedGroup.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedGroup.type === 'study' ? 'Groupe d\'études' : 'Groupe de TD'} • {members.length} membres
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedGroup.created_by === user?.id && (
                    <Dialog open={isSettingsOpen} onOpenChange={(open) => {
                      setIsSettingsOpen(open);
                      if (open && selectedGroup) {
                        setEditMaxMembers(selectedGroup.max_members || 5);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Settings className="h-5 w-5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Paramètres du Groupe</DialogTitle>
                          <DialogDescription>Gérez la confidentialité et les accès.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          <div className="flex items-center justify-between p-4 border rounded-2xl bg-muted/20">
                            <div className="space-y-0.5">
                              <Label className="text-base font-bold">Groupe Privé</Label>
                              <p className="text-xs text-muted-foreground leading-snug">Rendre le groupe invisible et accessible uniquement par code.</p>
                            </div>
                            <Switch 
                              checked={selectedGroup.is_private} 
                              onCheckedChange={async (checked) => {
                                try {
                                  const updated = await api.groups.update(selectedGroup.id, { is_private: checked });
                                  setSelectedGroup(updated);
                                  toast.success(checked ? 'Groupe privé' : 'Groupe public');
                                } catch (error) {
                                  toast.error('Échec de la mise à jour');
                                }
                              }}
                            />
                          </div>
                          {selectedGroup.is_private && (
                            <div className="p-4 border rounded-2xl space-y-3">
                              <Label className="text-sm font-bold">Code de Groupe Actuel</Label>
                              <div className="flex items-center gap-3">
                                <code className="flex-1 p-2 bg-muted rounded-lg font-mono font-bold tracking-widest text-center">{selectedGroup.join_token || '---'}</code>
                                <Button variant="outline" size="sm" onClick={handleResetToken} disabled={isUpdatingSettings}>
                                  Réinitialiser
                                </Button>
                              </div>
                            </div>
                          )}
                          <div className="space-y-3 p-4 border rounded-2xl">
                            <Label className="text-sm font-bold">Nombre max. de membres</Label>
                            <div className="flex items-center gap-4">
                              <Input 
                                type="number" 
                                value={editMaxMembers} 
                                onChange={(e) => setEditMaxMembers(parseInt(e.target.value))}
                                min={2}
                                max={100}
                                className="w-24"
                              />
                              <Button 
                                size="sm" 
                                onClick={async () => {
                                  try {
                                    const updated = await api.groups.update(selectedGroup.id, { max_members: editMaxMembers });
                                    setSelectedGroup(updated);
                                    toast.success('Limite mise à jour');
                                  } catch (error) {
                                    toast.error('Échec de la mise à jour');
                                  }
                                }}
                              >
                                Appliquer
                              </Button>
                            </div>
                          </div>
                          <div className="pt-4 border-t">
                            <Button 
                              variant="destructive" 
                              className="w-full gap-2"
                              onClick={async () => {
                                if (confirm('Êtes-vous sûr de vouloir supprimer ce groupe ? Cette action est irréversible.')) {
                                  try {
                                    await supabase.from('groups').delete().eq('id', selectedGroup.id);
                                    toast.success('Groupe supprimé');
                                    setSelectedGroup(null);
                                    loadGroups();
                                  } catch (error) {
                                    toast.error('Échec de la suppression');
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer le groupe
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {selectedGroup.created_by === user?.id && (
                    <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <UserPlus className="h-4 w-4" />
                          <span className="hidden sm:inline">Ajouter</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ajouter un membre</DialogTitle>
                          <DialogDescription>Recherchez un étudiant par son pseudo ou email.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <form onSubmit={handleUserSearch} className="flex gap-2">
                            <Input 
                              placeholder="Rechercher..." 
                              value={userSearchQuery}
                              onChange={(e) => setUserSearchQuery(e.target.value)}
                            />
                            <Button type="submit" size="icon" disabled={isSearchingUsers}>
                              {isSearchingUsers ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
                            </Button>
                          </form>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {searchResults.map(p => (
                              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                <Link to={`/profile/${p.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={p.avatar_url} />
                                    <AvatarFallback>{p.email?.charAt(0).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col text-left">
                                    <span className="text-sm font-medium">{p.email?.split('@')[0]}</span>
                                    <span className="text-[10px] text-muted-foreground">{p.email}</span>
                                  </div>
                                </Link>
                                <Button size="sm" variant="ghost" onClick={() => p.id && handleAddMember(p.id)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            {searchResults.length === 0 && !isSearchingUsers && userSearchQuery && (
                              <p className="text-center text-xs text-muted-foreground py-4">Aucun résultat trouvé.</p>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Info className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{selectedGroup.name}</DialogTitle>
                        <DialogDescription>Détails du groupe</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-1">
                          <Label className="text-xs uppercase font-bold text-muted-foreground">Description</Label>
                          <p className="text-sm">{selectedGroup.description || 'Aucune description fournie.'}</p>
                        </div>
                        {selectedGroup.join_token && isMember(selectedGroup.id) && (
                          <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                            <Label className="text-[10px] uppercase font-bold text-primary mb-1 block">Code de partage</Label>
                            <div className="flex items-center justify-between gap-2">
                              <code className="text-lg font-mono font-bold tracking-widest">{selectedGroup.join_token}</code>
                              <Button variant="ghost" size="sm" onClick={() => {
                                navigator.clipboard.writeText(selectedGroup.join_token!);
                                toast.success('Code copié !');
                              }}>
                                Copier
                              </Button>
                            </div>
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label className="text-xs uppercase font-bold text-muted-foreground">Membres ({members.length})</Label>
                          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mt-2">
                            {members.map(member => (
                              <Link 
                                key={member.id} 
                                to={`/profile/${member.user_id}`}
                                className="flex items-center gap-2 text-sm p-1 rounded-lg hover:bg-muted transition-colors"
                              >
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={member.profiles?.avatar_url} />
                                  <AvatarFallback>{member.profiles?.email.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span>{member.profiles?.email.split('@')[0]}</span>
                                {member.user_id === selectedGroup.created_by && <Badge variant="outline" className="text-[10px] ml-auto">Admin</Badge>}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="destructive" className="w-full" onClick={() => handleLeaveGroup(selectedGroup)}>
                          <LogOut className="mr-2 h-4 w-4" /> Quitter le groupe
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-accent/5">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 space-y-2">
                    <MessageSquare className="h-12 w-12" />
                    <p className="text-sm italic">Aucun message pour le moment. Commencez la discussion !</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex flex-col max-w-[80%] space-y-1",
                        msg.user_id === user?.id ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                         {msg.user_id !== user?.id && (
                           <Link to={`/profile/${msg.user_id}`} className="flex items-center gap-2 hover:opacity-80">
                             <Avatar className="h-5 w-5">
                               <AvatarImage src={msg.profiles?.avatar_url} />
                               <AvatarFallback>{msg.profiles?.email.charAt(0).toUpperCase()}</AvatarFallback>
                             </Avatar>
                             <span className="text-[10px] font-bold text-muted-foreground">
                               {msg.profiles?.email.split('@')[0]}
                             </span>
                           </Link>
                         )}
                         {msg.user_id === user?.id && (
                           <span className="text-[10px] font-bold text-muted-foreground">
                             Vous
                           </span>
                         )}
                      </div>
                      <div 
                        className={cn(
                          "px-4 py-2 rounded-2xl text-sm shadow-sm",
                          msg.user_id === user?.id 
                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                            : "bg-background border rounded-tl-none"
                        )}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-muted-foreground/60 px-1">
                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t bg-background">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input 
                    placeholder="Écrivez votre message..." 
                    className="flex-1 rounded-full px-6"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isSending}
                  />
                  <Button type="submit" size="icon" className="rounded-full h-10 w-10 shrink-0" disabled={isSending || !newMessage.trim()}>
                    {isSending ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full border rounded-2xl bg-accent/5 p-8 text-center">
              <div className="p-6 bg-primary/10 rounded-full mb-4">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Sélectionnez un groupe</h3>
              <p className="text-muted-foreground max-w-md">
                Choisissez un groupe dans la liste pour commencer à échanger avec d'autres étudiants ou créez votre propre espace de discussion.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupCard({ 
  group, 
  isSelected, 
  onSelect, 
  onJoin, 
  isMember, 
  isFull 
}: { 
  group: Group; 
  isSelected: boolean; 
  onSelect: () => void; 
  onJoin: () => void; 
  isMember: boolean;
  isFull: boolean;
}) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md border-l-4",
        isSelected ? "border-primary shadow-md bg-primary/5" : "hover:border-primary/50",
        !isSelected && "border-l-transparent"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className={cn(
            "p-3 rounded-xl shrink-0",
            isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            {group.type === 'study' ? <Users className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-bold truncate">{group.name}</h4>
            <p className="text-xs text-muted-foreground truncate">{group.description || 'Aucune description'}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[9px] h-4 px-1">
                {group.members_count || 0} membres
              </Badge>
              {isFull && <Badge variant="destructive" className="text-[9px] h-4 px-1">Plein</Badge>}
            </div>
          </div>
        </div>
        {!isMember && (
          <Button 
            size="sm" 
            variant="outline" 
            className="shrink-0 h-8 gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onJoin();
            }}
            disabled={isFull}
          >
            <UserPlus className="h-3.5 w-3.5" /> Rejoindre
          </Button>
        )}
      </CardContent>
    </Card>
  );
}