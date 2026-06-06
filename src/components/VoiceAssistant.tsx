import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Loader2, 
  Send,
  Trash2,
  Download,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';

interface VoiceAssistantProps {
  onClose?: () => void;
}

export default function VoiceAssistant({ onClose }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [inputText, setInputText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('Enregistrement démarré');
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
      toast.error('Impossible d\'accéder au microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      toast.info('Enregistrement arrêté, transcription en cours...');
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('response_format', 'json');
      formData.append('language', 'fr'); // French language

      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: formData,
      });

      if (error) {
        throw error;
      }

      if (data && data.text) {
        setTranscribedText(data.text);
        setInputText(data.text);
        toast.success('Transcription réussie !');
      } else {
        throw new Error('Aucun texte transcrit');
      }
    } catch (error: any) {
      console.error('Erreur lors de la transcription:', error);
      toast.error(error.message || 'Erreur lors de la transcription');
    } finally {
      setIsTranscribing(false);
    }
  };

  const speakText = async () => {
    if (!inputText.trim()) {
      toast.error('Veuillez entrer du texte à lire');
      return;
    }

    setIsSpeaking(true);
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          input: inputText,
          voice: 'heart',
          response_format: 'mp3',
        },
      });

      if (error) {
        throw error;
      }

      // Create a blob from the response
      const audioBlob = new Blob([data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(audioBlob);
      
      // Revoke old URL if exists
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      
      setAudioUrl(url);

      // Play the audio
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        toast.error('Erreur lors de la lecture audio');
      };

      await audio.play();
      toast.success('Lecture audio démarrée');
    } catch (error: any) {
      console.error('Erreur lors de la synthèse vocale:', error);
      toast.error(error.message || 'Erreur lors de la synthèse vocale');
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
      toast.info('Lecture arrêtée');
    }
  };

  const downloadAudio = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = 'speech.mp3';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Téléchargement démarré');
    }
  };

  const clearAll = () => {
    setTranscribedText('');
    setInputText('');
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
    toast.info('Tout effacé');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Assistant Vocal
          </CardTitle>
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              <div className="h-2 w-2 rounded-full bg-white mr-2" />
              {formatTime(recordingTime)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-6 space-y-6 overflow-auto">
        {/* Recording Section */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground">
            Enregistrement Audio
          </h3>
          <div className="flex gap-3">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                disabled={isTranscribing}
                className="flex-1"
              >
                <Mic className="h-4 w-4 mr-2" />
                Démarrer l'enregistrement
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                variant="destructive"
                className="flex-1"
              >
                <MicOff className="h-4 w-4 mr-2" />
                Arrêter l'enregistrement
              </Button>
            )}
          </div>
          
          {isTranscribing && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-4 bg-muted rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              Transcription en cours...
            </div>
          )}
        </div>

        {/* Transcribed Text Display */}
        {transcribedText && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">
              Texte Transcrit
            </h3>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm">{transcribedText}</p>
            </div>
          </div>
        )}

        {/* Text Input Section */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground">
            Texte à Lire
          </h3>
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Entrez le texte que vous souhaitez entendre..."
            className="min-h-[120px] resize-none"
          />
        </div>

        {/* Text-to-Speech Controls */}
        <div className="flex flex-wrap gap-3">
          {!isSpeaking ? (
            <Button
              onClick={speakText}
              disabled={!inputText.trim() || isTranscribing}
              variant="default"
            >
              <Volume2 className="h-4 w-4 mr-2" />
              Lire le texte
            </Button>
          ) : (
            <Button
              onClick={stopSpeaking}
              variant="destructive"
            >
              <VolumeX className="h-4 w-4 mr-2" />
              Arrêter la lecture
            </Button>
          )}

          {audioUrl && (
            <Button
              onClick={downloadAudio}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          )}

          <Button
            onClick={clearAll}
            variant="outline"
            disabled={isRecording || isSpeaking}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Effacer tout
          </Button>
        </div>

        {/* Info Message */}
        <div className="flex items-start gap-2 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">Comment utiliser l'assistant vocal :</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Cliquez sur "Démarrer l'enregistrement" pour enregistrer votre voix</li>
              <li>Le texte sera automatiquement transcrit après l'arrêt</li>
              <li>Modifiez le texte si nécessaire, puis cliquez sur "Lire le texte"</li>
              <li>Téléchargez l'audio généré si vous le souhaitez</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}