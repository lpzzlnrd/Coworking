const API_BASE = "/api";
const ACCESS_TOKEN_KEY = "access_token";

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiError {
  detail?: string;
  message?: string;
}

async function request<T>(
  url: string,
  options: RequestInit = {},
  authenticated = false,
): Promise<T> {
  const token = authenticated ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as ApiError;
    throw new Error(err.detail || err.message || `Error ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const authService = {
  async login(email: string, password: string) {
    const data = await request<AuthTokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    return data;
  },

  async register(email: string, password: string, fullName?: string) {
    return request<AuthUser>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        full_name: fullName?.trim() ? fullName.trim() : null,
      }),
    });
  },

  async me() {
    return request<AuthUser>("/auth/me", { method: "GET" }, true);
  },

  async listUsers() {
    return request<AuthUser[]>("/users", { method: "GET" }, true);
  },

  async updateUserRole(userId: string, role: string) {
    return request<AuthUser>(`/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    }, true);
  },

  logout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  },

  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
};
