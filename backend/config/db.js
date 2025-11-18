const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { app } = require("electron");

// Obtener ruta de datos segura
const userDataPath = app.getPath("userData");
const dbPath = path.join(userDataPath, "farmacia.db");

console.log("Ruta de la base de datos:", dbPath);

// Crear la conexión
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Error CRÍTICO al conectar con SQLite:", err.message);
  } else {
    console.log("✅ Conectado a la base de datos SQLite en:", dbPath);
  }
});

// Función auxiliar
function addColumnIfNotExists(tableName, columnName, columnDefinition) {
  db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
    if (err) return console.error(`Error al revisar tabla ${tableName}:`, err.message);
    const exists = columns.some(col => col.name === columnName);
    if (!exists) {
      db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`, (err) => {
        if (err) console.error(`Error añadiendo ${columnName}:`, err.message);
        else console.log(`✅ Columna ${columnName} añadida.`);
      });
    }
  });
}

// Inicializar tablas y migraciones
db.serialize(() => {
  // 1. Productos
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      codigo_barras TEXT UNIQUE,
      stock INTEGER DEFAULT 0,
      precio REAL NOT NULL,
      costo REAL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Ventas
  db.run(`
    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL NOT NULL DEFAULT 0,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Items de Venta
  db.run(`
    CREATE TABLE IF NOT EXISTS venta_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL,
      costo_unitario REAL DEFAULT 0,
      FOREIGN KEY (venta_id) REFERENCES ventas (id),
      FOREIGN KEY (producto_id) REFERENCES productos (id)
    )
  `);

  // 4. Usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha)`);

  // --- MIGRACIONES (Nuevas Columnas) ---
  addColumnIfNotExists('productos', 'unidades_por_caja', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfNotExists('productos', 'precio_caja', 'REAL NOT NULL DEFAULT 0'); 
  addColumnIfNotExists('productos', 'costo_caja', 'REAL NOT NULL DEFAULT 0');  
  addColumnIfNotExists('productos', 'costo', 'REAL NOT NULL DEFAULT 0');
  addColumnIfNotExists('venta_items', 'costo_unitario', 'REAL DEFAULT 0');
});

// ⭐️ ESTA LÍNEA ES LA MÁS IMPORTANTE. SIN ELLA, APARECE EL ERROR "db.all is not a function"
module.exports = db;