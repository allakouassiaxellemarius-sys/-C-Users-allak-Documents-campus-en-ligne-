import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Users,
  Settings,
  Monitor,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export default function VideoConferencePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [roomName, setRoomName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Charger le script Jitsi Meet
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    document.body.appendChild(script);

    // Initialiser les valeurs par défaut
    const roomFromUrl = searchParams.get('room');
    if (roomFromUrl) {
      setRoomName(roomFromUrl);
    }
    
    if (profile) {
      setDisplayName(profile.username || profile.email || 'Utilisateur');
    }

    return () => {
      if (jitsiApi) {
        jitsiApi.dispose();
      }
      document.body.removeChild(script);
    };
  }, []);

  const joinMeeting = () => {
    if (!roomName.trim()) {
      toast.error('Veuillez entrer un nom de salle');
      return;
    }

    if (!displayName.trim()) {
      toast.error('Veuillez entrer votre nom');
      return;
    }

    setIsJoining(true);

    try {
      // Configuration Jitsi Meet
      const domain = 'meet.jit.si';
      const options = {
        roomName: roomName.trim().replace(/\s+/g, '-'),
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'closedcaptions',
            'desktop',
            'fullscreen',
            'fodeviceselection',
            'hangup',
            'profile',
            'chat',
            'recording',
            'livestreaming',
            'etherpad',
            'sharedvideo',
            'settings',
            'raisehand',
            'videoquality',
            'filmstrip',
            'invite',
            'feedback',
            'stats',
            'shortcuts',
            'tileview',
            'videobackgroundblur',
            'download',
            'help',
            'mute-everyone',
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#1a1a1a',
          DISABLE_VIDEO_BACKGROUND: false,
          FILM_STRIP_MAX_HEIGHT: 120,
        },
        userInfo: {
          displayName: displayName.trim(),
          email: user?.email || '',
        },
      };

      const api = new window.JitsiMeetExternalAPI(domain, options);
      
      api.addEventListener('videoConferenceJoined', () => {
        setIsInMeeting(true);
        setIsJoining(false);
        toast.success('Vous avez rejoint la réunion');
      });

      api.addEventListener('videoConferenceLeft', () => {
        setIsInMeeting(false);
        api.dispose();
        setJitsiApi(null);
        toast.info('Vous avez quitté la réunion');
      });

      api.addEventListener('readyToClose', () => {
        setIsInMeeting(false);
        api.dispose();
        setJitsiApi(null);
      });

      setJitsiApi(api);
    } catch (error) {
      console.error('Erreur lors du chargement de Jitsi:', error);
      toast.error('Erreur lors du chargement de la visioconférence');
      setIsJoining(false);
    }
  };

  const leaveMeeting = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('hangup');
    }
  };

  if (isInMeeting) {
    return (
      <div className="h-screen w-full flex flex-col bg-background">
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <Video className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold">{roomName}</h2>
              <p className="text-sm text-muted-foreground">{displayName}</p>
            </div>
          </div>
          <Button 
            variant="destructive" 
            onClick={leaveMeeting}
            className="gap-2"
          >
            <PhoneOff className="h-4 w-4" />
            Quitter
          </Button>
        </div>
        <div 
          ref={jitsiContainerRef} 
          className="flex-1 w-full"
          style={{ minHeight: 'calc(100vh - 73px)' }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Visioconférence</CardTitle>
              <CardDescription>
                Rejoignez ou créez une salle de réunion virtuelle
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="roomName">Nom de la salle</Label>
            <Input
              id="roomName"
              placeholder="Ex: Cours-Mathematiques-L1"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              disabled={isJoining}
            />
            <p className="text-sm text-muted-foreground">
              Entrez un nom unique pour votre salle de réunion
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Votre nom</Label>
            <Input
              id="displayName"
              placeholder="Votre nom d'affichage"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isJoining}
            />
          </div>

          <Button 
            onClick={joinMeeting} 
            disabled={isJoining || !roomName.trim() || !displayName.trim()}
            className="w-full"
            size="lg"
          >
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              <>
                <Video className="mr-2 h-5 w-5" />
                Rejoindre la réunion
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Fonctionnalités
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">Audio/Vidéo HD</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">Partage d'écran</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">Chat intégré</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">Enregistrement</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Conseils
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Utilisez un nom de salle unique pour votre cours</p>
            <p>• Partagez le nom de la salle avec vos étudiants</p>
            <p>• Vérifiez votre micro et caméra avant de rejoindre</p>
            <p>• Utilisez des écouteurs pour éviter l'écho</p>
            <p className="text-xs text-primary mt-3">
              💡 Astuce: Chaque cours dispose d'une salle permanente accessible depuis sa page
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}