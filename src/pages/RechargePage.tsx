import { ArrowLeft, CheckCircle, Clock, Coins, XCircle, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { fetchAuthStatus } from "../lib/auth";
import { createOrder, fetchCredits, fetchPaymentConfig, fetchTransactions, loadRazorpayScript, verifyPayment } from "../lib/payment";
import type { PaymentConfigResponse, TransactionResponse, User } from "../types";

const PLAN_LABELS = ["Starter", "Basic", "Standard", "Pro", "Max"] as const;

export function RechargePage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState(0);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfigResponse | null>(null);
  const [selectedUnits, setSelectedUnits] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [success, setSuccess] = useState(false);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const [status, config] = await Promise.all([fetchAuthStatus(), fetchPaymentConfig()]);
        setPaymentConfig(config);
        setAuthenticated(status.authenticated);
        setUser(status.user ?? null);
        setSelectedUnits(config.availableUnits[0] ?? 1);
        if (status.authenticated && status.user) {
          const [nextCredits, nextTransactions] = await Promise.all([
            fetchCredits(status.user.id),
            fetchTransactions(status.user.id)
          ]);
          setCredits(nextCredits);
          setTransactions(nextTransactions);
        }
      } catch (error) {
        setStatusText(error instanceof Error ? error.message : "Unable to load recharge configuration.");
      } finally {
        setReady(true);
      }
    };

    void run();
  }, []);

  const refreshData = async () => {
    if (!user) return;
    setTxLoading(true);
    const [nextCredits, nextTransactions] = await Promise.all([fetchCredits(user.id), fetchTransactions(user.id)]);
    setCredits(nextCredits);
    setTransactions(nextTransactions);
    setTxLoading(false);
  };

  const handleRecharge = async () => {
    if (!user || !paymentConfig) return;
    setProcessing(true);
    setStatusText("Loading payment gateway...");
    setSuccess(false);

    try {
      if (!paymentConfig.razorpayKeyId) {
        throw new Error("Razorpay is not configured on the server.");
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error("Failed to load Razorpay checkout.");
      }

      const order = await createOrder(user.id, user.email, user.name, selectedUnits);
      setStatusText("Opening payment window...");

      const razorpay = new window.Razorpay({
        key: paymentConfig.razorpayKeyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: "Quantity Measurement App",
        description: `${order.creditsToAdd} credits`,
        order_id: order.razorpayOrderId,
        prefill: { name: user.name, email: user.email },
        theme: { color: "#4f6ef7" },
        handler: async (response) => {
          setStatusText("Verifying payment...");
          try {
            const transaction = await verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            setSuccess(true);
            setStatusText(`Payment successful. ${transaction.creditsAdded} credits added to your account.`);
            await refreshData();
          } catch (error) {
            setSuccess(false);
            setStatusText(error instanceof Error ? error.message : "Payment verification failed.");
          } finally {
            setProcessing(false);
          }
        }
      });

      if (typeof (razorpay as { on?: (event: string, callback: () => void) => void }).on === "function") {
        razorpay.on?.("payment.failed", () => {
          setSuccess(false);
          setStatusText("Payment was not completed. Please try again.");
          setProcessing(false);
        });
      }

      razorpay.open();
      setProcessing(false);
      setStatusText("");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Unable to add credits.");
      setProcessing(false);
    }
  };

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-sm font-medium text-slate-500">Loading...</div>;
  }

  if (!authenticated) {
    return <Navigate to="/auth?returnTo=/recharge" replace />;
  }

  const plans = (paymentConfig?.availableUnits ?? [1]).map((units, index) => ({
    units,
    credits: units * (paymentConfig?.creditsPerUnit ?? 5),
    label: PLAN_LABELS[index] ?? `Plan ${index + 1}`,
    priceRupees: ((units * (paymentConfig?.pricePerUnitPaise ?? 100)) / 100).toFixed(2)
  }));

  const selectedPlan = plans.find((plan) => plan.units === selectedUnits) ?? plans[0];

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => void navigate("/measurement")}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-xl font-bold text-slate-900">Recharge Credits</h1>
        </div>

        <div className="flex items-center gap-4 rounded-[24px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Current Balance</p>
            <p className="text-3xl font-bold text-slate-900">
              {credits} <span className="text-base font-medium text-slate-500">credits</span>
            </p>
          </div>
          {credits <= 0 ? (
            <span className="ml-auto rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Exhausted</span>
          ) : null}
        </div>

        <div className="rounded-[24px] border border-cyan-200 bg-cyan-50 px-5 py-4 text-sm text-cyan-900">
          Your payment goes through Razorpay, and credits are added only after the backend verifies the payment signature.
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-slate-500">CHOOSE A PLAN</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((plan) => {
              const active = selectedUnits === plan.units;
              return (
                <button
                  key={plan.units}
                  type="button"
                  onClick={() => setSelectedUnits(plan.units)}
                  className={`rounded-[22px] border p-5 text-left transition ${
                    active
                      ? "border-brand-400 bg-brand-50 shadow-lg shadow-brand-500/10"
                      : "border-slate-200 bg-white hover:border-brand-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${active ? "text-brand-700" : "text-slate-700"}`}>{plan.label}</span>
                    {active ? <Zap className="h-4 w-4 text-brand-500" /> : null}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">Rs {plan.priceRupees}</div>
                  <div className="mt-1 text-sm text-slate-500">{plan.credits} credits</div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleRecharge()}
          disabled={processing || !paymentConfig}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Zap className="h-5 w-5" />
          {processing
            ? "Processing payment..."
            : paymentConfig
              ? `Pay Rs ${selectedPlan?.priceRupees ?? ""} and get ${selectedPlan?.credits ?? ""} Credits`
              : "Recharge unavailable"}
        </button>

        {statusText ? (
          <div
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${
              success ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-600"
            }`}
          >
            {success ? <CheckCircle className="h-4 w-4 shrink-0" /> : null}
            <span>{statusText}</span>
          </div>
        ) : null}

        <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Transaction History</h2>
          {txLoading ? (
            <p className="mt-4 text-sm text-slate-500">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No transactions yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                    transaction.status === "SUCCESS"
                      ? "border-emerald-200 bg-emerald-50/60"
                      : transaction.status === "FAILED"
                        ? "border-rose-200 bg-rose-50/60"
                        : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {transaction.status === "SUCCESS" ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    ) : transaction.status === "FAILED" ? (
                      <XCircle className="h-4 w-4 text-rose-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-slate-400" />
                    )}
                    <div>
                      <p className="font-medium text-slate-800">+{transaction.creditsAdded} credits</p>
                      <p className="text-xs text-slate-500">{new Date(transaction.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">Rs {(transaction.amountPaise / 100).toFixed(2)}</p>
                    <p
                      className={`text-xs font-medium ${
                        transaction.status === "SUCCESS"
                          ? "text-emerald-600"
                          : transaction.status === "FAILED"
                            ? "text-rose-600"
                            : "text-slate-400"
                      }`}
                    >
                      {transaction.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
