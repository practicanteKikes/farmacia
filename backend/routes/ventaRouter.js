const express = require("express");
const router = express.Router();
const ventaController = require("../controllers/ventaController");

// --- Estas dos rutas ya las tenías ---
router.post("/", ventaController.createSale);
router.get("/", ventaController.getSales); // Esta es tu ruta de "total mes"


// (Estas rutas llaman a las funciones que ya añadimos en 'ventaController.js')

// Ruta para el resumen de ganancias del día (ej. /api/ventas/cierre-diario?fecha=2025-11-10)
router.get('/cierre-diario', ventaController.getCierreCajaDiario); 

// Ruta para la lista detallada de ventas del día (ej. /api/ventas/por-dia?fecha=2025-11-10)
router.get('/por-dia', ventaController.getVentasPorDia);
// ---------------------------------

module.exports = router;