import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const getServiceDetails = () => {
  const serviceType = (import.meta.env.VITE_SERVICE_TYPE || 'role-manage') as string;
  switch (serviceType) {
    case 'billing-service':
      return {
        name: 'Billing Service',
        description: 'Servicio de Facturación y Pagos',
        gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
        badgeBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        textColor: 'text-amber-500',
        icon: '💵',
      };
    case 'checking-service':
      return {
        name: 'Checking Service',
        description: 'Servicio de Reservas y Check-ins',
        gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
        badgeBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        textColor: 'text-emerald-500',
        icon: '🦀',
      };
    case 'role-manage':
    default:
      return {
        name: 'Role Manage',
        description: 'Servicio de Gestión de Roles y Accesos',
        gradient: 'from-blue-500/20 via-indigo-500/10 to-transparent',
        badgeBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        textColor: 'text-blue-500',
        icon: '🛡️',
      };
  }
};

const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  const service = getServiceDetails();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Dynamic Background Glow */}
      <div className={`absolute top-0 left-0 right-0 h-64 bg-gradient-to-b ${service.gradient} -z-10`} />

      <div className="w-full max-w-sm space-y-6">
        {/* Service Type Indicator Badge */}
        <div className="flex justify-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold tracking-wider uppercase animate-fade-in ${service.badgeBg}`}>
            <span>{service.icon}</span>
            <span>{service.name}</span>
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm mt-2">
              {subtitle}
            </p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-1 italic">
            Connected to: {service.description}
          </p>
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-6 shadow-xl shadow-foreground/5 backdrop-blur-sm">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
