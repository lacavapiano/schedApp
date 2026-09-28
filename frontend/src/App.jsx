import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import ClientDetail from "./pages/ClientDetail";
import Pianos from "./pages/Pianos";
import PianoDetail from "./pages/PianoDetail";

function App() {
    return (
        <BrowserRouter>
            <Navbar />

            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/pianos" element={<Pianos />} />
              <Route path="/pianos/:id" element={<PianoDetail />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;