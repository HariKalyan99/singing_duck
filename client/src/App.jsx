import { Routes, Route } from "react-router-dom";
import AppLayout from "./layout/AppLayout.jsx";
import ErrorDashboard from "./pages/ErrorDashboard.jsx";
import ErrorTriggerServices from "./pages/ErrorTriggerServices.jsx";
import RecordingsPanel from "./pages/RecordingsPanel.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<ErrorDashboard />} />
        <Route path="/recordings" element={<RecordingsPanel />} />
        <Route
          path="/error--trigger-services"
          element={<ErrorTriggerServices />}
        />
      </Route>
    </Routes>
  );
}
