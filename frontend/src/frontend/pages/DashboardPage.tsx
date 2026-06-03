import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

import AuthLayout from "../components/AuthLayout";
import { AuthUser, authService } from "../services/auth";

const DashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

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

  const getBackendName = () => {
    const serviceType = import.meta.env.VITE_SERVICE_TYPE || 'role-manage';
    switch (serviceType) {
      case 'billing-service': return 'Billing Service (Node.js)';
      case 'checking-service': return 'Checking Service (Rust/Axum)';
      case 'role-manage':
      default:
        return 'Role Manage (Python/FastAPI)';
    }
  };

  if (loading) {
    return (
      <AuthLayout title="Cargando sesión" subtitle={`Validando el token con ${getBackendName()}`}>
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Sesión activa"
      subtitle={`El frontend ya está autenticando contra ${getBackendName()}`}
    >
      {user && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-5 text-sm">
          <div>
            <p className="text-muted-foreground">Nombre</p>
            <p className="font-medium text-foreground">{user.full_name || "Sin nombre"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Correo</p>
            <p className="font-medium text-foreground">{user.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Rol</p>
            <p className="font-medium capitalize text-foreground">{user.role}</p>
          </div>
        </div>
      )}

      <Button onClick={handleLogout} variant="outline" className="mt-5 w-full">
        <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
      </Button>
    </AuthLayout>
  );
};

export default DashboardPage;
