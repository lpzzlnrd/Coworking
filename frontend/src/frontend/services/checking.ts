const API_BASE = "/api/checking";
const ACCESS_TOKEN_KEY = "access_token";

export interface Reservation {
  id: string;
  user_id: string;
  space_id: string;
  start: string;
  end: string;
  status: "pending" | "confirmed" | "cancelled" | "no_show" | "completed";
  notes: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
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
    const text = await res.text().catch(() => "");
    throw new Error(text || `Error ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const checkingService = {
  async getReservations(): Promise<Reservation[]> {
    return request<Reservation[]>("/reservations", {
      method: "GET",
    });
  },

  async getReservation(id: string): Promise<Reservation> {
    return request<Reservation>(`/reservations/${id}`, {
      method: "GET",
    });
  },

  async createReservation(data: {
    space_id: string;
    start: string;
    end: string;
    notes?: string;
  }): Promise<Reservation> {
    return request<Reservation>("/reservations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async confirmReservation(id: string): Promise<Reservation> {
    return request<Reservation>(`/reservations/${id}/confirm`, {
      method: "PATCH",
    });
  },

  async cancelReservation(id: string, reason?: string): Promise<Reservation> {
    return request<Reservation>(`/reservations/${id}`, {
      method: "DELETE",
      body: reason ? JSON.stringify({ reason }) : undefined,
    });
  },
};
