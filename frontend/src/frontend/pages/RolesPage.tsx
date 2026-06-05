import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-8 animate-fade-in p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="rounded-3xl border border-paper-muted bg-paper-deep p-6 md:p-8 shadow-sm">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft bg-paper px-3 py-1 rounded-full w-fit">🛡️ Roles & Accesos</p>
        <h1 className="mt-4 text-4xl font-heading font-semibold tracking-tight text-ink">Crear rol y asignar permisos</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Define un rol personalizado para tu equipo y selecciona los permisos que tendrá dentro de la plataforma.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6 rounded-3xl border border-paper-muted bg-paper-deep p-6 md:p-8 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-xl font-heading font-semibold text-ink">Nuevo rol</h2>
            <p className="text-xs text-ink-soft">
              Ingresa el nombre del rol y marca los permisos que serán válidos para este grupo.
            </p>
          </div>

          <form onSubmit={handleCreateRole} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="role-name" className="block text-xs font-semibold text-ink-soft uppercase tracking-wider font-mono">
                Nombre del rol
              </label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Supervisor"
                className="bg-paper-deep border-paper-muted rounded-xl text-xs h-10"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="role-description" className="block text-xs font-semibold text-ink-soft uppercase tracking-wider font-mono">
                Descripción opcional
              </label>
              <Input
                id="role-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Supervisa usuarios y revisa reportes"
                className="bg-paper-deep border-paper-muted rounded-xl text-xs h-10"
              />
            </div>

            <div className="space-y-3 rounded-2xl border border-paper-muted bg-paper/30 p-5">
              <div>
                <h3 className="text-sm font-semibold text-ink">Permisos</h3>
                <p className="text-xs text-ink-soft">Selecciona los permisos que tendrá este rol.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {permissionOptions.map((permission) => (
                  <label
                    key={permission.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-paper-muted bg-paper-deep p-4 text-xs transition-colors hover:border-coral"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.id)}
                      onChange={() => togglePermission(permission.id)}
                      className="mt-0.5 h-4 w-4 rounded border-paper-muted text-coral focus:ring-coral"
                    />
                    <span className="space-y-1">
                      <span className="font-semibold text-ink">{permission.label}</span>
                      <span className="block text-[11px] text-ink-soft">Acceso relacionado a {permission.label.toLowerCase()}.</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
              <p className="text-xs text-ink-soft font-body max-w-xs leading-relaxed">
                El rol se almacenará localmente en el navegador para uso de prototipo.
              </p>
              <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto bg-coral hover:bg-coral/95 text-white font-body text-xs rounded-xl px-6 h-10 shadow-sm transition-all hover:scale-[1.02]">
                Crear rol
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-4 rounded-3xl border border-paper-muted bg-paper-deep p-6 md:p-8 shadow-sm h-fit">
          <div className="space-y-2">
            <h2 className="text-xl font-heading font-semibold text-ink">Roles creados</h2>
            <p className="text-xs text-ink-soft">Consulta los roles que ya has generado.</p>
          </div>

          {savedRoles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-paper-muted bg-paper/20 px-6 py-10 text-center text-xs text-ink-soft">
              No hay roles definidos todavía.
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {savedRoles.map((role) => (
                <div key={role.id} className="rounded-2xl border border-paper-muted bg-paper/10 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">{role.name}</h3>
                      {role.description && (
                        <p className="text-[11px] text-ink-soft leading-relaxed mt-0.5">{role.description}</p>
                      )}
                    </div>
                    <Badge className="bg-coral/10 text-coral border border-coral/20 font-mono text-[9px] uppercase font-bold px-2 py-0.5 shrink-0">
                      {role.permissions.length} PERMISOS
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="rounded-full border border-paper-muted bg-paper-deep px-2.5 py-0.5 text-[10px] text-ink-soft font-medium"
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
  );
};

export default RolesPage;
