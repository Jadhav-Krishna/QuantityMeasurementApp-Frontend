import { TOKEN_KEY, USER_KEY } from "../config";
import type { AuthResponse, AuthStatusResponse, User } from "../types";
import { buildApiUrl, buildAuthHeaders, getErrorMessage, parseResponseBody } from "./api";

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
  const response = await fetch(buildApiUrl("/auth/status"), {
    headers: buildAuthHeaders(token),
    credentials: "include"
  });

  if (!response.ok) {
    return { authenticated: false };
  }

  return (await parseResponseBody(response)) as AuthStatusResponse;
}

export async function fetchCurrentUser(token?: string) {
  const activeToken = token ?? getToken();
  const response = await fetch(buildApiUrl("/auth/user"), {
    headers: buildAuthHeaders(activeToken),
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(getErrorMessage(await parseResponseBody(response), "Unable to load current user."));
  }

  return (await parseResponseBody(response)) as User;
}

type AuthPayload = {
  accessToken?: string;
  token?: string;
  jwtToken?: string;
  user?: User;
  data?: {
    accessToken?: string;
    token?: string;
    jwtToken?: string;
    user?: User;
  };
};

export async function loginOrRegister(path: "/auth/login" | "/auth/register", payload: object) {
  const response = await fetch(buildApiUrl(path), {
    method: "POST",
    headers: buildAuthHeaders(undefined, true),
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = (await parseResponseBody(response)) as AuthPayload;

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Authentication failed."));
  }

  const accessToken = data.accessToken ?? data.token ?? data.jwtToken ?? data.data?.accessToken ?? data.data?.token ?? data.data?.jwtToken;
  const user = data.user ?? data.data?.user;

  if (!accessToken || !user) {
    throw new Error("Authentication response is missing token or user details.");
  }

  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: 0,
    user
  } satisfies AuthResponse;
}

export function startGoogleLogin() {
  window.location.href = "/oauth2/authorization/google";
}

export async function logout() {
  const token = getToken();

  try {
    await fetch(buildApiUrl("/auth/logout"), {
      method: "GET",
      headers: buildAuthHeaders(token),
      credentials: "include",
      redirect: "manual"
    });
  } catch {
    // Clear local auth state even if the backend logout request fails.
  } finally {
    clearAuth();
  }
}
