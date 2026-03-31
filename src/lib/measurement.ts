import type { CalculationResponse, HistoryItem, QuantityDTO } from "../types";
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

export async function submitCalculation(endpoint: string, payload: { thisQuantityDTO: QuantityDTO; thatQuantityDTO: QuantityDTO }) {
  const token = getToken();
  const response = await fetch(buildApiUrl(endpoint), {
    method: "POST",
    headers: buildAuthHeaders(token, true),
    credentials: "include",
    body: JSON.stringify(payload)
  });

  const data = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data, `Request failed with status ${response.status}`));
  }

  return data as CalculationResponse;
}

export async function fetchHistory(endpoint: string) {
  const token = getToken();
  const response = await fetch(buildApiUrl(endpoint), {
    headers: buildAuthHeaders(token),
    credentials: "include"
  });

  const data = await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Unable to load history."));
  }

  return Array.isArray(data) ? (data as HistoryItem[]) : [];
}
