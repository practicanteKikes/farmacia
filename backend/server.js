const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");

const productRouter = require("./routes/productRouter");
const ventaRouter = require("./routes/ventaRouter");
const authRouter = require("./routes/authRouter");
// ⭐️ 1. Importamos el controlador de Auth para usar su función de perfil
const authController = require("./controllers/authController");

const app = express();
const PORT = 3000;
const SECRET_KEY = "farmacia_secreta_key"; 

app.use(cors());
app.use(bodyParser.json());

// Middleware de seguridad
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(403).json({ error: "Acceso denegado: No hay token." });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Sesión inválida o expirada." });
    }
    req.userId = decoded.id;
    next();
  });
}

// Rutas Públicas
app.use("/api/auth", authRouter);

// Rutas Protegidas (Productos y Ventas)
app.use("/api/productos", verifyToken, productRouter);
app.use("/api/ventas", verifyToken, ventaRouter);

// ⭐️ 2. NUEVA RUTA: Actualizar Perfil (PUT /api/profile)
// Esta es la línea que faltaba y causaba el error
app.put("/api/profile", verifyToken, authController.updateProfile);

// 🔧 Endpoint de debug para verificar token
app.get("/api/debug/me", verifyToken, (req, res) => {
  const db = require("./config/db");
  db.get("SELECT id, username, role FROM usuarios WHERE id = ?", [req.userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ userId: req.userId, user });
  });
});

app.get('/', (req, res) => {
  res.send('Servidor Farmacia Activo 🔒');
});

if (require.main !== module) {
    app.listen(PORT, () => {
        console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    });
}

module.exports = app;