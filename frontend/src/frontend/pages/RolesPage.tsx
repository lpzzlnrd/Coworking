import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { rolesService, type RoleData } from "../services/roles";
import { authService, type AuthUser } from "../services/auth";
import { Shield, Users, RefreshCw } from "lucide-react";

const permissionOptions = [
  { id: "read_users", label: "Ver usuarios" },
  { id: "manage_users", label: "Crear/editar usuarios" },
  { id: "assign_roles", label: "Asignar roles" },
  { id: "view_reports", label: "Ver reportes" },
  { id: "admin_settings", label: "Configurar plataforma" },
];

const RolesPage = () => {
  // Roles custom state (prototype)
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [savedRoles, setSavedRoles] = useState<RoleData[]>([]);

  // Registered DB Users state
  const [dbUsers, setDbUsers] = useState<AuthUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsersData = async () => {
    try {
      const me = await authService.me();
      if (me.role === "admin") {
        setIsAdmin(true);
        setLoadingUsers(true);
        const list = await authService.listUsers();
        setDbUsers(list);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error("Error cargando usuarios/roles:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    setSavedRoles(rolesService.loadRoles());
    void fetchUsersData();
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

  const handleChangeUserRole = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId);
    try {
      await authService.updateUserRole(userId, newRole);
      toast.success("Rol de usuario actualizado correctamente.");
      // Refresh user list
      const list = await authService.listUsers();
      setDbUsers(list);
    } catch (err) {
      toast.error("Error al actualizar el rol del usuario.");
      console.error(err);
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="rounded-3xl border border-paper-muted bg-paper-deep p-6 md:p-8 shadow-sm">
        <span className="font-mono text-xs uppercase tracking-widest text-ink-soft bg-paper px-3 py-1 rounded-full w-fit">
          🛡️ Gestión de Roles e Identidades
        </span>
        <h1 className="mt-4 text-4xl font-heading font-semibold tracking-tight text-ink">Roles y Usuarios</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft font-body">
          Administra la seguridad y accesos del coworking. Como administrador, puedes gestionar roles de usuarios registrados y definir perfiles de acceso.
        </p>
      </div>

      {/* Main Grid: Role Creator & Predefined Roles */}
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6 rounded-3xl border border-paper-muted bg-paper-deep p-6 md:p-8 shadow-sm">
          <div className="space-y-2 flex items-center justify-between border-b border-paper-muted/60 pb-4">
            <div>
              <h2 className="text-xl font-heading font-semibold text-ink flex items-center gap-2">
                <Shield className="w-5 h-5 text-coral" /> Nuevo Rol Personalizado
              </h2>
              <p className="text-xs text-ink-soft mt-1 font-body">
                Ingresa el nombre del rol y marca los permisos válidos para este grupo de usuarios.
              </p>
            </div>
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
                placeholder="Ej. Supervisor de Piso"
                className="bg-paper-deep border-paper-muted rounded-xl text-xs h-10 font-body"
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
                placeholder="Ej. Supervisa usuarios y revisa reportes del coworking"
                className="bg-paper-deep border-paper-muted rounded-xl text-xs h-10 font-body"
              />
            </div>

            <div className="space-y-3 rounded-2xl border border-paper-muted bg-paper/30 p-5">
              <div>
                <h3 className="text-sm font-semibold text-ink font-body">Permisos Asociados</h3>
                <p className="text-xs text-ink-soft font-body">Selecciona los permisos que tendrá este rol.</p>
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
                      className="mt-0.5 h-4 w-4 rounded border-paper-muted text-coral focus:ring-coral cursor-pointer"
                    />
                    <span className="space-y-1">
                      <span className="font-semibold text-ink font-body">{permission.label}</span>
                      <span className="block text-[11px] text-ink-soft font-body">Acceso relacionado a {permission.label.toLowerCase()}.</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
              <p className="text-xs text-ink-soft font-body max-w-xs leading-relaxed">
                El rol se almacenará localmente en el navegador para simular configuraciones.
              </p>
              <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto bg-coral hover:bg-coral/95 text-white font-body text-xs rounded-xl px-6 h-10 shadow-sm transition-all hover:scale-[1.02]">
                Crear Rol
              </Button>
            </div>
          </form>
        </section>

        {/* Saved Roles list */}
        <aside className="space-y-4 rounded-3xl border border-paper-muted bg-paper-deep p-6 md:p-8 shadow-sm h-fit">
          <div className="space-y-2 border-b border-paper-muted/60 pb-4">
            <h2 className="text-xl font-heading font-semibold text-ink">Roles Definidos</h2>
            <p className="text-xs text-ink-soft font-body">Consulta los roles que has generado en la sesión.</p>
          </div>

          {savedRoles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-paper-muted bg-paper/20 px-6 py-10 text-center text-xs text-ink-soft font-body">
              No hay roles de prototipo definidos todavía.
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {savedRoles.map((role) => (
                <div key={role.id} className="rounded-2xl border border-paper-muted bg-paper/10 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-mono">{role.name}</h3>
                      {role.description && (
                        <p className="text-[11px] text-ink-soft leading-relaxed mt-0.5 font-body">{role.description}</p>
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
                        className="rounded-full border border-paper-muted bg-paper-deep px-2.5 py-0.5 text-[10px] text-ink-soft font-medium font-body"
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

      {/* Users list section (visible to admins only) */}
      {isAdmin && (
        <div className="rounded-3xl border border-paper-muted bg-paper-deep p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-paper-muted/60 pb-4">
            <div>
              <h2 className="text-2xl font-heading font-semibold text-ink flex items-center gap-2">
                <Users className="w-6 h-6 text-coral" /> Usuarios Registrados en el Sistema
              </h2>
              <p className="text-xs text-ink-soft mt-1 font-body">
                Listado en tiempo real de todos los usuarios registrados en el backend de Coworking. Puedes modificar sus permisos cambiando su rol.
              </p>
            </div>
            <Button
              onClick={fetchUsersData}
              variant="outline"
              size="sm"
              className="border-paper-muted hover:bg-paper font-body text-xs rounded-xl"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Actualizar
            </Button>
          </div>

          {loadingUsers ? (
            <div className="flex justify-center items-center py-16">
              <span className="text-sm font-body text-ink-soft animate-pulse">Cargando usuarios...</span>
            </div>
          ) : dbUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-paper-muted py-16 text-center text-sm text-ink-soft font-body">
              No se encontraron usuarios registrados en la base de datos.
            </div>
          ) : (
            <div className="border border-paper-muted rounded-2xl overflow-hidden bg-paper/10 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-paper/40 border-b border-paper-muted">
                    <th className="font-body text-xs font-semibold text-ink-soft py-3 px-4">Nombre</th>
                    <th className="font-body text-xs font-semibold text-ink-soft py-3 px-4">Correo Electrónico</th>
                    <th className="font-body text-xs font-semibold text-ink-soft py-3 px-4">ID de Miembro</th>
                    <th className="font-body text-xs font-semibold text-ink-soft py-3 px-4">Rol Actual</th>
                    <th className="font-body text-xs font-semibold text-ink-soft py-3 px-4">Gestión de Acceso</th>
                  </tr>
                </thead>
                <tbody>
                  {dbUsers.map((usr) => (
                    <tr key={usr.id} className="border-b border-paper-muted/60 hover:bg-paper/5 transition-colors">
                      <td className="font-body text-xs text-ink py-4 px-4 font-semibold">
                        {usr.full_name || "Sin Nombre"}
                      </td>
                      <td className="font-mono text-xs text-ink-soft py-4 px-4">
                        {usr.email}
                      </td>
                      <td className="font-mono text-[11px] text-ink-faint py-4 px-4 select-all">
                        {usr.id}
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={`font-mono text-[9px] uppercase font-bold px-2.5 py-0.5 border ${
                          usr.role === "admin"
                            ? "bg-rose/10 text-rose border-rose/20"
                            : usr.role === "staff"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : usr.role === "member"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-ink-soft/10 text-ink-soft border-ink-soft/20"
                        }`}>
                          {usr.role}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={usr.role}
                            disabled={updatingUserId === usr.id}
                            onChange={(e) => void handleChangeUserRole(usr.id, e.target.value)}
                            className="bg-paper-deep border border-paper-muted text-xs font-body rounded-xl py-1.5 px-3 focus:outline-none focus:border-coral cursor-pointer disabled:opacity-50 font-medium"
                          >
                            <option value="admin">Administrador</option>
                            <option value="staff">Personal (Staff)</option>
                            <option value="member">Miembro</option>
                            <option value="guest">Invitado</option>
                          </select>
                          {updatingUserId === usr.id && (
                            <span className="text-[10px] font-body text-coral animate-pulse">Guardando...</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RolesPage;
