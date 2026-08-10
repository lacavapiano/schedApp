import express from "express";
const router = express.Router();

import {
	getClients,
	getClient,
	createClient,
	updateClient,
	deleteClient
} from "../controllers/clientController.js";

router.get("/", getClients);
router.get("/:id", getClient);
router.post("/", createClient);
router.patch("/:id", updateClient);
router.delete("/:id", deleteClient);

export default router;