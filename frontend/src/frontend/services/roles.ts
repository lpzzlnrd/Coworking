export interface RoleData {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
}

const STORAGE_KEY = "coworking_roles_v1";

function loadStoredRoles(): RoleData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RoleData[]) : [];
  } catch {
    return [];
  }
}

function persistRoles(roles: RoleData[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
}

export const rolesService = {
  loadRoles(): RoleData[] {
    return loadStoredRoles();
  },

  createRole(name: string, description: string, permissions: string[]) {
    const role: RoleData = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      permissions,
      createdAt: new Date().toISOString(),
    };
    const roles = [role, ...loadStoredRoles()];
    persistRoles(roles);
    return role;
  },
};
