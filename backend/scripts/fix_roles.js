// Script para corregir roles en la BD: asegurar que 'viviana' sea admin
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'farmacia-app');
const dbPath = path.join(userDataPath, 'farmacia.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('No se pudo abrir la BD:', err.message || err);
    process.exit(1);
  }

  db.run("UPDATE usuarios SET role = 'admin' WHERE username = ?", ['viviana'], function(err) {
    if (err) {
      console.error('Error al actualizar rol:', err.message || err);
      process.exit(1);
    }
    console.log(`✅ Rol actualizado. Filas afectadas: ${this.changes}`);
    db.close(() => process.exit(0));
  });
});
