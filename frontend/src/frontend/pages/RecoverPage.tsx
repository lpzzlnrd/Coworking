import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

import AuthLayout from "../components/AuthLayout";

const RecoverPage = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Recuperación pendiente"
      subtitle="El backend FastAPI actual todavía no expone recuperación de contraseña"
    >
      <div className="space-y-4 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">
        <p>
          El frontend ya quedó integrado con el flujo real disponible hoy:
          registro, login y consulta del perfil autenticado.
        </p>
        <p>
          Si quieres, el siguiente paso puede ser implementar recuperación de
          contraseña en `role-manage` y reconectar esta pantalla.
        </p>
      </div>

      <Button
        onClick={() => navigate("/login")}
        className="mt-5 h-11 w-full font-heading font-medium text-sm"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver al login
      </Button>
    </AuthLayout>
  );
};

export default RecoverPage;
