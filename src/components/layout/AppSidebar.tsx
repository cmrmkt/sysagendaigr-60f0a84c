import { useState, useMemo } from "react";
 import { Calendar, Users, Church, LogOut, Menu, X, LayoutDashboard, Megaphone, ListTodo, KeyRound, CalendarClock, ChevronUp, Moon, Sun, Bell, Settings, MessageCircle, BookOpen } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import { differenceInDays } from "date-fns";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Tarefas", url: "/meus-quadros", icon: ListTodo },
  { title: "Mural", url: "/mural", icon: Megaphone },
  { title: "Eventos Padrões", url: "/eventos-padroes", icon: CalendarClock },
  { title: "Membros", url: "/membros", icon: Users },
  { title: "Ministérios", url: "/ministerios", icon: Church },
];

const AppSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, logout, organization } = useAuth();
  const { theme, setTheme } = useTheme();

   const isAdmin = role === "admin" || role === "super_admin";
 
  const trialDaysRemaining = useMemo(() => {
    if (!organization?.trial_ends_at) return null;
    const trialEnd = new Date(organization.trial_ends_at);
    const today = new Date();
    const days = differenceInDays(trialEnd, today);
    return days >= 0 ? days : 0;
  }, [organization?.trial_ends_at]);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      {/* Mobile Header - sticky para funcionar melhor em iframes */}
      <header 
        className="lg:hidden sticky top-0 left-0 right-0 h-14 bg-card border-b shadow-sm z-50 flex items-center justify-between px-4 flex-shrink-0"
        style={{ 
          position: '-webkit-sticky',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)'
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground truncate">
            {organization?.name || "Agenda da Igreja"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9 mr-1"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="h-10 w-10 bg-secondary border-border text-foreground hover:bg-accent"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
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
        <div className="hidden lg:flex items-center gap-3 px-6 py-4 border-b bg-secondary/30">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="min-w-0 flex-1 cursor-default">
                  <h1 className="font-semibold text-foreground truncate">
                    {organization?.name || "Agenda da Igreja"}
                  </h1>
                  <p className="text-xs text-muted-foreground">Organize sua igreja</p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-xs">
                <p className="font-medium">{organization?.name || "Agenda da Igreja"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 flex-shrink-0 border-border"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {isAdmin && (
            <NavLink
              to="/guia-inicio"
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
                "hover:bg-secondary",
                isActive("/guia-inicio")
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-foreground"
              )}
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">Guia de Início</span>
            </NavLink>
          )}
          {menuItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
                "hover:bg-secondary",
                isActive(item.url)
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.title}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer Compacto com Dropdown */}
        <div className="flex-shrink-0 border-t bg-card">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-4 hover:bg-secondary transition-colors text-left">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-primary">
                    {profile?.name?.charAt(0) || "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {profile?.name || "Usuário"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {trialDaysRemaining !== null 
                      ? `Demo • ${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'dia' : 'dias'}`
                      : role === "admin" || role === "super_admin" 
                        ? "Administrador" 
                        : role === "leader" 
                          ? "Líder" 
                          : "Visualizador"
                    }
                  </p>
                </div>
                <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent 
              side="top" 
              align="start"
              className="w-56"
            >
              {/* Alternar Tema */}
              <DropdownMenuItem 
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 mr-2" />
                ) : (
                  <Moon className="w-4 h-4 mr-2" />
                )}
                <span>Alternar Tema</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Alterar Senha */}
              <DropdownMenuItem 
                onClick={() => {
                  setShowPasswordModal(true);
                  setIsOpen(false);
                }}
              >
                <KeyRound className="w-4 h-4 mr-2" />
                <span>Alterar Senha</span>
              </DropdownMenuItem>
              
               {/* Notificações - disponível para todos */}
               <DropdownMenuItem 
                 onClick={() => {
                   navigate("/configuracoes/notificacoes");
                   setIsOpen(false);
                 }}
               >
                 <Bell className="w-4 h-4 mr-2" />
                 <span>Notificações</span>
               </DropdownMenuItem>
                
               {isAdmin && (
                 <>
                   <DropdownMenuSeparator />
                   
                   {/* Guia de Início */}
                   <DropdownMenuItem 
                     onClick={() => {
                       navigate("/guia-inicio");
                       setIsOpen(false);
                     }}
                   >
                     <BookOpen className="w-4 h-4 mr-2" />
                     <span>Guia de Início</span>
                   </DropdownMenuItem>
                   
                   <DropdownMenuSeparator />
                   
                   <DropdownMenuItem 
                     onClick={() => {
                       navigate("/configuracoes/whatsapp");
                       setIsOpen(false);
                     }}
                   >
                     <MessageCircle className="w-4 h-4 mr-2" />
                     <span>Configurar WhatsApp</span>
                   </DropdownMenuItem>
                   <DropdownMenuItem 
                     onClick={() => {
                       navigate("/configuracoes/lembretes");
                       setIsOpen(false);
                     }}
                   >
                     <Settings className="w-4 h-4 mr-2" />
                     <span>Configurar Lembretes</span>
                   </DropdownMenuItem>
                 </>
               )}
              
              <DropdownMenuSeparator />
              {/* Sair */}
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Change Password Modal */}
      <ChangePasswordModal open={showPasswordModal} onOpenChange={setShowPasswordModal} />
    </>
  );
};

export default AppSidebar;
