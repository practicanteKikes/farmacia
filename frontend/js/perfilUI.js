import { updateProfileApi } from '../api.js';
import { showSuccess, showError } from './utils/alerts.js';

export function renderPerfilView(container) {
  // Obtenemos el usuario actual para mostrarlo en el campo (si existe)
  const currentUser = localStorage.getItem('farmacia_user') || '';

  container.innerHTML = `
    <div class="historial-header">
      <h2>⚙️ Mi Perfil</h2>
    </div>

    <div class="perfil-container">
      <div class="perfil-card">
        <h3>Editar Datos de Cuenta</h3>
        <p style="color:#666; margin-bottom:20px;">Deja en blanco los campos que no quieras cambiar.</p>
        
        <form id="form-perfil">
          
          <!-- Usuario -->
          <div class="form-group">
            <label>Nombre de Usuario</label>
            <input type="text" id="perfil-user" value="${currentUser}" placeholder="Usuario">
          </div>

          <hr style="margin: 20px 0; border:0; border-top:1px solid #eee;">

          <!-- Contraseña -->
          <div class="form-group">
            <label>Nueva Contraseña (Opcional)</label>
            <input type="password" id="perfil-new-pass" placeholder="****">
          </div>
          
          <div class="form-group">
            <label>Confirmar Nueva Contraseña</label>
            <input type="password" id="perfil-confirm-pass" placeholder="****">
          </div>

          <hr style="margin: 20px 0; border:0; border-top:1px solid #eee;">

          <!-- Confirmación (Obligatorio) -->
          <div class="form-group" style="background:#fff3cd; padding:10px; border-radius:5px; border:1px solid #ffeeba;">
            <label style="color:#856404; font-weight:bold;">🔒 Contraseña ACTUAL (Requerido)</label>
            <input type="password" id="perfil-current-pass" placeholder="Ingresa tu contraseña actual para guardar">
          </div>

          <button type="submit" class="btn-primario" style="width:100%; margin-top:10px;">Guardar Cambios</button>
        </form>
      </div>
    </div>
  `;

  // Estilos locales para esta vista
  const style = document.createElement('style');
  style.innerHTML = `
    .perfil-container { display: flex; justify-content: center; margin-top: 20px; }
    .perfil-card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 100%; max-width: 500px; }
    .form-group { margin-bottom: 15px; text-align: left; }
    .form-group label { display: block; font-weight: 500; margin-bottom: 5px; color: #333; }
    .form-group input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem; box-sizing: border-box; }
  `;
  container.appendChild(style);

  // Evento Submit del formulario
  document.getElementById('form-perfil').addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('perfil-current-pass').value;
    const newUsername = document.getElementById('perfil-user').value;
    const newPassword = document.getElementById('perfil-new-pass').value;
    const confirmPassword = document.getElementById('perfil-confirm-pass').value;

    // Validaciones del lado del cliente
    if (!currentPassword) {
      return showError('Debes ingresar tu contraseña actual para guardar los cambios.');
    }

    if (newPassword && newPassword !== confirmPassword) {
      return showError('Las nuevas contraseñas no coinciden.');
    }

    try {
      // Enviamos los datos a la API
      const result = await updateProfileApi({
        currentPassword,
        newUsername,
        newPassword
      });

      showSuccess(result.message);
      
      // ⭐️ LÓGICA DE RENOVACIÓN DE SESIÓN ⭐️
      // Si el servidor nos devuelve un nuevo token (significa que cambiamos usuario o pass)
      // lo guardamos inmediatamente para no perder la sesión.
      if (result.token) {
        localStorage.setItem('farmacia_token', result.token);
        localStorage.setItem('farmacia_user', result.username);
        
        // Actualizar visualmente el nombre si cambió
        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) btnLogout.textContent = `🚪 Salir (${result.username})`;

        // Recargar la página brevemente para asegurar que todo el sistema use la nueva sesión
        setTimeout(() => {
            window.location.reload();
        }, 1500);
      } else if (result.newUsername) {
        // Fallback por si solo cambió el nombre sin token nuevo (aunque el backend ahora siempre manda token)
        localStorage.setItem('farmacia_user', result.newUsername);
      }

      // Limpiar campos de contraseña por seguridad
      document.getElementById('perfil-current-pass').value = '';
      document.getElementById('perfil-new-pass').value = '';
      document.getElementById('perfil-confirm-pass').value = '';

    } catch (error) {
      showError(error.message);
    }
  });
}