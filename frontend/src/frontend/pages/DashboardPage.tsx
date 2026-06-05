import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AuthUser, authService } from "../services/auth";
import InvoicesView from "../components/InvoicesView";
import ReservationsView from "../components/ReservationsView";
import RolesPage from "./RolesPage";

const DashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const serviceType = import.meta.env.VITE_SERVICE_TYPE || "role-manage";
  const [activeTab, setActiveTab] = useState<string>(serviceType);

  useEffect(() => {
    const loadUser = async () => {
      if (!authService.getAccessToken()) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const currentUser = await authService.me();
        setUser(currentUser);
      } catch {
        authService.logout();
        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    void loadUser();
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate("/login", { replace: true });
  };

  const handleCopyId = () => {
    if (user) {
      void navigator.clipboard.writeText(user.id);
      toast.success("ID de miembro copiado al portapapeles");
    }
  };

  const getUserInitials = () => {
    if (!user) return "?";
    if (user.full_name) {
      return user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex flex-col justify-center items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-coral" />
        <p className="font-body text-sm text-ink-soft">Cargando aplicación...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col md:flex-row font-body antialiased">
      {/* Premium Navigation Sidebar */}
      <aside className="w-full md:w-64 bg-paper-deep border-b md:border-b-0 md:border-r border-paper-muted flex flex-col justify-between p-6 shrink-0 z-40">
        <div className="space-y-6">
          {/* Logo / Branding */}
          <div className="flex items-center gap-2">
            <span className="font-heading text-xl font-bold tracking-tight text-ink flex items-center gap-1">
              <span className="text-coral">Coworking</span> Platform
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-1 pb-3 md:pb-0 scrollbar-none">
            {[
              { id: "role-manage", label: "Control de Accesos", icon: "🛡️" },
              { id: "billing-service", label: "Facturación & Finanzas", icon: "💵" },
              { id: "checking-service", label: "Gestión de Reservas", icon: "🦀" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-body text-xs font-semibold uppercase tracking-wider transition-all w-full text-left whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-coral text-white shadow-md scale-[1.02]"
                    : "text-ink-soft hover:bg-paper hover:text-ink border border-transparent"
                }`}
              >
                <span className="text-sm shrink-0">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* User profile section */}
        {user && (
          <div className="border-t border-paper-muted/80 pt-6 mt-6 md:mt-0 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-coral/15 border border-coral/20 flex items-center justify-center font-heading text-sm font-semibold text-coral shadow-sm shrink-0">
                {getUserInitials()}
              </div>
              <div className="text-left overflow-hidden">
                <p className="font-body text-xs font-semibold text-ink line-clamp-1">
                  {user.full_name || "Miembro Coworking"}
                </p>
                <p className="font-mono text-[9px] text-ink-soft uppercase font-bold tracking-wider">
                  Rol: {user.role}
                </p>
              </div>
            </div>

            {/* Member ID block */}
            <div className="bg-paper border border-paper-muted rounded-xl p-2.5 flex items-center justify-between text-left">
              <div className="overflow-hidden">
                <p className="text-[9px] text-ink-soft font-mono uppercase font-bold">Mi ID de Miembro</p>
                <p className="font-mono text-[10px] text-ink truncate max-w-[130px] pr-2 select-all" title={user.id}>
                  {user.id}
                </p>
              </div>
              <button
                onClick={handleCopyId}
                className="text-coral hover:text-coral/80 p-1.5 rounded hover:bg-paper-deep transition-colors shrink-0"
                title="Copiar ID"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-paper-muted hover:bg-paper hover:text-rose text-ink-soft rounded-xl font-body text-xs h-9 px-3 w-full"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Salir
            </Button>
          </div>
        )}
      </aside>

      {/* Main Content View */}
      <main className="flex-1 overflow-y-auto">
        <div className="py-6 px-4 sm:px-6 md:py-8 lg:px-8">
          {activeTab === "role-manage" && <RolesPage />}
          {activeTab === "billing-service" && <InvoicesView />}
          {activeTab === "checking-service" && <ReservationsView />}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
