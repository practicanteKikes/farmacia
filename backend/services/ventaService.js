const db = require("../config/db");

// --- Funciones de Promesas de la Base de Datos ---
function dbRun(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function dbGet(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

// --- NUEVO Servicio de Creación de Venta ---

const createSale = async (items) => {
  // Inicia la transacción (si algo falla, no se guarda nada)
  await dbRun("BEGIN TRANSACTION");
  
  try {
    // 1. Crear la cabecera de la venta
    const ventaResult = await dbRun("INSERT INTO ventas (total, fecha) VALUES (0, datetime('now'))");
    const ventaId = ventaResult.lastID;
    let totalCalculado = 0;

    // 2. Procesar cada item del carrito
    for (const item of items) {
      const producto = await dbGet("SELECT * FROM productos WHERE id = ?", [item.id]);

      if (!producto) {
        throw new Error(`Producto con ID ${item.id} no encontrado.`);
      }

      let precioVentaItem;
      let costoVentaItem;
      let unidadesStockPorItem;

      // 3. Determinar precio, costo y unidades a descontar según el TIPO (Caja o Unidad)
      if (item.tipo === 'caja' && producto.unidades_por_caja > 1) {
        // VENTA POR CAJA
        precioVentaItem = producto.precio_caja;
        costoVentaItem = producto.costo_caja; // Usamos el costo de la caja entera
        unidadesStockPorItem = producto.unidades_por_caja; // Descontamos 30 (ejemplo)
      } else {
        // VENTA POR UNIDAD (Default)
        precioVentaItem = producto.precio;
        costoVentaItem = producto.costo; // Usamos el costo unitario
        unidadesStockPorItem = 1; // Descontamos 1
      }

      // 4. Validar Stock
      const totalUnidadesADescontar = item.cantidad * unidadesStockPorItem;
      
      if (producto.stock < totalUnidadesADescontar) {
        throw new Error(`Stock insuficiente para "${producto.nombre}". Tienes ${producto.stock} unidades, intentas vender ${totalUnidadesADescontar}.`);
      }

      // 5. Calcular subtotal y sumar al total general
      const subtotal = item.cantidad * precioVentaItem;
      totalCalculado += subtotal;

      // 6. Insertar en venta_items
      // Aquí guardamos el costo REAL de lo que se vendió (sea caja o unidad) para el cierre de caja exacto.
      await dbRun(
        "INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, costo_unitario) VALUES (?, ?, ?, ?, ?)",
        [ventaId, producto.id, item.cantidad, precioVentaItem, costoVentaItem]
      );

      // 7. Actualizar el Stock (descontando el total de unidades)
      await dbRun(
        "UPDATE productos SET stock = stock - ? WHERE id = ?",
        [totalUnidadesADescontar, producto.id]
      );
    }

    // 8. Actualizar el total final en la cabecera de la venta
    await dbRun("UPDATE ventas SET total = ? WHERE id = ?", [totalCalculado, ventaId]);

    // 9. Confirmar la transacción
    await dbRun("COMMIT");

    return {
      ventaId,
      total: totalCalculado,
      mensaje: "Venta registrada exitosamente."
    };

  } catch (error) {
    // Si algo falla, revertir todos los cambios
    await dbRun("ROLLBACK");
    throw error; 
  }
};

module.exports = { createSale };