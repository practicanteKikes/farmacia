const db = require("../config/db");

// Middleware para verificar rol (asume que verifyToken ya fue aplicado)
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    // El userId ya debe estar en req gracias a verifyToken
    if (!req.userId) {
      return res.status(403).json({ error: "Token requerido" });
    }

    // Buscar usuario para obtener su rol
    db.get("SELECT * FROM usuarios WHERE id = ?", [req.userId], (err, user) => {
      if (err || !user) {
        console.error(`❌ Usuario no encontrado (ID: ${req.userId})`);
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      console.log(`🔍 Verificando acceso: ${user.username} (${user.role}) a ${allowedRoles.join("|")}`);

      // Verificar si el rol está permitido
      if (!allowedRoles.includes(user.role)) {
        console.error(`❌ Acceso denegado a ${user.username}: necesita [${allowedRoles.join(", ")}], tiene [${user.role}]`);
        return res.status(403).json({ 
          error: `Acceso denegado. Se requiere rol: ${allowedRoles.join(" o ")}` 
        });
      }

      console.log(`✅ Acceso permitido para ${user.username}`);
      req.user = { id: user.id, username: user.username, role: user.role };
      next();
    });
  };
};

module.exports = authorizeRole;
