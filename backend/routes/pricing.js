import express from "express";
import {
  getServiceTypes,
  createServiceType,
  updateServiceType,
  getClientDiscounts,
  createClientDiscount,
  updateClientDiscount,
  getAppointmentCharges,
  saveAppointmentCharges,
} from "../controllers/pricingController.js";

const router = express.Router();

router.get("/service-types", getServiceTypes);
router.post("/service-types", createServiceType);
router.patch("/service-types/:id", updateServiceType);

router.get("/client-discounts", getClientDiscounts);
router.post("/client-discounts", createClientDiscount);
router.patch("/client-discounts/:id", updateClientDiscount);

router.get("/appointment-charges", getAppointmentCharges);
router.post("/appointment-charges", saveAppointmentCharges);

export default router;
