import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-destructive/10 w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-3xl font-extrabold mb-4 tracking-tight">Oups ! Quelque chose s'est mal passé.</h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed italic">
            Une erreur inattendue est survenue lors de l'ouverture de l'application. 
            Nos techniciens ont été alertés.
          </p>
          <div className="flex gap-4">
            <Button 
              onClick={() => window.location.reload()} 
              className="font-bold flex items-center gap-2 px-6 shadow-lg shadow-primary/20"
            >
              <RotateCcw className="h-4 w-4" /> Recharger la page
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
              }}
              className="font-bold"
            >
              Réinitialiser l'application
            </Button>
          </div>
          {import.meta.env.MODE === 'development' && (
            <div className="mt-8 p-4 bg-muted rounded-xl text-left max-w-2xl overflow-auto border text-xs font-mono">
              <p className="font-bold mb-2 text-destructive">Erreur technique :</p>
              {this.state.error?.toString()}
              <pre className="mt-2 text-muted-foreground">{this.state.error?.stack}</pre>
            </div>
          )}
          <p className="mt-12 text-sm text-muted-foreground">
            &copy; 2026 mon espace étudiant
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;