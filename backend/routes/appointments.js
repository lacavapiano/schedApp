import express from "express";

import {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  completeAppointment,
  deleteAppointment,
} from "../controllers/appointmentController.js";

const router = express.Router();

router.get("/", getAppointments);
router.get("/:id", getAppointment);
router.post("/", createAppointment);
router.patch("/:id", updateAppointment);
router.post("/:id/complete", completeAppointment);
router.delete("/:id", deleteAppointment);

export default router;