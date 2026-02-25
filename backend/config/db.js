const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { app } = require("electron");
const bcrypt = require("bcryptjs");

// 1. Configuración de la ruta
const userDataPath = app.getPath("userData");
const dbPath = path.join(userDataPath, "farmacia.db");

console.log("--- BASE DE DATOS ---");
console.log("Ruta:", dbPath);

// 2. Conexión
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Error CRÍTICO:", err.message);
  else console.log("✅ Conexión exitosa a SQLite");
});

// Función auxiliar para actualizaciones sin pérdida de datos
function addColumnIfNotExists(tableName, columnName, columnDefinition) {
  db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
    if (err) return;
    const exists = columns.some(col => col.name === columnName);
    if (!exists) {
      db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`, (err) => {
        if (!err) console.log(`✅ Columna '${columnName}' añadida.`);
      });
    }
  });
}

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

  // Ventas
  db.run(`
    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL NOT NULL DEFAULT 0,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Items de Venta
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
  
  // Usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'vendedor',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha)`);

  // --- MIGRACIONES (Todas las columnas nuevas) ---
  
  // 1. Configuración de CAJA
  addColumnIfNotExists('productos', 'unidades_por_caja', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfNotExists('productos', 'precio_caja', 'REAL NOT NULL DEFAULT 0'); 
  addColumnIfNotExists('productos', 'costo_caja', 'REAL NOT NULL DEFAULT 0');  
  
  // 2. Configuración de UNIDAD (Base)
  addColumnIfNotExists('productos', 'costo', 'REAL NOT NULL DEFAULT 0');

  // 3. Configuración de SOBRES (Nivel Intermedio)
  addColumnIfNotExists('productos', 'tiene_sobres', 'INTEGER NOT NULL DEFAULT 0'); // 0 = No, 1 = Sí
  addColumnIfNotExists('productos', 'sobres_por_caja', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfNotExists('productos', 'unidades_por_sobre', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfNotExists('productos', 'precio_sobre', 'REAL NOT NULL DEFAULT 0');
  addColumnIfNotExists('productos', 'costo_sobre', 'REAL NOT NULL DEFAULT 0');

  // 4. Histórico de ventas
  addColumnIfNotExists('venta_items', 'costo_unitario', 'REAL DEFAULT 0');

  // 5. Agregar rol a usuarios existentes
  addColumnIfNotExists('usuarios', 'role', 'TEXT DEFAULT \'vendedor\'');

  // 6. Fecha de vencimiento
  addColumnIfNotExists('productos', 'fecha_vencimiento', "TEXT DEFAULT NULL");

  // --- USUARIOS POR DEFECTO ---
  // Viviana (Administrador)
  db.get("SELECT * FROM usuarios WHERE username = ?", ['viviana'], (err, user) => {
    if (!err && !user) {
      console.log("ℹ️ Creando usuario 'viviana'...");
      const passwordHash = bcrypt.hashSync("viviana1234", 8);
      db.run("INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)", ["viviana", passwordHash, "admin"], (err) => {
        if (!err) console.log("✅ Usuario creado: viviana / viviana1234 [ADMIN]");
      });
    }
  });

  // Vendedora (Vendedor)
  db.get("SELECT * FROM usuarios WHERE username = ?", ['vendedora'], (err, user) => {
    if (!err && !user) {
      console.log("ℹ️ Creando usuario 'vendedora'...");
      const passwordHash = bcrypt.hashSync("vendedora1234", 8);
      db.run("INSERT INTO usuarios (username, password, role) VALUES (?, ?, ?)", ["vendedora", passwordHash, "vendedor"], (err) => {
        if (!err) console.log("✅ Usuario creado: vendedora / vendedora1234 [VENDEDOR]");
      });
    }
  });
});

module.exports = db;