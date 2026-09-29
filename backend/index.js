import express from "express";
import cors from "cors";

import apiRoutes from "./routes/api.js";
import clientRoutes from "./routes/clients.js";
import pianoRoutes from "./routes/pianos.js";
import appointmentRoutes from "./routes/appointments.js";
import settingsRoutes from "./routes/settings.js";
import googleRoutes from "./routes/google.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/pianos", pianoRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/google", googleRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});