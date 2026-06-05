const API_BASE = "/api/billing";
const ACCESS_TOKEN_KEY = "access_token";

export interface Invoice {
  id: string;
  memberId: string;
  amount: number;
  description: string;
  status: "PENDING" | "PAID" | "OVERDUE";
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoicesPageResponse {
  content: Invoice[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface RevenueReportItem {
  period: "daily" | "monthly" | "yearly";
  label: string;
  totalRevenue: number;
  invoiceCount: number;
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
    const err = await res.json().catch(() => ({}));
    const errMsg = err.message || err.detail || `Error ${res.status}`;
    const error = new Error(errMsg);
    (error as any).details = err.details || null;
    throw error;
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const billingService = {
  async getInvoices(page = 0, size = 20): Promise<InvoicesPageResponse> {
    return request<InvoicesPageResponse>(`/invoices?page=${page}&size=${size}`, {
      method: "GET",
    });
  },

  async createInvoice(data: {
    memberId: string;
    amount: number;
    description: string;
    dueDate: string;
  }): Promise<Invoice> {
    return request<Invoice>("/invoices", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async payInvoice(id: string): Promise<Invoice> {
    return request<Invoice>(`/invoices/${id}/pay`, {
      method: "PATCH",
    });
  },

  async markInvoiceOverdue(id: string): Promise<Invoice> {
    return request<Invoice>(`/invoices/${id}/overdue`, {
      method: "PATCH",
    });
  },

  async sweepOverdue(): Promise<{ updatedCount: number }> {
    return request<{ updatedCount: number }>("/invoices/overdue-sweep", {
      method: "POST",
    });
  },

  async getRevenueReport(
    period: "daily" | "monthly" | "yearly",
    from: string,
    to: string
  ): Promise<RevenueReportItem[]> {
    return request<RevenueReportItem[]>(
      `/reports/revenue?period=${period}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { method: "GET" }
    );
  },

  async getMemberHistory(
    memberId: string,
    page = 0,
    size = 20
  ): Promise<InvoicesPageResponse> {
    return request<InvoicesPageResponse>(
      `/reports/members/${memberId}/billing?page=${page}&size=${size}`,
      { method: "GET" }
    );
  },
};
