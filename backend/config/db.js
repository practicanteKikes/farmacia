const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { app } = require("electron");

const userDataPath = app.getPath("userData");
const dbPath = path.join(userDataPath, "farmacia.db");

console.log("Ruta de la base de datos:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Error CRÍTICO al conectar con SQLite:", err.message);
  else console.log("✅ Conectado a la base de datos SQLite en:", dbPath);
});

// Función auxiliar para añadir una columna solo si no existe
function addColumnIfNotExists(tableName, columnName, columnDefinition) {
  db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
    if (err) return console.error(`Error al revisar la tabla ${tableName}:`, err.message);
    
    const columnExists = columns.some(col => col.name === columnName);
    
    if (!columnExists) {
      db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`, (err) => {
        if (err) console.error(`Error al añadir la columna ${columnName} a ${tableName}:`, err.message);
        else console.log(`✅ Columna ${columnName} añadida a la tabla ${tableName}.`);
      });
    }
  });
}

// Crear tablas y migraciones
db.serialize(() => {
  // Productos
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      codigo_barras TEXT UNIQUE,
      precio REAL NOT NULL,           -- 👈 Precio Venta (por UNIDAD)
      stock INTEGER DEFAULT 0,        -- 👈 Stock (total en UNIDADES)
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ventas (cabecera)
  db.run(`
    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL NOT NULL DEFAULT 0,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Detalle de ventas (items)
  db.run(`
    CREATE TABLE IF NOT EXISTS venta_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,      -- 👈 Cantidad de UNIDADES vendidas (ej. 1 o 30)
      precio_unitario REAL NOT NULL,  -- 👈 Precio al que se vendió (sea unidad o caja)
      costo_unitario REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (venta_id) REFERENCES ventas (id),
      FOREIGN KEY (producto_id) REFERENCES productos (id)
    )
  `);

  // Usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Índice
  db.run(`CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha)`);

  // --- MIGRACIONES ---
  // Añadimos las nuevas columnas a la tabla de productos si no existen
  
  // Costo (por UNIDAD, ej. pastilla)
  addColumnIfNotExists('productos', 'costo', 'REAL NOT NULL DEFAULT 0'); 
  
  // Unidades por Caja (Cuántas unidades trae el paquete de compra)
  addColumnIfNotExists('productos', 'unidades_por_caja', 'INTEGER NOT NULL DEFAULT 1');
  
  // Costo de la Caja (Lo que pagas al proveedor por el paquete)
  addColumnIfNotExists('productos', 'costo_caja', 'REAL NOT NULL DEFAULT 0');
  
  // ⭐️ NUEVA COLUMNA: Precio de Venta de la CAJA
  addColumnIfNotExists('productos', 'precio_caja', 'REAL NOT NULL DEFAULT 0');
});

module.exports = db;