const ventaService = require('../services/ventaService');
const db = require("../config/db");

/**
 * 🔹 Crear una nueva venta.
 */
exports.createSale = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: "Se requieren items para la venta" });
    }
    const resultado = await ventaService.createSale(items);
    res.status(201).json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper para formatear nombres
function formatearNombreProducto(nombre, precioVenta, precioCaja, unidadesPorCaja) {
  if (unidadesPorCaja > 1) {
    if (Math.abs(precioVenta - precioCaja) < 0.01) {
      return `${nombre} (Caja)`;
    } else {
      return `${nombre} (Unidad)`;
    }
  }
  return nombre;
}

/**
 * 🔹 Obtener ventas del MES ACTUAL.
 */
exports.getSales = (req, res) => {
  const sql = `
    SELECT 
      v.id as venta_id, 
      datetime(v.fecha, '-5 hours') as fecha,
      v.total,
      p.nombre, 
      p.precio_caja,
      p.unidades_por_caja,
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
      const nombreDetallado = formatearNombreProducto(row.nombre, row.precio_unitario, row.precio_caja, row.unidades_por_caja);
      ventasMap[row.venta_id].productos.push({
        nombre: nombreDetallado,
        cantidad: row.cantidad,
        precio_unitario: row.precio_unitario,
        subtotal: row.cantidad * row.precio_unitario,
      });
    });
    
    const ventas = Object.values(ventasMap);
    const totalMes = ventas.reduce((sum, venta) => sum + venta.total, 0);

    res.json({ ventas: ventas, totalMes: totalMes });
  });
};

/**
 * 🔹 Cierre de Caja Diario.
 */
exports.getCierreCajaDiario = (req, res) => {
  const { fecha } = req.query;
  const fechaConsulta = fecha ? fecha : new Date(new Date().setHours(new Date().getHours() - 5)).toISOString().split('T')[0];
  
  const sql = `
    SELECT
      SUM(vi.cantidad * vi.precio_unitario) as totalVentas,
      SUM(vi.cantidad * vi.costo_unitario) as totalCostos
    FROM ventas v
    JOIN venta_items vi ON v.id = vi.venta_id
    WHERE strftime('%Y-%m-%d', datetime(v.fecha, '-5 hours')) = ?
  `;

  db.get(sql, [fechaConsulta], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const totalVentas = row.totalVentas || 0;
    const totalCostos = row.totalCostos || 0;
    res.json({
      fecha: fechaConsulta,
      totalVentas: totalVentas,
      totalCostos: totalCostos,
      gananciaNeta: totalVentas - totalCostos,
    });
  });
};

/**
 * 🔹 Ventas por Día (Detallado).
 */
exports.getVentasPorDia = (req, res) => {
  const { fecha } = req.query;
  if (!fecha) return res.status(400).json({ error: "Se requiere fecha" });

  const sql = `
    SELECT 
      v.id as venta_id, 
      datetime(v.fecha, '-5 hours') as fecha,
      v.total,
      p.nombre, 
      p.precio_caja, p.unidades_por_caja,
      vi.cantidad, vi.precio_unitario, vi.costo_unitario,
      (vi.precio_unitario - vi.costo_unitario) * vi.cantidad as ganancia_producto
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
      const nombreDetallado = formatearNombreProducto(row.nombre, row.precio_unitario, row.precio_caja, row.unidades_por_caja);
      ventasMap[row.venta_id].productos.push({
        nombre: nombreDetallado,
        cantidad: row.cantidad,
        precio_unitario: row.precio_unitario,
        subtotal: row.cantidad * row.precio_unitario,
        costo_unitario: row.costo_unitario,
        ganancia_producto: row.ganancia_producto,
      });
    });
    const ventas = Object.values(ventasMap);
    const totalDia = ventas.reduce((sum, venta) => sum + venta.total, 0);
    res.json({ ventas: ventas, totalDia: totalDia });
  });
};

/**
 * 🔹 ⭐️ NUEVO: Obtener el TOP de productos más vendidos
 * Recibe ?periodo=dia o ?periodo=mes
 */
exports.getTopProducts = (req, res) => {
  const { periodo, fecha } = req.query; // 'dia' o 'mes'
  
  let whereClause = "";
  let params = [];

  if (periodo === 'dia') {
      // Si es 'dia', usa la fecha enviada o la de hoy
      const fechaConsulta = fecha ? fecha : new Date(new Date().setHours(new Date().getHours() - 5)).toISOString().split('T')[0];
      whereClause = "WHERE strftime('%Y-%m-%d', datetime(v.fecha, '-5 hours')) = ?";
      params = [fechaConsulta];
  } else {
      // Si es 'mes' (o cualquier otra cosa), usa el mes actual
      whereClause = "WHERE strftime('%Y-%m', datetime(v.fecha, '-5 hours')) = strftime('%Y-%m', 'now', '-5 hours')";
      params = [];
  }

  // Esta consulta suma la cantidad de unidades vendidas agrupadas por producto
  const sql = `
    SELECT 
      p.nombre,
      p.unidades_por_caja,
      SUM(vi.cantidad) as total_unidades_vendidas,
      SUM(vi.cantidad * vi.precio_unitario) as total_dinero
    FROM venta_items vi
    JOIN ventas v ON vi.venta_id = v.id
    JOIN productos p ON vi.producto_id = p.id
    ${whereClause}
    GROUP BY p.id
    ORDER BY total_unidades_vendidas DESC
    LIMIT 10
  `;
  
  db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
  });
};