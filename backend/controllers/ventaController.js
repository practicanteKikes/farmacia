const ventaService = require('../services/ventaService');
const db = require("../config/db");

/**
 * 🔹 Crear una nueva venta.
 * Llama al servicio de ventas para procesar la lógica de la transacción.
 */
exports.createSale = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Se requieren items para la venta" });
    }

    // Llama al servicio y espera a que la transacción se complete o falle.
    const resultado = await ventaService.createSale(items);
    
    // Si todo fue exitoso, envía una única respuesta de éxito.
    res.status(201).json(resultado);

  } catch (error) {
    // Si algo falló en el servicio, envía una única respuesta de error.
    res.status(500).json({ error: error.message });
  }
};

/**
 * 🔹 Obtener todas las ventas con sus productos (VISTA MENSUAL).
 * Esta función ya estaba bien estructurada.
 */
exports.getSales = (req, res) => {
  const sql = `
    SELECT 
      v.id as venta_id, 
      datetime(v.fecha, '-5 hours') as fecha,
      v.total,
      p.nombre, 
      vi.cantidad, 
      vi.precio_unitario
    FROM ventas v
    JOIN venta_items vi ON v.id = vi.venta_id
    JOIN productos p ON vi.producto_id = p.id
    WHERE strftime('%Y-%m', datetime(v.fecha, '-5 hours')) = strftime('%Y-%m', 'now', '-5 hours')
    ORDER BY v.id DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const ventasMap = {};
    rows.forEach((row) => {
      if (!ventasMap[row.venta_id]) {
        ventasMap[row.venta_id] = {
          venta_id: row.venta_id,
          fecha: row.fecha,
          total: row.total,
          productos: [],
        };
      }
      ventasMap[row.venta_id].productos.push({
        nombre: row.nombre,
        cantidad: row.cantidad,
        precio_unitario: row.precio_unitario,
        subtotal: row.cantidad * row.precio_unitario,
      });
    });
    
    const ventas = Object.values(ventasMap);
    const totalMes = ventas.reduce((sum, venta) => sum + venta.total, 0);

    res.json({
      ventas: ventas,
      totalMes: totalMes,
    });
  });
};



/**
 * 🔹 Obtener el resumen de cierre de caja para un día específico.
 * Calcula el total de ventas, el total de costos y la ganancia neta.
 */
exports.getCierreCajaDiario = (req, res) => {
  // Recibimos la fecha desde el frontend, ej: /api/ventas/cierre-diario?fecha=2025-11-10
  const { fecha } = req.query;

  // Si no se envía una fecha, usamos el día de hoy (ajustado a -5 horas)
  const fechaConsulta = fecha ? fecha : new Date(new Date().setHours(new Date().getHours() - 5)).toISOString().split('T')[0];
  
  getCierreDelDia(res, fechaConsulta);
};

// Función auxiliar para mantener el código limpio
function getCierreDelDia(res, fecha) {

  // IMPORTANTE: La columna 'costo' la añadimos a 'productos' en db.js
  const sql = `
    SELECT
      SUM(vi.cantidad * vi.precio_unitario) as totalVentas,
      SUM(vi.cantidad * p.costo) as totalCostos
    FROM ventas v
    JOIN venta_items vi ON v.id = vi.venta_id
    JOIN productos p ON vi.producto_id = p.id
    WHERE strftime('%Y-%m-%d', datetime(v.fecha, '-5 hours')) = ?
  `;

  db.get(sql, [fecha], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    const totalVentas = row.totalVentas || 0;
    const totalCostos = row.totalCostos || 0;
    const gananciaNeta = totalVentas - totalCostos;

    res.json({
      fecha: fecha,
      totalVentas: totalVentas,
      totalCostos: totalCostos,
      gananciaNeta: gananciaNeta,
    });
  });
}

/**
 * 🔹 Obtener todas las ventas detalladas de un día específico.
 */
exports.getVentasPorDia = (req, res) => {
  const { fecha } = req.query; // Espera una fecha YYYY-MM-DD

  if (!fecha) {
    return res.status(400).json({ error: "Se requiere una fecha (YYYY-MM-DD)" });
  }

  const sql = `
    SELECT 
      v.id as venta_id, 
      datetime(v.fecha, '-5 hours') as fecha,
      v.total,
      p.nombre, 
      vi.cantidad, 
      vi.precio_unitario,
      p.costo as costo_unitario, -- 💡 Traemos el costo
      (vi.precio_unitario - p.costo) * vi.cantidad as ganancia_producto -- 💡 Calculamos ganancia
    FROM ventas v
    JOIN venta_items vi ON v.id = vi.venta_id
    JOIN productos p ON vi.producto_id = p.id
    WHERE strftime('%Y-%m-%d', datetime(v.fecha, '-5 hours')) = ?
    ORDER BY v.id DESC
  `;

  db.all(sql, [fecha], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const ventasMap = {};
    rows.forEach((row) => {
      if (!ventasMap[row.venta_id]) {
        ventasMap[row.venta_id] = {
          venta_id: row.venta_id,
          fecha: row.fecha,
          total: row.total,
          productos: [],
        };
      }
      ventasMap[row.venta_id].productos.push({
        nombre: row.nombre,
        cantidad: row.cantidad,
        precio_unitario: row.precio_unitario,
        subtotal: row.cantidad * row.precio_unitario,
        costo_unitario: row.costo_unitario,
        ganancia_producto: row.ganancia_producto,
      });
    });
    
    const ventas = Object.values(ventasMap);
    // Ahora es el total del DÍA, no del mes
    const totalDia = ventas.reduce((sum, venta) => sum + venta.total, 0);

    res.json({
      ventas: ventas,
      totalDia: totalDia,
    });
  });
};