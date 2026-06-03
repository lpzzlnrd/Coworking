import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import AuthLayout from "../components/AuthLayout";
import { authService } from "../services/auth";

const LoginPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);

    try {
      if (mode === "register") {
        await authService.register(email, password, fullName);
        toast.success("Cuenta creada. Ahora puedes iniciar sesión");
        setMode("login");
        setPassword("");
      } else {
        await authService.login(email, password);
        toast.success("Bienvenido");
        navigate("/", { replace: true });
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : mode === "login"
            ? "Error al iniciar sesión"
            : "Error al crear la cuenta",
      );
    } finally {
      setLoading(false);
    }
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

  return (
    <AuthLayout
      title={mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
      subtitle={
        mode === "login"
          ? `Usa el flujo JWT real del servicio ${getBackendName()}`
          : `Este formulario crea usuarios en ${getBackendName()}`
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <Input
            type="text"
            placeholder="Nombre completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="bg-input border-border h-11 placeholder:text-muted-foreground"
          />
        )}

        <Input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-input border-border h-11 placeholder:text-muted-foreground"
          required
        />
        <Input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-input border-border h-11 placeholder:text-muted-foreground"
          required
          minLength={8}
        />

        <Button
          type="submit"
          className="w-full h-11 font-heading font-medium text-sm"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "login" ? (
            "Entrar"
          ) : (
            "Registrarme"
          )}
        </Button>

        <button
          type="button"
          onClick={() => setMode((current) => (current === "login" ? "register" : "login"))}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
        >
          {mode === "login" ? "¿No tienes cuenta? Crear una" : "Ya tengo cuenta"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/recover")}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Recuperación de contraseña
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
