const db = require("../config/db");

// Función maestra para procesar y calcular costos
function procesarDatosProducto(p) {
  // 1. Detectar si usa sobres (checkbox)
  const tiene_sobres = p.tiene_sobres ? 1 : 0;
  
  // 2. Normalizar números para evitar errores
  let unidades_por_caja = Math.max(1, Number(p.unidades_por_caja) || 1);
  let sobres_por_caja = Number(p.sobres_por_caja) || 0;
  let unidades_por_sobre = Number(p.unidades_por_sobre) || 0;
  const costo_caja = Number(p.costo_caja) || 0;

  // 3. Cálculos de Costos Unitarios
  let costo_sobre = 0;
  let costo_unidad = 0;

  if (tiene_sobres) {
    // Lógica de 3 Niveles: Caja -> Sobre -> Unidad
    // Evitamos división por cero
    if (sobres_por_caja < 1) sobres_por_caja = 1;
    if (unidades_por_sobre < 1) unidades_por_sobre = 1;

    // Calculamos el costo proporcional de cada nivel
    costo_sobre = costo_caja / sobres_por_caja;
    costo_unidad = costo_sobre / unidades_por_sobre;

    // Aseguramos que 'unidades_por_caja' sea el total real de pastillas
    // (Ej: 10 sobres * 2 pastillas = 20 pastillas totales)
    unidades_por_caja = sobres_por_caja * unidades_por_sobre;

  } else {
    // Lógica de 2 Niveles (Normal): Caja -> Unidad
    if (unidades_por_caja < 1) unidades_por_caja = 1;
    costo_unidad = costo_caja / unidades_por_caja;
  }

  // 4. Stock Total (Siempre se guarda en Unidades Mínimas)
  const stock_total = Number(p.stock) || 0;

  return {
    nombre: p.nombre,
    codigo_barras: p.codigo_barras,
    
    // Precios de Venta
    precio: Number(p.precio) || 0,             // Precio Unidad
    precio_caja: Number(p.precio_caja) || 0,   // Precio Caja
    precio_sobre: Number(p.precio_sobre) || 0, // Precio Sobre
    
    // Configuración de Empaque
    tiene_sobres: tiene_sobres,
    unidades_por_caja: unidades_por_caja, // Total de unidades en la caja
    sobres_por_caja: sobres_por_caja,
    unidades_por_sobre: unidades_por_sobre,

    // Costos Calculados
    costo_caja: costo_caja,
    costo_sobre: costo_sobre,
    costo: costo_unidad, // Costo de la unidad mínima (para cierre de caja)

    stock: stock_total
  };
}

const getAllProducts = () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM productos ORDER BY nombre ASC", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const addProduct = (data) => {
  return new Promise((resolve, reject) => {
    const p = procesarDatosProducto(data);
    
    const query = `
      INSERT INTO productos 
      (nombre, codigo_barras, precio, precio_caja, precio_sobre, stock, costo, costo_caja, costo_sobre, tiene_sobres, unidades_por_caja, sobres_por_caja, unidades_por_sobre) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      p.nombre, p.codigo_barras, p.precio, p.precio_caja, p.precio_sobre, p.stock, 
      p.costo, p.costo_caja, p.costo_sobre, p.tiene_sobres, p.unidades_por_caja, 
      p.sobres_por_caja, p.unidades_por_sobre
    ];

    db.run(query, params, function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) return reject({ code: "DUPLICATE", message: "El código de barras ya existe." });
        return reject(err);
      }
      resolve({ id: this.lastID, ...p });
    });
  });
};

const updateProduct = (id, data) => {
  return new Promise((resolve, reject) => {
    const p = procesarDatosProducto(data);
    
    const query = `
      UPDATE productos SET 
      nombre=?, codigo_barras=?, precio=?, precio_caja=?, precio_sobre=?, stock=?, 
      costo=?, costo_caja=?, costo_sobre=?, tiene_sobres=?, unidades_por_caja=?, 
      sobres_por_caja=?, unidades_por_sobre=?
      WHERE id=?
    `;
    
    const params = [
      p.nombre, p.codigo_barras, p.precio, p.precio_caja, p.precio_sobre, p.stock, 
      p.costo, p.costo_caja, p.costo_sobre, p.tiene_sobres, p.unidades_por_caja, 
      p.sobres_por_caja, p.unidades_por_sobre, id
    ];

    db.run(query, params, function(err) {
      if (err) return reject(err);
      resolve({ id, ...p });
    });
  });
};

const deleteProduct = (id) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM productos WHERE id = ?", [id], function(err) {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

module.exports = { getAllProducts, addProduct, updateProduct, deleteProduct };