import { lazy, Suspense } from 'react';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import type { ReactNode } from 'react';
import Layout from '@/components/layouts/Layout';
import { Navigate } from 'react-router-dom';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const RemindersPage = lazy(() => import('./pages/RemindersPage'));
const FilesPage = lazy(() => import('./pages/FilesPage'));
const GroupsPage = lazy(() => import('./pages/GroupsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const SuggestionsPage = lazy(() => import('./pages/SuggestionsPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const TeacherPage = lazy(() => import('./pages/TeacherPage'));
const MaterialsPage = lazy(() => import('./pages/MaterialsPage'));
const DirectoryPage = lazy(() => import('./pages/DirectoryPage'));
const UpdatesPage = lazy(() => import('./pages/UpdatesPage'));
const GradesPage = lazy(() => import('./pages/GradesPage'));
const VideoConferencePage = lazy(() => import('./pages/VideoConferencePage'));
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage'));
const TeacherMaintenancePage = lazy(() => import('./pages/TeacherMaintenancePage'));
const FileViewerPage = lazy(() => import('./pages/FileViewerPage'));
const VoiceAssistantPage = lazy(() => import('./pages/VoiceAssistantPage'));
const AppSettingsPage = lazy(() => import('./pages/AppSettingsPage'));
const PWAAnalyticsPage = lazy(() => import('./pages/PWAAnalyticsPage'));

const Loadable = (Component: any) => (props: any) => (
  <Suspense fallback={
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  }>
    <Component {...props} />
  </Suspense>
);

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const CoursesPageLoadable = Loadable(CoursesPage);
const DashboardPageLoadable = Loadable(DashboardPage);
const CalendarPageLoadable = Loadable(CalendarPage);
const RemindersPageLoadable = Loadable(RemindersPage);
const FilesPageLoadable = Loadable(FilesPage);
const GroupsPageLoadable = Loadable(GroupsPage);
const ProfilePageLoadable = Loadable(ProfilePage);
const AdminPageLoadable = Loadable(AdminPage);
const SuggestionsPageLoadable = Loadable(SuggestionsPage);
const MaintenancePageLoadable = Loadable(MaintenancePage);
const TeacherPageLoadable = Loadable(TeacherPage);
const MaterialsPageLoadable = Loadable(MaterialsPage);
const DirectoryPageLoadable = Loadable(DirectoryPage);
const UpdatesPageLoadable = Loadable(UpdatesPage);
const GradesPageLoadable = Loadable(GradesPage);
const VideoConferencePageLoadable = Loadable(VideoConferencePage);
const CoursesEnrollmentPage = lazy(() => import('./pages/CoursesEnrollmentPage'));
const CoursesEnrollmentPageLoadable = Loadable(CoursesEnrollmentPage);
const NotificationSettingsPageLoadable = Loadable(NotificationSettingsPage);
const TeacherMaintenancePageLoadable = Loadable(TeacherMaintenancePage);
const FileViewerPageLoadable = Loadable(FileViewerPage);
const VoiceAssistantPageLoadable = Loadable(VoiceAssistantPage);
const AppSettingsPageLoadable = Loadable(AppSettingsPage);
const PWAAnalyticsPageLoadable = Loadable(PWAAnalyticsPage);

const routes: RouteConfig[] = [
  {
    name: 'Accueil',
    path: '/',
    element: <LandingPage />
  },
  {
    name: 'Login',
    path: '/login',
    element: <LoginPage />
  },
  {
    name: 'Visioconférence',
    path: '/videoconference',
    element: (
      <Layout>
        <VideoConferencePageLoadable />
      </Layout>
    )
  },
  {
    name: 'Espace Étudiant',
    path: '/dashboard',
    element: (
      <Layout>
        <DashboardPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Évolution',
    path: '/updates',
    element: (
      <Layout>
        <UpdatesPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Mes Cours',
    path: '/courses',
    element: (
      <Layout>
        <CoursesPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Inscription aux Cours',
    path: '/courses/enroll',
    element: (
      <Layout>
        <CoursesEnrollmentPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Calendrier',
    path: '/calendar',
    element: (
      <Layout>
        <CalendarPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Rappels',
    path: '/reminders',
    element: (
      <Layout>
        <RemindersPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Documents',
    path: '/files',
    element: (
      <Layout>
        <FilesPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Groupes',
    path: '/groups',
    element: (
      <Layout>
        <GroupsPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Profil',
    path: '/profile/:userId?',
    element: (
      <Layout>
        <ProfilePageLoadable />
      </Layout>
    )
  },
  {
    name: 'Paramètres de notification',
    path: '/notifications/settings',
    element: (
      <Layout>
        <NotificationSettingsPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Admin',
    path: '/admin',
    element: (
      <Layout>
        <AdminPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Suggestions',
    path: '/suggestions',
    element: (
      <Layout>
        <SuggestionsPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Espace Enseignant',
    path: '/teacher',
    element: (
      <Layout>
        <TeacherPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Maintenance Enseignant',
    path: '/teacher/maintenance',
    element: (
      <Layout>
        <TeacherMaintenancePageLoadable />
      </Layout>
    )
  },
  {
    name: 'Supports de Cours',
    path: '/materials',
    element: (
      <Layout>
        <MaterialsPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Notes & Résultats',
    path: '/grades',
    element: (
      <Layout>
        <GradesPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Lecteur de Fichiers',
    path: '/file-viewer',
    element: (
      <Layout>
        <FileViewerPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Assistant Vocal',
    path: '/voice-assistant',
    element: (
      <Layout>
        <VoiceAssistantPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Paramètres App',
    path: '/app-settings',
    element: (
      <Layout>
        <AppSettingsPageLoadable />
      </Layout>
    )
  },

  {
    name: 'Analytics PWA',
    path: '/pwa-analytics',
    element: (
      <Layout>
        <PWAAnalyticsPageLoadable />
      </Layout>
    )
  },

  {
    name: 'Annuaire',
    path: '/directory',
    element: (
      <Layout>
        <DirectoryPageLoadable />
      </Layout>
    )
  },
  {
    name: 'Maintenance',
    path: '/maintenance',
    element: <MaintenancePage />
  },
  {
    name: 'Not Found',
    path: '*',
    element: <Navigate to="/" replace />
  }
];

export default routes;