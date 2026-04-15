export const TOKEN_KEY = "qm_access_token";
export const USER_KEY = "qm_user";
export const OAUTH_RETURN_TO_KEY = "qm_oauth_return_to";

const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

function resolveApiBaseUrl() {
  if (!rawApiBaseUrl || typeof window === "undefined") {
    return rawApiBaseUrl;
  }

  if (!/^https?:\/\//i.test(rawApiBaseUrl)) {
    return rawApiBaseUrl;
  }

  try {
    const configuredUrl = new URL(rawApiBaseUrl);

    // Prefer same-origin API calls so the app works unchanged behind the
    // local Vite proxy and the production nginx proxy.
    if (configuredUrl.origin !== window.location.origin) {
      return "";
    }
  } catch {
    return rawApiBaseUrl;
  }

  return rawApiBaseUrl;
}

export const API_BASE_URL = resolveApiBaseUrl();
