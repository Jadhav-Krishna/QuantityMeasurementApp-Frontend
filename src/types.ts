export type User = {
  id: number;
  email: string;
  name: string;
  givenName?: string;
  familyName?: string;
  pictureUrl?: string;
  emailVerified?: boolean;
  role?: string;
  authProvider?: string;
  credits?: number;
  createdAt?: string;
  lastLoginAt?: string;
};

export type CreditsResponse = {
  credits: number;
};

export type CreateOrderResponse = {
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  creditsToAdd: number;
};

export type PaymentConfigResponse = {
  razorpayKeyId: string;
  creditsPerUnit: number;
  pricePerUnitPaise: number;
  availableUnits: number[];
};

export type TransactionResponse = {
  id: number;
  userId: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaise: number;
  creditsAdded: number;
  status: "CREATED" | "SUCCESS" | "FAILED";
  createdAt: string;
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
  id?: number;
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
  source?: "user-history" | "measurement-history";
};

export type UserHistoryResponse = {
  id: number;
  userId: number;
  category: "LENGTH" | "WEIGHT" | "TEMPERATURE" | "VOLUME";
  operation: "CONVERT" | "ADD" | "SUBTRACT" | "DIVIDE" | "COMPARE";
  inputValue: number;
  inputUnit?: string | null;
  secondaryValue?: number | null;
  secondaryUnit?: string | null;
  resultValue?: number | null;
  resultUnit?: string | null;
  comparisonResult?: boolean | null;
  message?: string | null;
  recordedAt: string;
};

export type MeasurementHistoryResponse = {
  thisValue: number;
  thisUnit: string;
  thisMeasurementType: string;
  thatValue: number;
  thatUnit: string;
  thatMeasurementType: string;
  operation: string;
  resultString?: string | null;
  resultValue?: number | null;
  resultUnit?: string | null;
  resultMeasurementType?: string | null;
  errorMessage?: string | null;
  error: boolean;
};
