// Script para insertar productos de ejemplo en la base de datos
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const os = require("os");

// Ruta de usuario estándar de Windows
const userDataPath = path.join(os.homedir(), "AppData", "Roaming", "farmacia-app");
const dbPath = path.join(userDataPath, "farmacia.db");

console.log("📁 BD en:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error al conectar:", err);
    process.exit(1);
  }
  console.log("✅ Conectado a la BD");
});

// Productos de ejemplo para farmacia
const productos = [
  {
    nombre: "Aspirina 500mg",
    codigo_barras: "ASP001",
    stock: 100,
    precio: 2.50,
    precio_caja: 24.00,
    precio_sobre: 0,
    costo: 0.80,
    costo_caja: 8.00,
    unidades_por_caja: 10,
    sobres_por_caja: 0,
    unidades_por_sobre: 0,
    tiene_sobres: 0
  },
  {
    nombre: "Ibupirac 200mg",
    codigo_barras: "IBU001",
    stock: 150,
    precio: 3.00,
    precio_caja: 30.00,
    precio_sobre: 0,
    costo: 1.00,
    costo_caja: 10.00,
    unidades_por_caja: 10,
    sobres_por_caja: 0,
    unidades_por_sobre: 0,
    tiene_sobres: 0
  },
  {
    nombre: "Paracetamol 500mg",
    codigo_barras: "PAR001",
    stock: 200,
    precio: 2.00,
    precio_caja: 20.00,
    precio_sobre: 0,
    costo: 0.60,
    costo_caja: 6.00,
    unidades_por_caja: 10,
    sobres_por_caja: 0,
    unidades_por_sobre: 0,
    tiene_sobres: 0
  },
  {
    nombre: "Vitamina C 1000mg",
    codigo_barras: "VIT001",
    stock: 80,
    precio: 4.50,
    precio_caja: 45.00,
    precio_sobre: 0,
    costo: 1.50,
    costo_caja: 15.00,
    unidades_por_caja: 10,
    sobres_por_caja: 0,
    unidades_por_sobre: 0,
    tiene_sobres: 0
  }
];

db.serialize(() => {
  productos.forEach((p) => {
    const sql = `
      INSERT OR IGNORE INTO productos 
      (nombre, codigo_barras, stock, precio, precio_caja, precio_sobre, 
       costo, costo_caja, unidades_por_caja, sobres_por_caja, unidades_por_sobre, tiene_sobres)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [
      p.nombre, p.codigo_barras, p.stock, p.precio, p.precio_caja, p.precio_sobre,
      p.costo, p.costo_caja, p.unidades_por_caja, p.sobres_por_caja, p.unidades_por_sobre, p.tiene_sobres
    ], (err) => {
      if (err) console.error("Error:", err);
      else console.log(`✅ Producto insertado: ${p.nombre}`);
    });
  });
});

db.close(() => {
  console.log("✅ Base de datos cerrada");
  process.exit(0);
});
