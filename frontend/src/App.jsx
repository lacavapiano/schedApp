import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { supabase } from "./services/supabase";
import Navbar from "./components/Navbar";

import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import ClientDetail from "./pages/ClientDetail";
import Pianos from "./pages/Pianos";
import PianoDetail from "./pages/PianoDetail";

function ProtectedRoute({ session, children }) {
  const location = useLocation();

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}

function AppContent() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setSession(currentSession);
        setAuthLoading(false);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;

        if (error) {
          console.error("Unable to restore session:", error.message);
          setSession(null);
        } else {
          setSession(data.session);
        }

        setAuthLoading(false);
      })
      .catch((error) => {
        if (!mounted) return;

        console.error("Session check failed:", error);
        setSession(null);
        setAuthLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (authLoading) {
    return (
      <div className="app-loading" role="status">
        <div className="app-loading-spinner" />
        <p>Loading your workspace...</p>
      </div>
    );
  }

  return (
    <>
      {session && <Navbar />}

      <Routes>
        <Route
          path="/login"
          element={
            session ? <Navigate to="/" replace /> : <Login />
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute session={session}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients"
          element={
            <ProtectedRoute session={session}>
              <Clients />
            </ProtectedRoute>
          }
        />

        <Route
          path="/clients/:id"
          element={
            <ProtectedRoute session={session}>
              <ClientDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pianos"
          element={
            <ProtectedRoute session={session}>
              <Pianos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pianos/:id"
          element={
            <ProtectedRoute session={session}>
              <PianoDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/calendar"
          element={
            <ProtectedRoute session={session}>
              <Calendar />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute session={session}>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            session ? (
              <Navigate to="/" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
