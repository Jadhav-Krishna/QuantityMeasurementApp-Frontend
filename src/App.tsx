import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { fetchAuthStatus } from "./lib/auth";
import { AuthPage } from "./pages/AuthPage";
import { MeasurementPage } from "./pages/MeasurementPage";

function RootRedirect() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const status = await fetchAuthStatus();
        setTarget(status.authenticated ? "/measurement" : "/auth");
      } catch {
        setTarget("/auth");
      }
    };

    void run();
  }, []);

  if (!target) {
    return <div className="flex min-h-screen items-center justify-center text-sm font-medium text-slate-500">Loading...</div>;
  }

  return <Navigate to={target} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/measurement" element={<MeasurementPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
