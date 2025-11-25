const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { app } = require("electron");
const bcrypt = require("bcryptjs");

// 1. Configuración de la ruta de la base de datos
const userDataPath = app.getPath("userData");
const dbPath = path.join(userDataPath, "farmacia.db");

console.log("--- BASE DE DATOS ---");
console.log("Ruta:", dbPath);

// 2. Conexión a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Error CRÍTICO de conexión a SQLite:", err.message);
  } else {
    console.log("✅ Conexión exitosa a SQLite");
  }
});

// Función auxiliar para añadir columnas si no existen (Migraciones seguras)
function addColumnIfNotExists(tableName, columnName, columnDefinition) {
  db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
    if (err) {
      console.error(`Error revisando tabla ${tableName}:`, err.message);
      return;
    }
    const exists = columns.some(col => col.name === columnName);
    if (!exists) {
      db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`, (err) => {
        if (err) console.error(`Error añadiendo columna ${columnName}:`, err.message);
        else console.log(`✅ Columna '${columnName}' añadida a tabla '${tableName}'`);
      });
    }
  });
}

// 3. Inicialización de Tablas y Datos
db.serialize(() => {
  // --- CREACIÓN DE TABLAS ---
  
  // Productos
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

  // Ventas (Cabecera)
  db.run(`
    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL NOT NULL DEFAULT 0,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Items de Venta (Detalle)
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
  
  // Usuarios (Login)
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Índices para rendimiento
  db.run(`CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha)`);

  // --- MIGRACIONES (Nuevas columnas) ---
  // Aseguramos que la BD tenga los campos para Cajas y Costos
  addColumnIfNotExists('productos', 'unidades_por_caja', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfNotExists('productos', 'precio_caja', 'REAL NOT NULL DEFAULT 0'); 
  addColumnIfNotExists('productos', 'costo_caja', 'REAL NOT NULL DEFAULT 0');  
  addColumnIfNotExists('productos', 'costo', 'REAL NOT NULL DEFAULT 0');
  addColumnIfNotExists('venta_items', 'costo_unitario', 'REAL DEFAULT 0');

  // --- ⭐️ CREACIÓN DE USUARIO VIVIANA (Lógica Corregida) ---
  
  // Verificamos específicamente si 'viviana' existe
  db.get("SELECT * FROM usuarios WHERE username = ?", ['viviana'], (err, user) => {
    if (err) return console.error(err);
    
    if (!user) {
      console.log("ℹ️ Usuario 'viviana' no encontrado. Creándolo...");
      const passwordHash = bcrypt.hashSync("viviana1234", 8);
      
      db.run("INSERT INTO usuarios (username, password) VALUES (?, ?)", ["viviana", passwordHash], (err) => {
        if (err) console.error("Error creando viviana:", err);
        else console.log("✅ Usuario creado exitosamente: viviana / viviana1234");
      });
    } else {
      console.log("ℹ️ El usuario 'viviana' ya existe.");
    }
  });
});

// 4. EXPORTACIÓN FINAL
module.exports = db;