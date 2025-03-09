import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "@/pages/Home";
import BsVoltage from "@/pages/BsVoltage";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/utils/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <div className="overflow-hidden mx-auto h-screen bg-secondary">
        <BrowserRouter>
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/base/:stationId" element={<Home />} />
            <Route path="/bs-voltage" element={<BsVoltage />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;
