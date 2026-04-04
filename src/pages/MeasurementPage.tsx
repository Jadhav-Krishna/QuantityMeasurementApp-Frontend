import { AlertTriangle, ArrowRight, FlaskConical, History, LogOut, RefreshCcw, Ruler, Scale, Thermometer, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BalanceLogo } from "../components/BalanceLogo";
import { CreditsBar } from "../components/CreditsBar";
import { fetchAuthStatus, logout, saveUser } from "../lib/auth";
import { fetchCredits } from "../lib/payment";
import {
  CreditRequiredError,
  deleteUserHistory,
  GuestLimitError,
  fetchUserHistory,
  getGuestUsesRemaining,
  measurementConfig,
  submitCalculation,
  type ActionKey,
  type MeasurementTypeKey
} from "../lib/measurement";
import type { CalculationResponse, HistoryItem, QuantityDTO, User } from "../types";

type ComparisonState = {
  fromValue: string;
  fromUnit: string;
  toValue: string;
  toUnit: string;
};

type ConversionState = {
  value: string;
  fromUnit: string;
  toUnit: string;
};

type ArithmeticState = {
  value1: string;
  unit1: string;
  operator: "+" | "-" | "/";
  value2: string;
  unit2: string;
  resultUnit: string;
};

type HistoryFilter = "all" | "errored" | "operation" | "type";

const icons = {
  length: Ruler,
  weight: Scale,
  temperature: Thermometer,
  volume: FlaskConical
} as const;

