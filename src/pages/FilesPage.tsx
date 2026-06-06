import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { Course, CourseFile } from '@/types/index';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  FileIcon, 
  Upload, 
  Trash2, 
  Download, 
  FileText, 
  Search, 
  Plus,
  Loader2,
  FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function FilesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  useEffect(() => {
    if (user) {
      loadData();

      const channel = supabase
        .channel('files-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'course_files',
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
      const [coursesData, filesData] = await Promise.all([
        api.courses.list(user!.id),
        api.files.list(user!.id)
      ]);
      setCourses(coursesData);
      setFiles(filesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) return;

    try {
      setIsUploading(true);
      const courseId = selectedCourseId === 'all' ? undefined : selectedCourseId;
      await api.files.upload(user!.id, fileToUpload, courseId);
      toast.success('Document mis en ligne avec succès');
      setFileToUpload(null);
      // Reset input
      const input = document.getElementById('file-upload') as HTMLInputElement;
      if (input) input.value = '';
      loadData();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Échec de la mise en ligne');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (file: CourseFile) => {
    try {
      const blob = await api.files.download(file.file_path);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Échec du téléchargement');
    }
  };

  const handleDelete = async (file: CourseFile) => {
    try {
      await api.files.delete(file.id, file.file_path);
      toast.success('Document supprimé');
      loadData();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Échec de la suppression');
    }
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = selectedCourseId === 'all' || f.course_id === selectedCourseId;
    return matchesSearch && matchesCourse;
  });

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Mes Documents</h1>
          <p className="text-muted-foreground mt-1">Gérez vos documents, notes et supports de cours personnels.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Upload Section */}
        <Card className="lg:col-span-1 h-fit shadow-md border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Ajouter un Document</CardTitle>
            <CardDescription>Mettre en ligne un nouveau document.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Sélectionner un fichier</Label>
                <div className="flex flex-col gap-2">
                  <Input 
                    id="file-upload" 
                    type="file" 
                    onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {fileToUpload && (
                    <p className="text-xs text-muted-foreground italic truncate">
                      Taille: {formatSize(fileToUpload.size)}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Associer à un cours (optionnel)</Label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un cours" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Aucun cours spécifique</SelectItem>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full shadow-sm" 
                disabled={!fileToUpload || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Mettre en ligne
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Files List Section */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un document..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full bg-muted" />
              ))
            ) : filteredFiles.length === 0 ? (
              <Card className="col-span-full border-dashed py-12 text-center bg-muted/20">
                <CardContent>
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground italic">Aucun document trouvé.</p>
                </CardContent>
              </Card>
            ) : (
              filteredFiles.map((file) => (
                <Card key={file.id} className="group hover:border-primary/30 transition-all border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 overflow-hidden">
                        <div className="p-2 bg-primary/5 rounded-lg shrink-0">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-bold text-sm truncate" title={file.name}>
                            {file.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {file.courses && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                                {file.courses.name}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {formatSize(file.file_size)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(file.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0" 
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="h-4 w-4 text-blue-500" />
                      <span className="sr-only">Télécharger</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50" 
                      onClick={() => handleDelete(file)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Supprimer</span>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}