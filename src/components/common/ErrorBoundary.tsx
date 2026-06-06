import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="text-center max-w-md space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="text-xl font-bold">Une erreur est survenue</h1>
            <p className="text-muted-foreground text-sm">
              {this.state.error?.message || 'Erreur inattendue'}
            </p>
            <Button onClick={() => { this.setState({ hasError: false }); window.location.href = '/'; }}>
              Recharger la page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
