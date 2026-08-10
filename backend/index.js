import express from "express";
import cors from "cors";

import apiRoutes from "./routes/api.js";
import clientRoutes from "./routes/clients.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', apiRoutes);
app.use('/api/clients', clientRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});