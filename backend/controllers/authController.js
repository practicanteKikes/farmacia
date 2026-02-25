const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../config/db");

// 🔐 CLAVE SECRETA (Debe coincidir con la del server.js)
const SECRET_KEY = "farmacia_secreta_key"; 

// --- FUNCIÓN DE LOGIN ---
exports.login = (req, res) => {
  const { username, password } = req.body;

  // 1. Validar datos
  if (!username || !password) {
    return res.status(400).json({ error: "Usuario y contraseña requeridos" });
  }

  // 2. Buscar usuario
  db.get("SELECT * FROM usuarios WHERE username = ?", [username], (err, user) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });
    
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // 3. Verificar contraseña
    const passwordIsValid = bcrypt.compareSync(password, user.password);

    if (!passwordIsValid) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // 4. Generar Token
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, {
      expiresIn: 86400 // 24 horas
    });

    res.status(200).json({ auth: true, token: token, username: user.username, role: user.role });
  });
};

// --- FUNCIÓN DE ACTUALIZAR PERFIL ---
exports.updateProfile = (req, res) => {
  const userId = req.userId; // Este ID viene del middleware (token)
  const { currentPassword, newUsername, newPassword } = req.body;

  // Seguridad: Siempre pedir la contraseña actual para autorizar cambios
  if (!currentPassword) {
    return res.status(400).json({ error: "Debes ingresar tu contraseña actual para confirmar cambios." });
  }

  // 1. Buscar el usuario actual en la BD
  db.get("SELECT * FROM usuarios WHERE id = ?", [userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    // 2. Verificar que la contraseña actual sea correcta
    const passwordIsValid = bcrypt.compareSync(currentPassword, user.password);
    if (!passwordIsValid) {
      return res.status(401).json({ error: "La contraseña actual es incorrecta." });
    }

    // Función auxiliar para ejecutar la actualización final
    const executeUpdate = () => {
      let sql = "UPDATE usuarios SET ";
      let params = [];
      let updates = [];
      
      // Determinamos el nombre final para el token
      let finalUsername = user.username;

      // Si el usuario escribió un nuevo nombre
      if (newUsername && newUsername.trim() !== "") {
        updates.push("username = ?");
        params.push(newUsername.trim());
        finalUsername = newUsername.trim();
      }
      
      // Si el usuario escribió una nueva contraseña
      if (newPassword && newPassword.trim() !== "") {
        // Encriptamos la nueva contraseña antes de guardarla
        const hash = bcrypt.hashSync(newPassword, 8);
        updates.push("password = ?");
        params.push(hash);
      }

      // Si no escribió nada nuevo
      if (updates.length === 0) {
        return res.status(200).json({ message: "No se realizaron cambios." });
      }

      sql += updates.join(", ") + " WHERE id = ?";
      params.push(userId);

      // Ejecutar el UPDATE
      db.run(sql, params, function(errUpdate) {
        if (errUpdate) {
          console.error(errUpdate);
          return res.status(500).json({ error: "Error al actualizar la base de datos." });
        }
        
        // ⭐️ Generar un NUEVO TOKEN con la información actualizada
        // Esto hace que la sesión se renueve "como si iniciaras sesión de nuevo"
        const newToken = jwt.sign({ id: userId, username: finalUsername }, SECRET_KEY, {
          expiresIn: 86400
        });
        
        res.json({ 
          message: "Perfil actualizado correctamente.", 
          token: newToken, // Devolvemos el token nuevo
          username: finalUsername, // Devolvemos el usuario nuevo
          newUsername: finalUsername // Compatibilidad
        });
      });
    };

    // 3. Validación extra: Si quiere cambiar el nombre, verificar que no esté ocupado
    if (newUsername && newUsername !== user.username) {
      db.get("SELECT id FROM usuarios WHERE username = ? AND id != ?", [newUsername, userId], (err2, existingUser) => {
        if (existingUser) {
          return res.status(400).json({ error: "Ese nombre de usuario ya está en uso." });
        }
        // Si está libre, procedemos
        executeUpdate();
      });
    } else {
      // Si no cambia el nombre (o es el mismo), procedemos directo
      executeUpdate();
    }
  });
};