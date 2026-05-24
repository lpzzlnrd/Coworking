import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthLayout from "../components/AuthLayout";
import OtpInput from "../components/OtpInput";
import { authService } from "../services/auth";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

type Step = "credentials" | "otp";

const LoginPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await authService.login(email, password);
      setStep("otp");
      toast.success("Código enviado");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (code: string) => {
    const sessionId = localStorage.getItem("session_id");
    if (!sessionId) return;
    setLoading(true);
    try {
      await authService.verifyOtp(sessionId, code);
      toast.success("Bienvenido");
      navigate("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={step === "credentials" ? "Iniciar sesión" : "Verificación"}
      subtitle={
        step === "credentials"
          ? "Ingresa tus credenciales"
          : `Código enviado a su Numero de telefono registrado.`
      }
    >
      {step === "credentials" ? (
        <form onSubmit={handleLogin} className="space-y-4">
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
          />
          <Button
            type="submit"
            className="w-full h-11 font-heading font-medium text-sm"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
          </Button>
          <button
            type="button"
            onClick={() => navigate("/recover")}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <OtpInput onComplete={handleOtp} disabled={loading} />
          {loading && (
            <div className="flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          <button
            type="button"
            onClick={() => setStep("credentials")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            <ArrowLeft className="h-3 w-3" /> Volver
          </button>
        </div>
      )}
    </AuthLayout>
  );
};

export default LoginPage;
