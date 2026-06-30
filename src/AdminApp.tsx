import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui/ToastContext';
import { Login } from '@/components/auth/Login';
import { SecretaryView } from '@/components/secretary/SecretaryView';
import { ForgotPassword } from '@/components/auth/ForgotPassword';
import { UpdatePassword } from '@/components/auth/UpdatePassword';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { loadTheme, applyTheme } from '@/utils/theme';
import { TasksViewNew } from '@/components/tasks/TasksViewNew';
import { ReportsView } from '@/components/reports/ReportsView';
import { UserManagement } from '@/components/users/UserManagement';
import { CalendarViewNew } from '@/components/calendar/CalendarViewNew';
import { MeetingsView } from '@/components/meetings/MeetingsView';
import { NewsView } from '@/components/news/NewsView';
import { ProposalsView } from '@/components/proposals/ProposalsView';
import { BenefitsView } from '@/components/benefits/BenefitsView';
import { AlliancesView } from '@/components/alliances/AlliancesView';
import { FinanceView } from '@/components/finance/FinanceView';
import { MediaManagement } from '@/components/resources/MediaManagement';
import { WhatsAppCenter } from '@/components/whatsapp/WhatsAppCenter';
import { TrainingView } from '@/components/training/TrainingView';
import { SettingsView } from '@/components/settings/SettingsView';
import { ChatbotView } from '@/components/chat/ChatbotView';
import { SurveysView } from '@/components/surveys/SurveysView';
import { EventsView } from '@/components/events/EventsView';
import { MailCenter } from '@/components/communications/MailCenter';
import { EventRegistrationPage } from '@/components/events/EventRegistrationPage';
import { CertificateVerificationPage } from '@/components/events/CertificateVerificationPage';
import { PublicEventReportPage } from '@/components/events/PublicEventReportPage';
import { VirtualAttendancePage } from '@/components/events/VirtualAttendancePage';
import { YoutubeCallback } from '@/components/reports/YoutubeCallback';
import { BirthdayManagement } from '@/components/team/BirthdayManagement';
import { CertificatesView } from '@/components/certificates/CertificatesView';
import { PublicSurveyPage } from '@/components/events/PublicSurveyPage';
import { MyCertificates } from '@/components/certificates/MyCertificates';
import { LiveEventPublicView } from '@/components/events/LiveEventPublicView';
import { AgentBubble } from '@/components/chat/AgentBubble';
import { SystemUpdateModal } from '@/components/ui/SystemUpdateModal';
import { ConfirmProvider } from '@/components/ui/ConfirmModal';
import { BottomNav } from '@/components/layout/BottomNav';
import { WhiteboardView } from '@/components/whiteboard/WhiteboardView';
import { RadarView } from '@/components/radar/RadarView';
import { TransmediaView } from '@/components/transmedia/TransmediaView';
import { ConflictsView } from '@/components/conflicts/ConflictsView';

// ErrorBoundary Global
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: '' };
  static getDerivedStateFromError(e: Error) {
    return { hasError: true, message: e.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', fontFamily: 'monospace', padding: 32 }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>⚠️</p>
          <p style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>Error de carga. Recarga la página.</p>
          <p style={{ fontSize: 11, color: '#666', maxWidth: 400, textAlign: 'center' }}>{this.state.message}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 24, padding: '10px 24px', background: '#0088FF', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0099ff] mx-auto mb-4"></div>
                    <p className="text-gray-400 font-mono text-xs">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

const Layout: React.FC = () => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const isChat = location.pathname === '/admin/chat';

    React.useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    return (
        <div className={`flex h-screen bg-background text-[#fafafa] font-sans antialiased overflow-hidden`}>
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className={`flex-1 flex flex-col h-screen overflow-hidden bg-background w-full pt-safe pb-safe`}>
                <Header onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className={`flex-1 overflow-y-auto bg-background p-4 md:pt-2 md:px-8 md:pb-8 ${isChat ? 'overflow-hidden flex flex-col p-0' : ''}`}>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="tasks" element={<TasksViewNew />} />
                        <Route path="reports" element={<ReportsView />} />
                        <Route path="calendar" element={<CalendarViewNew />} />
                        <Route path="meetings" element={<MeetingsView />} />
                        <Route path="events" element={<EventsView />} />
                        <Route path="events/moderator/:eventId" element={<EventsView />} />
                        <Route path="news" element={<NewsView />} />
                        <Route path="proposals" element={<ProposalsView />} />
                        <Route path="benefits" element={<BenefitsView />} />
                        <Route path="alliances" element={<AlliancesView />} />
                        <Route path="finance" element={<FinanceView />} />
                        <Route path="training" element={<TrainingView />} />
                        <Route path="users" element={<UserManagement />} />
                        <Route path="settings" element={<SettingsView />} />
                        <Route path="secretaria" element={<SecretaryView />} />
                        <Route path="chat" element={<ChatbotView />} />
                        <Route path="surveys" element={<SurveysView />} />
                        <Route path="communications" element={<MailCenter />} />
                        <Route path="media" element={<MediaManagement />} />
                        <Route path="whatsapp" element={<WhatsAppCenter />} />
                        <Route path="birthdays" element={<BirthdayManagement />} />
                        <Route path="certificates" element={<CertificatesView />} />
                        <Route path="my-certificates" element={<MyCertificates />} />
                        <Route path="whiteboard" element={<WhiteboardView />} />
                        <Route path="radar" element={<RadarView />} />
                        <Route path="transmedia" element={<TransmediaView />} />
                        <Route path="conflicts" element={<ConflictsView />} />
                        <Route path="api/youtube/callback" element={<YoutubeCallback />} />
                        <Route path="*" element={<Navigate to="/admin" replace />} />
                    </Routes>
                </main>
                <BottomNav />
            </div>

            <AgentBubble />
            <SystemUpdateModal />
        </div>
    );
};

export function AdminApp() {
    React.useEffect(() => {
        applyTheme(loadTheme());
    }, []);

    return (
        <AppErrorBoundary>
            <div className="admin-theme min-h-screen">
                <ToastProvider>
                    <ConfirmProvider>
                        <Routes>
                            <Route path="login" element={<Login />} />
                            <Route path="forgot-password" element={<ForgotPassword />} />
                            <Route path="update-password" element={<UpdatePassword />} />
                            <Route path="registro/:slug" element={<EventRegistrationPage />} />
                            <Route path="encuesta/:slug" element={<PublicSurveyPage />} />
                            <Route path="registro" element={<EventRegistrationPage />} />
                            <Route path="verificar/:id" element={<CertificateVerificationPage />} />
                            <Route path="reporte/:slug" element={<PublicEventReportPage />} />
                            <Route path="asistencia/:slug" element={<VirtualAttendancePage />} />
                            <Route path="evento/:eventId/vivo" element={<LiveEventPublicView />} />
                            <Route
                                path="/*"
                                element={
                                    <PrivateRoute>
                                        <Layout />
                                    </PrivateRoute>
                                }
                            />
                        </Routes>
                    </ConfirmProvider>
                </ToastProvider>
            </div>
        </AppErrorBoundary>
    );
}

export default AdminApp;
