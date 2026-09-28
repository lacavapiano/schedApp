import { Link } from "react-router-dom";

function Navbar() {
    return (
        <nav>
            <Link to="/login">Login</Link>{" | "}
            <Link to="/">Dashboard</Link>{" | "}
            <Link to="/clients">Clients</Link>{" | "}
            <Link to="/calendar">Calendar</Link>{" | "}
            <Link to="/settings">Settings</Link>{" | "}
            <Link to="/pianos">Pianos</Link>
            
        </nav>
    );
}

export default Navbar;