import type { CreateOrderResponse, CreditsResponse, PaymentConfigResponse, TransactionResponse } from "../types";
import { getToken } from "./auth";
import { buildApiUrl, buildAuthHeaders, getErrorMessage, parseResponseBody } from "./api";

export async function fetchPaymentConfig(): Promise<PaymentConfigResponse> {
  const response = await fetch(buildApiUrl("/api/payments/config"), {
    credentials: "include"
  });
  const data = await parseResponseBody(response);
  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Unable to load payment configuration."));
  }
  return data as PaymentConfigResponse;
}

export async function fetchCredits(userId: number): Promise<number> {
  const token = getToken();
  const response = await fetch(buildApiUrl(`/api/users/${userId}/credits`), {
    headers: buildAuthHeaders(token),
    credentials: "include"
  });
  if (!response.ok) return 0;
  const data = (await parseResponseBody(response)) as CreditsResponse;
  return data.credits ?? 0;
}

export async function createOrder(userId: number, userEmail: string, userName: string, units: number): Promise<CreateOrderResponse> {
  const token = getToken();
  const response = await fetch(buildApiUrl("/api/payments/orders"), {
    method: "POST",
    headers: buildAuthHeaders(token, true),
    credentials: "include",
    body: JSON.stringify({ userId, userEmail, userName, units })
  });
  const data = await parseResponseBody(response);
  if (!response.ok) throw new Error(getErrorMessage(data, "Failed to create payment order."));
  return data as CreateOrderResponse;
}

export async function verifyPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<TransactionResponse> {
  const token = getToken();
  const response = await fetch(buildApiUrl("/api/payments/verify"), {
    method: "POST",
    headers: buildAuthHeaders(token, true),
    credentials: "include",
    body: JSON.stringify({ razorpayOrderId, razorpayPaymentId, razorpaySignature })
  });
  const data = await parseResponseBody(response);
  if (!response.ok) throw new Error(getErrorMessage(data, "Payment verification failed."));
  return data as TransactionResponse;
}

export async function fetchTransactions(userId: number): Promise<TransactionResponse[]> {
  const token = getToken();
  const response = await fetch(buildApiUrl(`/api/payments/users/${userId}/transactions`), {
    headers: buildAuthHeaders(token),
    credentials: "include"
  });
  if (!response.ok) return [];
  const data = await parseResponseBody(response);
  return Array.isArray(data) ? (data as TransactionResponse[]) : [];
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open(): void;
      on?(event: string, handler: () => void): void;
    };
  }
}

export type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
};

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
