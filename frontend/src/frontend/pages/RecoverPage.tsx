import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AuthLayout from "../components/AuthLayout";
import OtpInput from "../components/OtpInput";
import { authService } from "../services/auth";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Check } from "lucide-react";

type Step = "email" | "otp" | "new-password" | "done";

const RecoverPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await authService.recoverRequest(email);
      setStep("otp");
      toast.success("Código enviado");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (code: string) => {
    const sessionId = localStorage.getItem("recovery_session_id");
    if (!sessionId) return;
    setLoading(true);
    try {
      await authService.recoverVerifyOtp(sessionId, code);
      setStep("new-password");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Mínimo 8 caracteres");
      return;
    }
    const recoveryToken = localStorage.getItem("recovery_token");
    if (!recoveryToken) return;
    setLoading(true);
    try {
      await authService.recoverSetPassword(recoveryToken, newPassword);
      setStep("done");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const meta: Record<Step, { title: string; subtitle: string }> = {
    email: { title: "Recuperar contraseña", subtitle: "Te enviaremos un código" },
    otp: { title: "Verificación", subtitle: `Código enviado a ${email}` },
    "new-password": { title: "Nueva contraseña", subtitle: "Mínimo 8 caracteres" },
    done: { title: "Contraseña actualizada", subtitle: "Ya puedes iniciar sesión" },
  };

  return (
    <AuthLayout title={meta[step].title} subtitle={meta[step].subtitle}>
      {step === "email" && (
        <form onSubmit={handleRequestRecover} className="space-y-4">
          <Input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-input border-border h-11 placeholder:text-muted-foreground"
            required
          />
          <Button type="submit" className="w-full h-11 font-heading font-medium text-sm" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar código"}
          </Button>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            <ArrowLeft className="h-3 w-3" /> Volver al login
          </button>
        </form>
      )}

      {step === "otp" && (
        <div className="space-y-6">
          <OtpInput onComplete={handleOtp} disabled={loading} />
          {loading && (
            <div className="flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          <button
            type="button"
            onClick={() => setStep("email")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            <ArrowLeft className="h-3 w-3" /> Cambiar correo
          </button>
        </div>
      )}

      {step === "new-password" && (
        <form onSubmit={handleSetPassword} className="space-y-4">
          <Input
            type="password"
            placeholder="Nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="bg-input border-border h-11 placeholder:text-muted-foreground"
            required
            minLength={8}
          />
          <Input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="bg-input border-border h-11 placeholder:text-muted-foreground"
            required
            minLength={8}
          />
          <Button type="submit" className="w-full h-11 font-heading font-medium text-sm" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar"}
          </Button>
        </form>
      )}

      {step === "done" && (
        <div className="space-y-5">
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center">
              <Check className="h-5 w-5 text-accent" />
            </div>
          </div>
          <Button
            onClick={() => navigate("/login")}
            className="w-full h-11 font-heading font-medium text-sm"
          >
            Ir al login
          </Button>
        </div>
      )}
    </AuthLayout>
  );
};

export default RecoverPage;
