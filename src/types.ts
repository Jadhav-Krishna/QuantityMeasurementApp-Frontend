export type User = {
  id: number;
  email: string;
  name: string;
  givenName?: string;
  familyName?: string;
  pictureUrl?: string;
  role?: string;
  authProvider?: string;
  createdAt?: string;
  lastLoginAt?: string;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
};

export type AuthStatusResponse = {
  authenticated: boolean;
  user?: User;
};

export type QuantityDTO = {
  value: number;
  unit: string;
  measurementType: string;
};

export type CalculationResponse = {
  operation?: string;
  resultString?: string;
  resultValue?: number | string | null;
  resultUnit?: string | null;
  error?: boolean;
  errorMessage?: string;
  message?: string;
};

export type HistoryItem = {
  thisValue: number;
  thisUnit: string;
  thisMeasurementType: string;
  thatValue: number;
  thatUnit: string;
  thatMeasurementType: string;
  operation: string;
  resultString?: string;
  resultValue: number;
  resultUnit?: string | null;
  resultMeasurementType?: string | null;
  errorMessage?: string | null;
  error: boolean;
};
