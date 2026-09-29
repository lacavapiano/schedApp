import express from "express";

import {
  connectGoogle,
  googleCallback,
  getGoogleStatus,
  getGoogleCalendars,
} from "../controllers/googleController.js";

const router = express.Router();

router.get("/connect", connectGoogle);
router.get("/callback", googleCallback);
router.get("/status", getGoogleStatus);
router.get("/calendars", getGoogleCalendars);

export default router;