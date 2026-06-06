import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Image as ImageIcon, 
  File, 
  Download, 
  X, 
  ZoomIn, 
  ZoomOut,
  RotateCw,
  Maximize2,
  FileCode,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface FileViewerProps {
  onClose?: () => void;
}

export default function FileViewer({ onClose }: FileViewerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setZoom(100);
    setRotation(0);

    try {
      const fileType = file.type;

      // Gestion des images
      if (fileType.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFileContent(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
      // Gestion des fichiers texte
      else if (fileType.startsWith('text/') || fileType === 'application/json') {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFileContent(e.target?.result as string);
        };
        reader.readAsText(file);
      }
      // Gestion des PDF
      else if (fileType === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFileContent(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
      // Gestion des vidéos
      else if (fileType.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFileContent(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
      // Gestion des audios
      else if (fileType.startsWith('audio/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFileContent(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
      else {
        toast.error('Type de fichier non supporté pour la prévisualisation');
        setFileContent(null);
      }
    } catch (error) {
      console.error('Erreur lors de la lecture du fichier:', error);
      toast.error('Erreur lors de la lecture du fichier');
    }
  };

  const handleDownload = () => {
    if (!selectedFile) return;

    const url = URL.createObjectURL(selectedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Téléchargement démarré');
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
    if (type.startsWith('text/')) return <FileText className="h-5 w-5" />;
    if (type === 'application/pdf') return <FileText className="h-5 w-5" />;
    if (type === 'application/json') return <FileCode className="h-5 w-5" />;
    if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="h-5 w-5" />;
    if (type.startsWith('video/')) return <FileVideo className="h-5 w-5" />;
    if (type.startsWith('audio/')) return <FileAudio className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const renderFilePreview = () => {
    if (!selectedFile || !fileContent) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <AlertCircle className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <p className="text-muted-foreground">
            Sélectionnez un fichier pour le prévisualiser
          </p>
        </div>
      );
    }

    const fileType = selectedFile.type;

    // Prévisualisation des images
    if (fileType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-full overflow-auto p-4">
          <img
            src={fileContent}
            alt={selectedFile.name}
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transition: 'transform 0.3s ease',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
          />
        </div>
      );
    }

    // Prévisualisation des PDF
    if (fileType === 'application/pdf') {
      return (
        <div className="h-full w-full">
          <iframe
            src={fileContent}
            className="w-full h-full border-0"
            title={selectedFile.name}
          />
        </div>
      );
    }

    // Prévisualisation des vidéos
    if (fileType.startsWith('video/')) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <video
            src={fileContent}
            controls
            className="max-w-full max-h-full"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
        </div>
      );
    }

    // Prévisualisation des audios
    if (fileType.startsWith('audio/')) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="w-full max-w-md">
            <div className="mb-4 text-center">
              <FileAudio className="h-24 w-24 mx-auto text-primary mb-4" />
              <p className="font-medium">{selectedFile.name}</p>
            </div>
            <audio src={fileContent} controls className="w-full">
              Votre navigateur ne supporte pas la lecture audio.
            </audio>
          </div>
        </div>
      );
    }

    // Prévisualisation des fichiers texte
    if (fileType.startsWith('text/') || fileType === 'application/json') {
      return (
        <div className="h-full overflow-auto p-4">
          <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
            <code>{fileContent}</code>
          </pre>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <File className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">
          Prévisualisation non disponible pour ce type de fichier
        </p>
        <Button onClick={handleDownload} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Télécharger le fichier
        </Button>
      </div>
    );
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Lecteur de Fichiers
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Barre d'outils */}
        <div className="border-b p-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.txt,.json,.csv,.md"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="default"
          >
            <File className="h-4 w-4 mr-2" />
            Sélectionner un fichier
          </Button>

          {selectedFile && (
            <>
              <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg">
                {getFileIcon(selectedFile.type)}
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {selectedFile.name}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {formatFileSize(selectedFile.size)}
                </Badge>
              </div>

              {selectedFile.type.startsWith('image/') && (
                <>
                  <div className="h-6 w-px bg-border" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoom(Math.max(25, zoom - 25))}
                    disabled={zoom <= 25}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">{zoom}%</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoom(Math.min(200, zoom + 25))}
                    disabled={zoom >= 200}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setRotation((rotation + 90) % 360)}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setZoom(100)}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </>
              )}

              <div className="h-6 w-px bg-border" />
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </>
          )}
        </div>

        {/* Zone de prévisualisation */}
        <div className="flex-1 overflow-hidden bg-muted/30">
          {renderFilePreview()}
        </div>
      </CardContent>
    </Card>
  );
}