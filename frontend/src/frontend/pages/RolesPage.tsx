import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { rolesService, type RoleData } from "../services/roles";

const permissionOptions = [
  { id: "read_users", label: "Ver usuarios" },
  { id: "manage_users", label: "Crear/editar usuarios" },
  { id: "assign_roles", label: "Asignar roles" },
  { id: "view_reports", label: "Ver reportes" },
  { id: "admin_settings", label: "Configurar plataforma" },
];

const RolesPage = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [savedRoles, setSavedRoles] = useState<RoleData[]>([]);

  useEffect(() => {
    setSavedRoles(rolesService.loadRoles());
  }, []);

  const canSubmit = useMemo(
    () => name.trim().length > 0 && selectedPermissions.length > 0,
    [name, selectedPermissions],
  );

  const togglePermission = (permission: string) => {
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  };

  const handleCreateRole = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      toast.error("Complete el nombre del rol y seleccione al menos un permiso.");
      return;
    }

    const newRole = rolesService.createRole(name, description, selectedPermissions);
    setSavedRoles((current) => [newRole, ...current]);
    setName("");
    setDescription("");
    setSelectedPermissions([]);
    toast.success(`Rol "${newRole.name}" creado correctamente.`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-3xl border border-border bg-card p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Roles</p>
          <h1 className="mt-4 text-4xl font-heading font-semibold tracking-tight">Crear rol y asignar permisos</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Define un rol personalizado para tu equipo y selecciona los permisos que tendrá dentro de la plataforma.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6 rounded-3xl border border-border bg-card p-8 shadow-sm">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold">Nuevo rol</h2>
              <p className="text-sm text-muted-foreground">
                Ingresa el nombre del rol y marca los permisos que serán válidos para este grupo.
              </p>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="role-name" className="block text-sm font-medium text-foreground">
                  Nombre del rol
                </label>
                <Input
                  id="role-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Supervisor"
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="role-description" className="block text-sm font-medium text-foreground">
                  Descripción opcional
                </label>
                <Input
                  id="role-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Supervisa usuarios y revisa reportes"
                  className="bg-input border-border"
                />
              </div>

              <div className="space-y-3 rounded-3xl border border-border bg-background p-5">
                <div>
                  <h3 className="text-lg font-medium">Permisos</h3>
                  <p className="text-sm text-muted-foreground">Selecciona los permisos que tendrá este rol.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {permissionOptions.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-input bg-card p-4 text-sm transition-colors hover:border-primary"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission.id)}
                        onChange={() => togglePermission(permission.id)}
                        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="space-y-1">
                        <span className="font-medium text-foreground">{permission.label}</span>
                        <span className="text-sm text-muted-foreground">Acceso relacionado a {permission.label.toLowerCase()}.</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  El rol se almacenará localmente en el navegador para uso de prototipo.
                </p>
                <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
                  Crear rol
                </Button>
              </div>
            </form>
          </section>

          <aside className="space-y-4 rounded-3xl border border-border bg-card p-8 shadow-sm">
            <div>
              <h2 className="text-2xl font-semibold">Roles creados</h2>
              <p className="text-sm text-muted-foreground">Consulta los roles que ya has generado.</p>
            </div>

            {savedRoles.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-background px-6 py-10 text-center text-sm text-muted-foreground">
                No hay roles definidos todavía.
              </div>
            ) : (
              <div className="space-y-4">
                {savedRoles.map((role) => (
                  <div key={role.id} className="rounded-3xl border border-border bg-background p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">{role.name}</h3>
                        {role.description && (
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                        )}
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {role.permissions.length} permisos
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {role.permissions.map((permission) => (
                        <span
                          key={permission}
                          className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground"
                        >
                          {permissionOptions.find((item) => item.id === permission)?.label ?? permission}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default RolesPage;
