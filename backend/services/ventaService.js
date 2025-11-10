const db = require("../config/db");

// --- Funciones de Promesas de la Base de Datos ---
// (Estas son tus funciones originales, las necesitamos aquí)

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
  // Inicia la transacción
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

      // Determinar precio, costo y unidades a descontar según el TIPO
      if (item.tipo === 'caja' && producto.unidades_por_caja > 1) {
        // El item es una CAJA
        precioVentaItem = producto.precio_caja;
        costoVentaItem = producto.costo_caja; // El costo de la caja entera
        unidadesStockPorItem = producto.unidades_por_caja;
      } else {
        // El item es una UNIDAD
        precioVentaItem = producto.precio;
        costoVentaItem = producto.costo; // El costo de una sola unidad
        unidadesStockPorItem = 1;
      }

      // 3. Validar Stock
      const totalUnidadesADescontar = item.cantidad * unidadesStockPorItem;
      
      if (producto.stock < totalUnidadesADescontar) {
        throw new Error(`Stock insuficiente para "${producto.nombre}". Stock actual: ${producto.stock}, se necesitan: ${totalUnidadesADescontar}`);
      }

      // 4. Calcular subtotal y total
      const subtotal = item.cantidad * precioVentaItem;
      totalCalculado += subtotal;

      // 5. Insertar en venta_items (guardando el costo para el Cierre de Caja)
      // Guardamos el precio y costo DEL ITEM VENDIDO (ej. 1 caja, $5000, $3000 costo)
      await dbRun(
        "INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, costo_unitario) VALUES (?, ?, ?, ?, ?)",
        [ventaId, producto.id, item.cantidad, precioVentaItem, costoVentaItem]
      );

      // 6. Actualizar el Stock (descontando el total de unidades)
      await dbRun(
        "UPDATE productos SET stock = stock - ? WHERE id = ?",
        [totalUnidadesADescontar, producto.id]
      );
    }

    // 7. Actualizar el total en la cabecera de la venta
    await dbRun("UPDATE ventas SET total = ? WHERE id = ?", [totalCalculado, ventaId]);

    // 8. Finalizar la transacción
    await dbRun("COMMIT");

    return {
      ventaId,
      total: totalCalculado,
      mensaje: "Venta registrada exitosamente."
    };

  } catch (error) {
    // Si algo falla, revertir todo
    await dbRun("ROLLBACK");
    // Lanzar el error para que el controlador lo atrape
    throw error; 
  }
};

module.exports = { createSale };