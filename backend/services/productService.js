const db = require("../config/db");

// Función para procesar los datos antes de guardar
function procesarDatosProducto(producto) {
  // Aseguramos que los números sean válidos
  const unidades_por_caja = Math.max(1, Number(producto.unidades_por_caja) || 1);
  const costo_caja = Number(producto.costo_caja) || 0;
  
  // 1. Costo Unitario: Necesario para el sistema (Cierre de Caja), 
  // aunque tú solo manejes el costo de la caja.
  const costo_unitario = costo_caja / unidades_por_caja;

  // 2. Stock: Guardamos DIRECTAMENTE el número que tú pones (Total de Unidades)
  const stock_total = Number(producto.stock) || 0;

  return {
    nombre: producto.nombre,
    codigo_barras: producto.codigo_barras,
    // Precios de Venta (Tú los defines)
    precio: Number(producto.precio) || 0,           // Precio Venta (Unidad)
    precio_caja: Number(producto.precio_caja) || 0, // Precio Venta (Caja)
    // Stock (Tú lo defines)
    stock: stock_total,
    // Costos
    costo: costo_unitario,                          // Costo (Unidad) - Calculado internamente
    unidades_por_caja: unidades_por_caja,           // Unidades por paquete
    costo_caja: costo_caja                          // Costo (Paquete)
  };
}

const getAllProducts = () => {
  return new Promise((resolve, reject) => {
    // Traemos todas las columnas, incluyendo los precios de caja
    db.all("SELECT * FROM productos ORDER BY nombre ASC", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const addProduct = (productoData) => {
  return new Promise((resolve, reject) => {
    
    const p = procesarDatosProducto(productoData);

    const query = `
      INSERT INTO productos 
      (nombre, codigo_barras, precio, precio_caja, stock, costo, unidades_por_caja, costo_caja) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [p.nombre, p.codigo_barras, p.precio, p.precio_caja, p.stock, p.costo, p.unidades_por_caja, p.costo_caja];

    db.run(query, params, function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return reject({ code: "DUPLICATE_CODE", message: "El producto con este código de barras ya existe." });
        }
        return reject(err);
      }
      resolve({ id: this.lastID, ...p });
    });
  });
};

const updateProduct = (id, productoData) => {
  return new Promise((resolve, reject) => {
    
    const p = procesarDatosProducto(productoData);

    const query = `
      UPDATE productos SET 
      nombre = ?, codigo_barras = ?, precio = ?, precio_caja = ?, stock = ?, 
      costo = ?, unidades_por_caja = ?, costo_caja = ? 
      WHERE id = ?
    `;
    
    const params = [p.nombre, p.codigo_barras, p.precio, p.precio_caja, p.stock, p.costo, p.unidades_por_caja, p.costo_caja, id];

    db.run(query, params, function(err) {
      if (err) return reject(err);
      if (this.changes === 0) return resolve(null);
      resolve({ id, ...p });
    });
  });
};

const deleteProduct = (id) => {
    return new Promise((resolve, reject) => {
        const query = `DELETE FROM productos WHERE id = ?`;
        db.run(query, [id], function(err) {
            if (err) return reject(err);
            if (this.changes === 0) return resolve(null);
            resolve(true);
        });
    });
};

module.exports = { getAllProducts, addProduct, updateProduct, deleteProduct };