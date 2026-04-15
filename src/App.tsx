import { Navigate, Route, Routes } from "react-router-dom";
import { AuthPage } from "./pages/AuthPage";
import { MeasurementPage } from "./pages/MeasurementPage";
import { RechargePage } from "./pages/RechargePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/measurement" replace />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/measurement" element={<MeasurementPage />} />
      <Route path="/recharge" element={<RechargePage />} />
      <Route path="*" element={<Navigate to="/measurement" replace />} />
    </Routes>
  );
}
