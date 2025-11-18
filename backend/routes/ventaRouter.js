const express = require("express");
const router = express.Router();
const ventaController = require("../controllers/ventaController");

// Rutas principales de Ventas
router.post("/", ventaController.createSale);  // Crear una nueva venta
router.get("/", ventaController.getSales);     // Obtener historial del mes actual

// Rutas de Reportes y Cierre de Caja
router.get('/cierre-diario', ventaController.getCierreCajaDiario); // Resumen de ganancias del día
router.get('/por-dia', ventaController.getVentasPorDia);           // Lista detallada de ventas del día

// ⭐️ NUEVA RUTA para el Top de Ventas (Más vendidos del día/mes)
router.get('/top-productos', ventaController.getTopProducts);

module.exports = router;