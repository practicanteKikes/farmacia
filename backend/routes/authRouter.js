const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Definir la ruta POST para iniciar sesión
// Esta ruta será accesible como: /api/auth/login
router.post("/login", authController.login);

module.exports = router;