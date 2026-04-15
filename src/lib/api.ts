import { API_BASE_URL } from "../config";

export function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export function buildAuthHeaders(token?: string | null, contentType = false): HeadersInit {
  const headers: Record<string, string> = {};

  if (contentType) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function parseResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}));
  }

  const text = await response.text().catch(() => "");
  return text ? { message: text } : {};
}

export function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const directMessage = [record.message, record.errorMessage, record.error, record.details].find(
      (value) => typeof value === "string" && value.trim()
    );

    if (typeof directMessage === "string") {
      return directMessage;
    }

    if (Array.isArray(record.errors) && record.errors.length > 0) {
      const firstError = record.errors.find((value) => typeof value === "string" && value.trim());
      if (typeof firstError === "string") {
        return firstError;
      }
    }
  }

  return fallback;
}
