const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

// Routers
const productRouter = require("./routes/productRouter");
const ventaRouter = require("./routes/ventaRouter");

const app = express();
const PORT = 3000; // Puerto donde correrá el servidor

// Token fijo (local)
const FIXED_TOKEN = "mi-token-supersecreto";

app.use(cors());
app.use(bodyParser.json());

// Middleware de autenticación
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token !== FIXED_TOKEN) {
    return res.status(403).json({ error: "Token inválido o faltante" });
  }
  next();
}

// Rutas API (protegidas)
app.use("/api/productos", authenticateToken, productRouter);
app.use("/api/ventas", authenticateToken, ventaRouter);

// Ruta base para probar que el servidor vive
app.get('/', (req, res) => {
  res.send('Servidor Farmacia Activo');
});

// 👇 ESTO ERA LO QUE FALTABA: HACER QUE EL SERVIDOR ESCUCHE
if (require.main !== module) {
    // Si el archivo es importado por 'main.js' (Electron), iniciamos el servidor
    const server = app.listen(PORT, () => {
        console.log(`✅ Servidor Backend con Autenticación corriendo en http://localhost:${PORT}`);
    });
}

module.exports = app;