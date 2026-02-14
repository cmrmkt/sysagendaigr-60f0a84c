import { useState } from "react";
import { Building2, FileText, Activity, LogOut, Eye, ChevronLeft, Menu, X, KeyRound, BookOpen, Bell } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";

const menuItems = [
  { title: "Organizações", url: "/super-admin/organizacoes", icon: Building2 },
  { title: "Faturas", url: "/super-admin/faturas", icon: FileText },
  { title: "Logs de Uso", url: "/super-admin/logs", icon: Activity },
  { title: "Notificações", url: "/super-admin/notificacoes", icon: Bell },
];

const SuperAdminSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout, viewingAsOrganization, setViewingAsOrganization } = useAuth();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleExitImpersonation = () => {
    setViewingAsOrganization(null);
    navigate("/super-admin/organizacoes");
  };

  return (
    <>
      {/* Mobile Header */}
      <header 
        className="lg:hidden sticky top-0 left-0 right-0 h-14 bg-card border-b shadow-sm z-50 flex items-center justify-between px-4 flex-shrink-0"
        style={{ 
          position: '-webkit-sticky',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)'
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center">
            <Building2 className="w-4 h-4 text-destructive" />
          </div>
          <span className="font-semibold text-foreground">Super Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="h-10 w-10 bg-secondary border-border text-foreground hover:bg-accent"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </header>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-foreground/20 z-40 pt-14 overflow-hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative left-0 lg:inset-y-auto lg:left-auto z-40 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:h-full flex flex-col",
          "top-14 bottom-0 lg:top-0",
          "lg:transform-none lg:translate-x-0 lg:flex-shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Desktop Header */}
        <div className="hidden lg:flex h-16 items-center gap-3 px-6 border-b">
          <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
            <Building2 className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Super Admin</h1>
            <p className="text-xs text-muted-foreground">Gerenciar Sistema</p>
          </div>
        </div>

        {/* Impersonation Banner */}
        {viewingAsOrganization && (
          <div className="mx-4 mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary">Visualizando como:</span>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">
              {viewingAsOrganization.name}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={handleExitImpersonation}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Sair da visualização
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-4 space-y-1 flex-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                "hover:bg-secondary",
                isActive(item.url)
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.title}</span>
            </NavLink>
          ))}

          {/* Documentation Link */}
          <a
            href="/guia-de-uso.html"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
              "hover:bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">Guia de Uso</span>
          </a>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t bg-card">
          <div className="flex items-center justify-between mb-3">
            <Badge variant="destructive" className="text-xs">
              Super Admin
            </Badge>
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>
          </div>

          {/* Action buttons first */}
          <div className="space-y-1 mb-3">
            <button
              onClick={() => {
                setShowPasswordModal(true);
                setIsOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full"
            >
              <KeyRound className="w-4 h-4" />
              <span className="text-sm">Alterar Senha</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sair</span>
            </button>
          </div>

          {/* User info below */}
          <div className="flex items-center gap-3 px-4 py-2 border-t pt-3">
            <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-destructive">
                {profile?.name?.charAt(0) || "S"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.name || "Super Admin"}
              </p>
              <p className="text-xs text-muted-foreground">Administrador do Sistema</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Change Password Modal */}
      <ChangePasswordModal open={showPasswordModal} onOpenChange={setShowPasswordModal} />
    </>
  );
};

export default SuperAdminSidebar;
