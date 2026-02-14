import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ManageRoute from "./components/ManageRoute";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import EventForm from "./pages/EventForm";
import EventTasks from "./pages/EventTasks";
import MyBoards from "./pages/MyBoards";
import Announcements from "./pages/Announcements";
import AnnouncementForm from "./pages/AnnouncementForm";
import Members from "./pages/Members";
import Ministries from "./pages/Ministries";
import UpcomingEvents from "./pages/UpcomingEvents";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import EventTemplates from "./pages/EventTemplates";
import ReminderSettings from "./pages/ReminderSettings";
import NotificationSettings from "./pages/NotificationSettings";
import WhatsAppSettings from "./pages/WhatsAppSettings";
import GettingStartedGuide from "./pages/GettingStartedGuide";
// Super Admin
import SuperAdminLayout from "./components/super-admin/SuperAdminLayout";
import SuperAdminRoute from "./components/super-admin/SuperAdminRoute";
import Organizations from "./pages/super-admin/Organizations";
import OrganizationDetails from "./pages/super-admin/OrganizationDetails";
import Invoices from "./pages/super-admin/Invoices";
import UsageLogs from "./pages/super-admin/UsageLogs";
import NotificationLogs from "./pages/super-admin/NotificationLogs";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Register />} />
                
                {/* Super Admin Routes */}
                <Route element={<SuperAdminRoute />}>
                  <Route element={<SuperAdminLayout />}>
                    <Route path="/super-admin/organizacoes" element={<Organizations />} />
                    <Route path="/super-admin/organizacoes/:id" element={<OrganizationDetails />} />
                    <Route path="/super-admin/faturas" element={<Invoices />} />
                    <Route path="/super-admin/logs" element={<UsageLogs />} />
                    <Route path="/super-admin/notificacoes" element={<NotificationLogs />} />
                    <Route path="/super-admin/guia-inicio" element={<GettingStartedGuide />} />
                  </Route>
                </Route>
                
                {/* App com Sidebar - Rotas Protegidas */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/guia-inicio" element={<GettingStartedGuide />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/agenda" element={<Agenda />} />
                    <Route path="/proximos-eventos" element={<UpcomingEvents />} />
                    <Route path="/evento/:id/tarefas" element={<EventTasks />} />
                    <Route path="/meus-quadros" element={<MyBoards />} />
                    <Route path="/mural" element={<Announcements />} />
                    <Route path="/eventos-padroes" element={<EventTemplates />} />
                    <Route path="/configuracoes/lembretes" element={<ReminderSettings />} />
                    <Route path="/configuracoes/notificacoes" element={<NotificationSettings />} />
                    <Route path="/configuracoes/whatsapp" element={<WhatsAppSettings />} />
                    <Route path="/membros" element={<Members />} />
                    <Route path="/ministerios" element={<Ministries />} />
                    
                    {/* Management Routes - Require non-viewer role */}
                    <Route element={<ManageRoute />}>
                      <Route path="/evento/novo" element={<EventForm />} />
                      <Route path="/evento/editar/:id" element={<EventForm />} />
                      <Route path="/mural/novo" element={<AnnouncementForm />} />
                      <Route path="/mural/editar/:id" element={<AnnouncementForm />} />
                    </Route>
                  </Route>
                </Route>
                
                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
