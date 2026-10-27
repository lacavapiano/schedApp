import express from "express";

import {
  connectGoogle,
  googleCallback,
  getGoogleStatus,
  getGoogleCalendars,
  disconnectGoogle,
} from "../controllers/googleController.js";

const router = express.Router();

router.get("/connect", connectGoogle);
router.get("/callback", googleCallback);
router.get("/status", getGoogleStatus);
router.get("/calendars", getGoogleCalendars);
router.post("/disconnect", disconnectGoogle);

export default router;