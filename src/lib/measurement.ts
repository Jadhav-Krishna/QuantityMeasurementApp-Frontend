import type { CalculationResponse, HistoryItem, QuantityDTO } from "../types";
import { API_BASE_URL } from "../config";
import { getToken } from "./auth";

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

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

export async function submitCalculation(endpoint: string, payload: { thisQuantityDTO: QuantityDTO; thatQuantityDTO: QuantityDTO }) {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(endpoint), {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.errorMessage || `Request failed with status ${response.status}`);
  }

  return data as CalculationResponse;
}

export async function fetchHistory(endpoint: string) {
  const token = getToken();
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(buildUrl(endpoint), {
    headers,
    credentials: "include"
  });

  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error((data && (data.message || data.errorMessage)) || "Unable to load history.");
  }

  return data as HistoryItem[];
}
