const express = require("express");
const router = express.Router();
const ventaController = require("../controllers/ventaController");

router.post("/", ventaController.createSale);

module.exports = router;
