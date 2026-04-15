import type { CalculationResponse, HistoryItem, QuantityDTO, UserHistoryResponse } from "../types";
import { getToken } from "./auth";
import { buildApiUrl, buildAuthHeaders, getErrorMessage, parseResponseBody } from "./api";

export const measurementConfig = {
  length: {
    measurementType: "LengthUnit",
    units: [
      { label: "Feet", value: "FEET" },
      { label: "Inches", value: "INCHES" },
      { label: "Yards", value: "YARDS" },
      { label: "Centimeters", value: "CENTIMETERS" }
    ]
  },
  weight: {
    measurementType: "WeightUnit",
    units: [
      { label: "Kilogram", value: "KILOGRAM" },
      { label: "Gram", value: "GRAM" },
      { label: "Pound", value: "POUND" }
    ]
  },
  temperature: {
    measurementType: "TemperatureUnit",
    units: [
      { label: "Celsius", value: "CELSIUS" },
      { label: "Fahrenheit", value: "FAHRENHEIT" },
      { label: "Kelvin", value: "KELVIN" }
    ]
  },
  volume: {
    measurementType: "VolumeUnit",
    units: [
      { label: "Litre", value: "LITRE" },
      { label: "Millilitre", value: "MILLILITRE" },
      { label: "Gallon", value: "GALLON" }
    ]
  }
} as const;

export type MeasurementTypeKey = keyof typeof measurementConfig;
export type ActionKey = "comparison" | "conversion" | "arithmetic";

export const GUEST_FREE_LIMIT = 5;
const GUEST_USES_KEY = "qm_guest_uses";

export function getGuestUsesRemaining(): number {
  const used = parseInt(localStorage.getItem(GUEST_USES_KEY) ?? "0", 10);
  return Math.max(0, GUEST_FREE_LIMIT - used);
}

function saveGuestUsesRemaining(remaining: number): number {
  const normalized = Number.isFinite(remaining) ? Math.max(0, Math.min(GUEST_FREE_LIMIT, remaining)) : GUEST_FREE_LIMIT;
  localStorage.setItem(GUEST_USES_KEY, String(GUEST_FREE_LIMIT - normalized));
  return normalized;
}

function consumeGuestUse(): number {
  const remaining = getGuestUsesRemaining();
  return saveGuestUsesRemaining(Math.max(0, remaining - 1));
}

export function resetGuestUses(): void {
  localStorage.removeItem(GUEST_USES_KEY);
}

export class GuestLimitError extends Error {
  constructor() {
    super("Your 5 free guest credits are exhausted. Please log in and recharge to continue.");
    this.name = "GuestLimitError";
  }
}

export class CreditRequiredError extends Error {
  constructor(message = "No credits remaining. Please recharge to continue.") {
    super(message);
    this.name = "CreditRequiredError";
  }
}

export async function submitCalculation(
  endpoint: string,
  payload: { thisQuantityDTO: QuantityDTO; thatQuantityDTO: QuantityDTO },
  onGuestRemaining?: (remaining: number) => void
): Promise<CalculationResponse> {
  const token = getToken();

  // Guest pre-check using localStorage counter
  if (!token) {
    const remaining = getGuestUsesRemaining();
    if (remaining <= 0) {
      throw new GuestLimitError();
    }
  }

  const response = await fetch(buildApiUrl(endpoint), {
    method: "POST",
    headers: buildAuthHeaders(token, true),
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = await parseResponseBody(response);

  if (response.status === 402) {
    if (token) {
      throw new CreditRequiredError(getErrorMessage(data, "No credits remaining. Please recharge to continue."));
    }
    saveGuestUsesRemaining(0);
    if (onGuestRemaining) onGuestRemaining(0);
    throw new GuestLimitError();
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data, `Request failed with status ${response.status}`));
  }

  const headerRemaining = response.headers.get("X-Guest-Uses-Remaining");
  if (headerRemaining !== null) {
    const remaining = saveGuestUsesRemaining(parseInt(headerRemaining, 10));
    if (onGuestRemaining) {
      onGuestRemaining(remaining);
    }
  } else if (!token) {
    // Fallback for deployments where the proxy path does not preserve the guest-usage header.
    const remaining = consumeGuestUse();
    if (onGuestRemaining) {
      onGuestRemaining(remaining);
    }
  }

  return data as CalculationResponse;
}

function mapUserHistoryItem(item: UserHistoryResponse): HistoryItem {
  return {
    id: item.id,
    thisValue: item.inputValue ?? 0,
    thisUnit: item.inputUnit ?? "",
    thisMeasurementType: item.category,
    thatValue: item.secondaryValue ?? 0,
    thatUnit: item.secondaryUnit ?? "",
    thatMeasurementType: item.category,
    operation: item.operation.toLowerCase(),
    resultString: item.comparisonResult === null || item.comparisonResult === undefined
      ? undefined
      : String(item.comparisonResult),
    resultValue: item.resultValue ?? 0,
    resultUnit: item.resultUnit ?? null,
    resultMeasurementType: item.category,
    errorMessage: item.message?.startsWith("ERROR:") ? item.message : null,
    error: Boolean(item.message?.startsWith("ERROR:")),
    source: "user-history"
  };
}

export async function fetchUserHistory(userId: number): Promise<HistoryItem[]> {
  const token = getToken();
  if (!token) throw new Error("LOGIN_REQUIRED");

  const response = await fetch(buildApiUrl(`/api/users/${userId}/history`), {
    headers: buildAuthHeaders(token),
    credentials: "include"
  });

  if (response.status === 401) throw new Error("LOGIN_REQUIRED");

  const data = await parseResponseBody(response);
  if (!response.ok) throw new Error(getErrorMessage(data, "Unable to load history."));

  const userHistory = Array.isArray(data)
    ? (data as UserHistoryResponse[]).map(mapUserHistoryItem)
    : [];
  return userHistory;
}

export async function deleteUserHistory(userId: number, historyId: number): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error("LOGIN_REQUIRED");
  }

  const response = await fetch(buildApiUrl(`/api/users/${userId}/history/${historyId}`), {
    method: "DELETE",
    headers: buildAuthHeaders(token),
    credentials: "include"
  });

  if (response.status === 401) {
    throw new Error("LOGIN_REQUIRED");
  }

  if (!response.ok) {
    const data = await parseResponseBody(response);
    throw new Error(getErrorMessage(data, "Unable to remove history item."));
  }
}