export function MeasurementPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState(0);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<MeasurementTypeKey>("length");
  const [selectedAction, setSelectedAction] = useState<ActionKey>("comparison");
  const [statusText, setStatusText] = useState("");
  const [guestUsesRemaining, setGuestUsesRemaining] = useState<number>(() => getGuestUsesRemaining());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CalculationResponse | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStatus, setHistoryStatus] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [deletingHistoryId, setDeletingHistoryId] = useState<number | null>(null);
  const [comparison, setComparison] = useState<ComparisonState>({
    fromValue: "1",
    fromUnit: measurementConfig.length.units[0].value,
    toValue: "1000",
    toUnit: measurementConfig.length.units[1].value
  });
  const [conversion, setConversion] = useState<ConversionState>({
    value: "1",
    fromUnit: measurementConfig.length.units[0].value,
    toUnit: measurementConfig.length.units[1].value
  });
  const [arithmetic, setArithmetic] = useState<ArithmeticState>({
    value1: "1",
    unit1: measurementConfig.length.units[0].value,
    operator: "+",
    value2: "1",
    unit2: measurementConfig.length.units[1].value,
    resultUnit: measurementConfig.length.units[0].value
  });

  const units = measurementConfig[selectedType].units;

  const refreshCredits = async (activeUserId: number) => {
    setCreditsLoading(true);
    try {
      setCredits(await fetchCredits(activeUserId));
    } finally {
      setCreditsLoading(false);
    }
  };

  const refreshHistory = async (activeUserId: number) => {
    setHistoryLoading(true);
    setHistoryStatus("");
    try {
      const data = await fetchUserHistory(activeUserId);
      setHistoryItems(data);
      if (data.length === 0) {
        setHistoryStatus("No history found yet.");
      }
    } catch (error) {
      setHistoryItems([]);
      setHistoryStatus(error instanceof Error ? error.message : "Unable to load history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        const status = await fetchAuthStatus();
        setAuthenticated(status.authenticated);
        setUser(status.user ?? null);
        if (status.authenticated && status.user) {
          await Promise.all([refreshCredits(status.user.id), refreshHistory(status.user.id)]);
        }
      } finally {
        setReady(true);
      }
    };

    void run();
  }, []);

  useEffect(() => {
    const nextUnits = measurementConfig[selectedType].units;
    setComparison((current) => ({
      ...current,
      fromUnit: nextUnits[0].value,
      toUnit: (nextUnits[1] ?? nextUnits[0]).value
    }));
    setConversion({
      value: "1",
      fromUnit: nextUnits[0].value,
      toUnit: (nextUnits[1] ?? nextUnits[0]).value
    });
    setArithmetic({
      value1: "1",
      unit1: nextUnits[0].value,
      operator: "+",
      value2: "1",
      unit2: (nextUnits[1] ?? nextUnits[0]).value,
      resultUnit: nextUnits[0].value
    });
    setResult(null);
    setStatusText("");
  }, [selectedType]);

  useEffect(() => {
    if (!authenticated || !user) {
      setHistoryItems([]);
      return;
    }

    void refreshHistory(user.id);
  }, [authenticated, historyRefreshKey, user]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") {
      return historyItems;
    }
    if (historyFilter === "errored") {
      return historyItems.filter((item) => item.error);
    }
    if (historyFilter === "operation") {
      const currentOperation =
        selectedAction === "comparison"
          ? "compare"
          : selectedAction === "conversion"
            ? "convert"
            : arithmetic.operator === "+"
              ? "add"
              : arithmetic.operator === "-"
                ? "subtract"
                : "divide";
      return historyItems.filter((item) => item.operation === currentOperation);
    }
    return historyItems.filter((item) => item.thisMeasurementType.toLowerCase() === selectedType);
  }, [arithmetic.operator, historyFilter, historyItems, selectedAction, selectedType]);

  const resultLabel = useMemo(() => {
    if (!result) {
      return "";
    }
    if (result.operation === "compare") {
      return result.resultString === "true" ? "Equal" : "Not Equal";
    }
    if (result.resultValue === undefined || result.resultValue === null) {
      return "";
    }
    return String(result.resultValue);
  }, [result]);

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-sm font-medium text-slate-500">Loading...</div>;
  }

  const buildQuantityDTO = (value: string | number, unit: string): QuantityDTO => ({
    value: Number(value),
    unit,
    measurementType: measurementConfig[selectedType].measurementType
  });

  const getUnitLabel = (unitValue: string) => units.find((unit) => unit.value === unitValue)?.label ?? unitValue;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (authenticated && credits <= 0) {
      setResult(null);
      setStatusText("Your credits are exhausted. Please recharge to continue.");
      navigate("/recharge");
      return;
    }

    setSubmitting(true);
    setResult(null);
    setStatusText("Calculating...");

    try {
      if (selectedAction === "comparison") {
        setResult(await submitCalculation("/api/v1/quantities/compare", {
          thisQuantityDTO: buildQuantityDTO(comparison.fromValue, comparison.fromUnit),
          thatQuantityDTO: buildQuantityDTO(comparison.toValue, comparison.toUnit)
        }, setGuestUsesRemaining));
      } else if (selectedAction === "conversion") {
        setResult(await submitCalculation("/api/v1/quantities/convert", {
          thisQuantityDTO: buildQuantityDTO(conversion.value, conversion.fromUnit),
          thatQuantityDTO: buildQuantityDTO(0, conversion.toUnit)
        }, setGuestUsesRemaining));
      } else {
        const endpoint =
          arithmetic.operator === "+"
            ? "/api/v1/quantities/add"
            : arithmetic.operator === "-"
              ? "/api/v1/quantities/subtract"
              : "/api/v1/quantities/divide";
        const response = await submitCalculation(endpoint, {
          thisQuantityDTO: buildQuantityDTO(arithmetic.value1, arithmetic.unit1),
          thatQuantityDTO: buildQuantityDTO(arithmetic.value2, arithmetic.unit2)
        }, setGuestUsesRemaining);
        setResult({
          ...response,
          resultUnit: response.resultUnit ?? arithmetic.resultUnit
        });
      }

      setStatusText("Calculation completed from backend response.");

      if (authenticated && user) {
        const nextCredits = Math.max(0, credits - 1);
        setCredits(nextCredits);
        const nextUser = { ...user, credits: nextCredits };
        setUser(nextUser);
        saveUser(nextUser);
        await Promise.all([refreshCredits(user.id), refreshHistory(user.id)]);
      }
    } catch (error) {
      setResult(null);
      if (error instanceof CreditRequiredError) {
        setStatusText(error.message);
        navigate("/recharge");
      } else if (error instanceof GuestLimitError) {
        setStatusText(error.message);
        navigate("/auth?returnTo=/recharge");
      } else {
        setStatusText(error instanceof Error ? error.message : "Unable to fetch calculation from backend.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setAuthenticated(false);
    setUser(null);
    setCredits(0);
    navigate("/auth", { replace: true });
  };

  const handleDeleteHistory = async (historyId: number) => {
    if (!user) {
      return;
    }

    setDeletingHistoryId(historyId);
    setHistoryStatus("");
    try {
      await deleteUserHistory(user.id, historyId);
      await refreshHistory(user.id);
      setHistoryStatus("History item removed.");
    } catch (error) {
      setHistoryStatus(error instanceof Error ? error.message : "Unable to remove history item.");
    } finally {
      setDeletingHistoryId(null);
    }
  };

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto w-full max-w-[1380px] overflow-hidden rounded-[30px] border border-white/70 bg-white/80 shadow-auth backdrop-blur">
        <header className="flex items-center justify-between gap-4 bg-gradient-to-r from-brand-600 to-[#6e8bf4] px-4 py-5 text-white sm:px-8">
          <div className="flex items-center gap-3">
            <BalanceLogo className="h-12 w-12 rounded-full bg-white/95 p-1 md:hidden" />
            <div>
              <h1 className="text-lg font-semibold sm:text-2xl">Welcome To Quantity Measurement</h1>
              {user?.name ? (
                <p className="mt-1 hidden text-sm text-white/85 sm:block">Signed in as {user.name}</p>
              ) : (
                <p className="mt-1 hidden text-sm text-white/85 sm:block">Guest mode is enabled for quick calculations.</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CreditsBar
              credits={authenticated ? credits : guestUsesRemaining}
              loading={authenticated ? creditsLoading : false}
              isGuest={!authenticated}
            />
            {authenticated ? (
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
              >
                <span className="hidden sm:inline">Logout</span>
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/auth?returnTo=/measurement")}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
              >
                Login to save history
              </button>
            )}
          </div>
        </header>

        <div className="space-y-10 px-4 py-6 sm:px-8 sm:py-10">
          <section>
            <span className="text-xs font-semibold tracking-[0.18em] text-slate-500">CHOOSE TYPE</span>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(measurementConfig).map(([key, value]) => {
                const Icon = icons[key as MeasurementTypeKey];
                const active = selectedType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedType(key as MeasurementTypeKey)}
                    className={`rounded-[22px] border bg-white px-6 py-6 text-left shadow-panel transition ${
                      active ? "border-cyan-400 bg-cyan-50/80" : "border-slate-200/70 hover:border-brand-300"
                    }`}
                  >
                    <Icon className={`h-8 w-8 ${active ? "text-amber-500" : "text-brand-500"}`} />
                    <div className="mt-5 text-base font-semibold capitalize text-slate-900">{key}</div>
                    <div className="mt-2 text-sm text-slate-500">{value.units.length} supported units</div>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <span className="text-xs font-semibold tracking-[0.18em] text-slate-500">CHOOSE ACTION</span>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(["comparison", "conversion", "arithmetic"] as ActionKey[]).map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => {
                    setSelectedAction(action);
                    setResult(null);
                    setStatusText("");
                  }}
                  className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                    selectedAction === action
                      ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                      : "bg-white text-slate-600 shadow-panel hover:text-brand-600"
                  }`}
                >
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </button>
              ))}
            </div>
          </section>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {selectedAction === "comparison" ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <QuantityCard
                  label="FROM"
                  value={comparison.fromValue}
                  unit={comparison.fromUnit}
                  units={units}
                  onValueChange={(value) => setComparison((current) => ({ ...current, fromValue: value }))}
                  onUnitChange={(unit) => setComparison((current) => ({ ...current, fromUnit: unit }))}
                />
                <QuantityCard
                  label="TO"
                  value={comparison.toValue}
                  unit={comparison.toUnit}
                  units={units}
                  onValueChange={(value) => setComparison((current) => ({ ...current, toValue: value }))}
                  onUnitChange={(unit) => setComparison((current) => ({ ...current, toUnit: unit }))}
                />
              </div>
            ) : null}

            {selectedAction === "conversion" ? (
              <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
                <QuantityCard
                  label="VALUE"
                  value={conversion.value}
                  unit={conversion.fromUnit}
                  units={units}
                  onValueChange={(value) => setConversion((current) => ({ ...current, value }))}
                  onUnitChange={(unit) => setConversion((current) => ({ ...current, fromUnit: unit }))}
                />
                <div className="flex items-center justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                </div>
                <UnitOnlyCard
                  label="CONVERT INTO"
                  unit={conversion.toUnit}
                  units={units}
                  onUnitChange={(unit) => setConversion((current) => ({ ...current, toUnit: unit }))}
                />
              </div>
            ) : null}

            {selectedAction === "arithmetic" ? (
              <div className="grid gap-6 xl:grid-cols-[1fr_auto_1fr_320px] xl:items-end">
                <QuantityCard
                  label="VALUE 1"
                  value={arithmetic.value1}
                  unit={arithmetic.unit1}
                  units={units}
                  onValueChange={(value) => setArithmetic((current) => ({ ...current, value1: value }))}
                  onUnitChange={(unit) => setArithmetic((current) => ({ ...current, unit1: unit }))}
                />
                <div className="flex items-center justify-center">
                  <select
                    value={arithmetic.operator}
                    onChange={(event) =>
                      setArithmetic((current) => ({ ...current, operator: event.target.value as "+" | "-" | "/" }))
                    }
                    className="h-16 rounded-2xl border border-slate-200 bg-white px-5 text-2xl font-semibold text-slate-800 shadow-panel outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                  >
                    <option value="+">+</option>
                    <option value="-">-</option>
                    <option value="/">/</option>
                  </select>
                </div>
                <QuantityCard
                  label="VALUE 2"
                  value={arithmetic.value2}
                  unit={arithmetic.unit2}
                  units={units}
                  onValueChange={(value) => setArithmetic((current) => ({ ...current, value2: value }))}
                  onUnitChange={(unit) => setArithmetic((current) => ({ ...current, unit2: unit, resultUnit: unit }))}
                />
                <UnitOnlyCard
                  label="RESULT UNIT"
                  unit={arithmetic.resultUnit}
                  units={units}
                  onUnitChange={(unit) => setArithmetic((current) => ({ ...current, resultUnit: unit, unit2: unit }))}
                />
              </div>
            ) : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-2xl bg-brand-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Calculating..." : "Calculate"}
              </button>
            </div>
          </form>

          {result && resultLabel ? (
            <section className="grid gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-panel sm:grid-cols-[1fr_220px] sm:items-center sm:px-8">
              <div className="border-l-4 border-cyan-400 pl-4">
                <div className="text-xs font-semibold tracking-[0.18em] text-slate-500">RESULT</div>
                <div className="mt-2 text-3xl font-bold text-brand-600">{resultLabel}</div>
              </div>
              <div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700">
                  {result.operation === "compare" ? "Comparison" : getUnitLabel(result.resultUnit ?? arithmetic.resultUnit)}
                </div>
              </div>
            </section>
          ) : null}

          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <span>{statusText || "Result will appear only after the backend sends a response."}</span>
            {result ? (
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setStatusText("");
                }}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-600 transition hover:text-slate-900"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear</span>
              </button>
            ) : null}
          </div>

          <section className="rounded-[28px] border border-slate-200/80 bg-white px-4 py-5 shadow-panel sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Calculation History</h2>
                  <p className="text-sm text-slate-500">Available after login so your measurements stay tied to your account and recharge history.</p>
                </div>
              </div>
              {authenticated ? (
                <button
                  type="button"
                  onClick={() => setHistoryRefreshKey((current) => current + 1)}
                  className="flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
                >
                  <RefreshCcw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
              ) : null}
            </div>

            {authenticated ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {([
                  ["all", "All History"],
                  ["errored", "Errored"],
                  ["operation", "This Operation"],
                  ["type", "This Type"]
                ] as [HistoryFilter, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setHistoryFilter(key)}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      historyFilter === key
                        ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-5 space-y-4">
              {!authenticated ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-medium text-slate-700">Log in to unlock your personal measurement history and paid credits.</p>
                  <p className="mt-1 text-sm text-slate-500">Guest mode is only for free calculations. Recharge and history are available after login.</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => navigate("/auth?returnTo=/measurement")}
                      className="rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
                    >
                      Login to view history
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/auth?returnTo=/recharge")}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
                    >
                      Login to recharge
                    </button>
                  </div>
                </div>
              ) : null}
              {authenticated && historyLoading ? <p className="text-sm font-medium text-slate-500">Loading history...</p> : null}
              {authenticated && !historyLoading && historyStatus ? <p className="text-sm font-medium text-slate-500">{historyStatus}</p> : null}
              {authenticated && !historyLoading && !historyStatus && filteredHistory.length > 0 ? (
                <div className="grid gap-4">
                  {filteredHistory.map((item, index) => (
                    <article
                      key={item.id ?? `${item.operation}-${index}-${item.thisUnit}-${item.thatUnit}-${item.resultValue}`}
                      className={`rounded-[22px] border px-4 py-4 shadow-sm sm:px-5 ${
                        item.error ? "border-rose-200 bg-rose-50/60" : "border-slate-200 bg-slate-50/70"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                              item.error ? "bg-rose-100 text-rose-700" : "bg-brand-100 text-brand-700"
                            }`}
                          >
                            {item.operation}
                          </span>
                          <span className="text-sm font-medium text-slate-500">{item.thisMeasurementType}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {item.error ? (
                            <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
                              <AlertTriangle className="h-4 w-4" />
                              <span>Error</span>
                            </div>
                          ) : null}
                          {item.id ? (
                            <button
                              type="button"
                              onClick={() => void handleDeleteHistory(item.id!)}
                              disabled={deletingHistoryId === item.id}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>{deletingHistoryId === item.id ? "Removing..." : "Remove"}</span>
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
                        <HistoryValue value={item.thisValue} unit={item.thisUnit} />
                        <HistoryOperator value={getHistoryOperatorLabel(item.operation)} />
                        <HistoryValue value={item.thatValue} unit={item.thatUnit} />
                        <HistoryOperator value="=" />
                        <HistoryResult item={item} />
                      </div>

                      {item.error && item.errorMessage ? (
                        <p className="mt-4 rounded-2xl bg-white/75 px-4 py-3 text-sm font-medium text-rose-700">{item.errorMessage}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

type Unit = {
  label: string;
  value: string;
};

type QuantityCardProps = {
  label: string;
  value: string;
  unit: string;
  units: readonly Unit[];
  onValueChange: (value: string) => void;
  onUnitChange: (unit: string) => void;
};

function QuantityCard({ label, value, unit, units, onValueChange, onUnitChange }: QuantityCardProps) {
  return (
    <div className="rounded-[24px] bg-white shadow-panel">
      <div className="px-5 pt-5 text-xs font-semibold tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-3 border-y border-slate-100 px-5 py-4">
        <input
          type="number"
          step="any"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className="w-full border-none bg-transparent p-0 text-4xl font-bold text-slate-900 outline-none"
        />
      </div>
      <select
        value={unit}
        onChange={(event) => onUnitChange(event.target.value)}
        className="w-full rounded-b-[24px] border-none bg-white px-5 py-4 text-sm text-slate-600 outline-none"
      >
        {units.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type UnitOnlyCardProps = {
  label: string;
  unit: string;
  units: readonly Unit[];
  onUnitChange: (unit: string) => void;
};

function UnitOnlyCard({ label, unit, units, onUnitChange }: UnitOnlyCardProps) {
  return (
    <div className="rounded-[24px] bg-white shadow-panel">
      <div className="px-5 pt-5 text-xs font-semibold tracking-[0.18em] text-slate-500">{label}</div>
      <select
        value={unit}
        onChange={(event) => onUnitChange(event.target.value)}
        className="mt-3 w-full rounded-b-[24px] border-t border-slate-100 bg-white px-5 py-5 text-sm text-slate-600 outline-none"
      >
        {units.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function getHistoryOperatorLabel(operation: string) {
  if (operation === "add") return "+";
  if (operation === "subtract") return "-";
  if (operation === "divide") return "/";
  if (operation === "compare") return "vs";
  if (operation === "convert") return "to";
  return operation;
}

function HistoryValue({ value, unit }: { value: number; unit: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{unit || "N/A"}</div>
    </div>
  );
}

function HistoryOperator({ value }: { value: string }) {
  return <div className="text-center text-2xl font-bold text-brand-500">{value}</div>;
}

function HistoryResult({ item }: { item: HistoryItem }) {
  const resultText = item.operation === "compare" ? (item.resultString === "true" ? "Equal" : "Not Equal") : `${item.resultValue}`;

  return (
    <div className="rounded-2xl bg-white px-4 py-4">
      <div className={`text-2xl font-bold ${item.error ? "text-rose-600" : "text-brand-600"}`}>{resultText}</div>
      <div className="mt-1 text-sm text-slate-500">{item.operation === "compare" ? "Comparison" : item.resultUnit || "Result"}</div>
    </div>
  );
}
