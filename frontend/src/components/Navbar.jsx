import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

function Navbar() {
    const navigate = useNavigate();
    const [loggingOut, setLoggingOut] = useState(false);

    async function handleLogout() {
        setLoggingOut(true);

        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Unable to log out:", error.message);
            window.alert("Unable to log out. Please try again.");
            setLoggingOut(false);
            return;
        }

        navigate("/login", { replace: true });
    }

    return (
        <nav>
            <Link to="/">Dashboard</Link>{" | "}
            <Link to="/clients">Clients</Link>{" | "}
            <Link to="/calendar">Calendar</Link>{" | "}
            <Link to="/settings">Settings</Link>{" | "}
            <Link to="/pianos">Pianos</Link>{" | "}
            <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                aria-label="Log out"
            >
                {loggingOut ? "Logging out..." : "Log out"}
            </button>
        </nav>
    );
}

export default Navbar;
