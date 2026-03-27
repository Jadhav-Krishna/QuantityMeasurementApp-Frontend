import { API_BASE_URL, TOKEN_KEY, USER_KEY } from "../config";
import type { AuthResponse, AuthStatusResponse, User } from "../types";

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveAuth(data: AuthResponse | { accessToken: string; user: User }) {
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user ?? {}));
}

export function saveUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function fetchAuthStatus(): Promise<AuthStatusResponse> {
  const token = getToken();
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(buildUrl("/auth/status"), {
    headers,
    credentials: "include"
  });

  if (!response.ok) {
    return { authenticated: false };
  }

  return response.json();
}

export async function fetchCurrentUser(token?: string) {
  const activeToken = token ?? getToken();
  const headers: HeadersInit = activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
  const response = await fetch(buildUrl("/auth/user"), {
    headers,
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Unable to load current user.");
  }

  return (await response.json()) as User;
}

export async function loginOrRegister(path: "/auth/login" | "/auth/register", payload: object) {
  const response = await fetch(buildUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "Authentication failed.");
  }

  return data as AuthResponse;
}

export function startGoogleLogin() {
  window.location.href = buildUrl("/oauth2/authorization/google");
}

export async function logout() {
  clearAuth();
  window.location.href = buildUrl("/auth/logout");
}
