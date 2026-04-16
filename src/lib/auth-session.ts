export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
}

interface AuthSessionPayload {
  token: string;
  user: AuthUser | null;
  rememberMe?: boolean;
}

export function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("auth_user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(payload: AuthSessionPayload): void {
  localStorage.setItem("auth_token", payload.token || "");
  localStorage.setItem("auth_user", JSON.stringify(payload.user || null));

  if (payload.rememberMe) {
    localStorage.setItem("auth_remember_me", "1");
  } else {
    localStorage.removeItem("auth_remember_me");
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("auth_remember_me");
}
