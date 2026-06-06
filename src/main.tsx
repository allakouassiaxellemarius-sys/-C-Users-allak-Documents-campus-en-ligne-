import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AppWrapper } from "./components/common/PageMeta";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { initPWATracking } from "@/lib/pwaTracking";

// Enregistrer le Service Worker pour le mode hors ligne
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker enregistré avec succès:', registration.scope);
        
        // Vérifier les mises à jour toutes les heures
        setInterval(() => {
          registration.update();
        }, 3600000);
      })
      .catch((error) => {
        console.error('Erreur lors de l\'enregistrement du Service Worker:', error);
      });
  });
}

// Initialiser le tracking PWA
initPWATracking();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="mon-espace-etudiant-theme">
          <AppWrapper>
            <App />
          </AppWrapper>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);