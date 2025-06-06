import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "@/pages/Home";
import BsVoltage from "@/pages/BsVoltage";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/utils/ThemeContext";
import BsSchedule from "./pages/BsSchedule";
import OutageDashboard from "./pages/OutageDashboard";
import BsTemperature from "./pages/BsTemperature";

function App() {
  return (
    <ThemeProvider>
      <div className="h-screen mx-auto overflow-hidden bg-secondary">
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/base/:stationId" element={<Home />} />
            <Route path="/bs-voltage" element={<BsVoltage />} />
            <Route path="/bs-voltage-schedule" element={<BsSchedule />} />
            <Route path="/bs-map" element={<OutageDashboard />} />
            <Route path="/bs-temperature" element={<BsTemperature />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;
