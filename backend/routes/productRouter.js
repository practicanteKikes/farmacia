// backend/routes/productRouter.js
const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const authorizeRole = require("../middleware/roleMiddleware");

// Define las rutas y las conecta con las funciones del controlador
router.get("/", productController.getProducts);
router.post("/", authorizeRole(["admin"]), productController.createProduct);
router.put("/:id", authorizeRole(["admin"]), productController.updateProduct);       // <-- Restringuido a admin
router.delete("/:id", authorizeRole(["admin"]), productController.deleteProduct);   // <-- Restringido a admin

module.exports = router;