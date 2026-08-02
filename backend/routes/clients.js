const express = require("express");
const router = express.Router();

const { getClients } = require("../controllers/clientController");

router.get("/", getClients);

module.exports = router;