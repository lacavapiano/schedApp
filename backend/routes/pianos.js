import express from "express";
const router = express.Router();

import {
  getPianos,
  getPiano,
  createPiano,
  updatePiano,
  deletePiano,
} from "../controllers/pianoController.js";

router.get("/", getPianos);
router.get("/:id", getPiano);
router.post("/", createPiano);
router.patch("/:id", updatePiano);
router.delete("/:id", deletePiano);

export default router;