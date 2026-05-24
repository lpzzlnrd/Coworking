const API_BASE = '/api';

interface LoginResponse {
  message: string;
  session_id: string;
}

interface OtpResponse {
  access_token: string;
  expires_in: number;
}

interface RecoverOtpResponse {
  recovery_token: string;
}

interface RecoverPhase1Response {
  message: string;
  session_id: string;
}

// Petición estándar: lanza error en cualquier respuesta no-2xx
async function request<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error de conexión' }));
    throw new Error(typeof err.message === 'string' ? err.message : `Error ${res.status}`);
  }
  return res.json();
}

// Login y Recover Fase 1 devuelven HTTP 401 incluso en éxito (diseño del backend):
// - Éxito: 401 + body con `session_id`
// - Error: 401 + body sin `session_id`
async function requestOtpRequired<T extends { session_id: string }>(
  url: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ message: 'Error de conexión' }));
  if (res.status === 401 && data.session_id) {
    return data as T;
  }
  throw new Error(typeof data.message === 'string' ? data.message : `Error ${res.status}`);
}

export const authService = {
  async login(email: string, password: string) {
    const data = await requestOtpRequired<LoginResponse>('/auth/login', { email, password });
    localStorage.setItem('session_id', data.session_id);
    return data;
  },

  async verifyOtp(sessionId: string, otpCode: string) {
    const data = await request<OtpResponse>('/auth/otp', {
      session_id: sessionId,
      otp_code: otpCode,
    });
    localStorage.setItem('access_token', data.access_token);
    return data;
  },

  async recoverRequest(email: string) {
    const data = await requestOtpRequired<RecoverPhase1Response>('/auth/recover', { email });
    localStorage.setItem('recovery_session_id', data.session_id);
    return data;
  },

  async recoverVerifyOtp(sessionId: string, otpCode: string) {
    const data = await request<RecoverOtpResponse>('/auth/otp', {
      session_id: sessionId,
      otp_code: otpCode,
    });
    if (data.recovery_token) localStorage.setItem('recovery_token', data.recovery_token);
    return data;
  },

  async recoverSetPassword(recoveryToken: string, newPassword: string) {
    return request('/auth/recover', {
      recovery_token: recoveryToken,
      new_password: newPassword,
    });
  },

  async refreshToken() {
    const data = await request<OtpResponse>('/auth/refresh', {});
    localStorage.setItem('access_token', data.access_token);
    return data;
  },

  async logout() {
    try {
      await request('/auth/logout', {});
    } catch {
      // Si el backend falla, limpiar estado local de todas formas
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('session_id');
    localStorage.removeItem('recovery_session_id');
    localStorage.removeItem('recovery_token');
  },
};
