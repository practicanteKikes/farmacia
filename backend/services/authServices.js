const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET_KEY = "supersecreto"; // ⚠️ cambiar a una variable de entorno

// Registrar usuario
const register = (username, password, callback) => {
  const hashedPassword = bcrypt.hashSync(password, 10);

  const sql = "INSERT INTO usuarios (username, password) VALUES (?, ?)";
  db.run(sql, [username, hashedPassword], function (err) {
    if (err) return callback(err);
    callback(null, { id: this.lastID, username });
  });
};

// Login usuario
const login = (username, password, callback) => {
  const sql = "SELECT * FROM usuarios WHERE username = ?";
  db.get(sql, [username], (err, row) => {
    if (err) return callback(err);
    if (!row) return callback(new Error("Usuario no encontrado"));

    const passwordMatch = bcrypt.compareSync(password, row.password);
    if (!passwordMatch) return callback(new Error("Contraseña incorrecta"));

    // Generar token
    const token = jwt.sign(
      { id: row.id, username: row.username },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    callback(null, { token });
  });
};

module.exports = { register, login };
