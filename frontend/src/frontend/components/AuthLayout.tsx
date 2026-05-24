import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <h1 className="font-heading text-2xl font-medium text-foreground tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm mt-1.5">
              {subtitle}
            </p>
          )}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

export default AuthLayout;
