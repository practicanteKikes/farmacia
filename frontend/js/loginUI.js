import { showSuccess, showError } from './utils/alerts.js';

// Función para hacer la petición de login al backend
async function loginApi(username, password) {
  // Nota: Usamos localhost:3000 directo o la URL base que tengas configurada
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Error al iniciar sesión');
  }
  
  return data;
}

/**
 * Renderiza la pantalla de Login
 * @param {HTMLElement} container - Donde se dibujará el login
 * @param {Function} onLoginSuccess - Función que se ejecuta cuando el login es exitoso (para cargar la app)
 */
export function renderLoginView(container, onLoginSuccess) {
  container.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-header">
          <h2>🔐 Acceso Farmacia</h2>
          <p>Ingresa tus credenciales</p>
        </div>
        
        <form id="login-form">
          <div class="form-group">
            <label for="login-user">Usuario</label>
            <input type="text" id="login-user" placeholder="Ej: admin" autofocus autocomplete="username">
          </div>
          
          <div class="form-group">
            <label for="login-pass">Contraseña</label>
            <input type="password" id="login-pass" placeholder="****" autocomplete="current-password">
          </div>

          <button type="submit" class="btn-primary btn-block">Ingresar</button>
        </form>
      </div>
    </div>
  `;

  // Estilos específicos para el Login (Incrustados para no romper tu CSS principal)
  const style = document.createElement('style');
  style.innerHTML = `
    .login-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 80vh; /* Centrado vertical */
      width: 100%;
      background-color: #f4f6f8;
    }
    .login-card {
      background: white;
      padding: 2.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      width: 100%;
      max-width: 380px;
      text-align: center;
    }
    .login-header h2 {
      color: var(--primary-color, #007bff);
      margin-bottom: 0.5rem;
    }
    .login-header p {
      color: #6c757d;
      margin-bottom: 2rem;
      font-size: 0.95rem;
    }
    .form-group {
      margin-bottom: 1.5rem;
      text-align: left;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      font-size: 0.9rem;
      color: #333;
    }
    .form-group input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ced4da;
      border-radius: 6px;
      font-size: 1rem;
      box-sizing: border-box; /* Importante para que el padding no rompa el ancho */
      transition: border-color 0.2s;
    }
    .form-group input:focus {
      border-color: var(--primary-color, #007bff);
      outline: none;
    }
    .btn-block {
      width: 100%;
      padding: 14px;
      font-size: 1rem;
      margin-top: 10px;
    }
  `;
  container.appendChild(style);

  // Manejar el envío del formulario
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userInput = document.getElementById('login-user');
    const passInput = document.getElementById('login-pass');
    const btnSubmit = form.querySelector('button');
    
    const username = userInput.value.trim();
    const password = passInput.value.trim();

    if (!username || !password) {
      return showError('Por favor, completa usuario y contraseña.');
    }

    // Feedback visual de carga
    const textoOriginal = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Verificando...';

    try {
      const result = await loginApi(username, password);
      
      // GUARDAR SESIÓN: Esto es lo más importante
      localStorage.setItem('farmacia_token', result.token);
      localStorage.setItem('farmacia_user', result.username);
      
      showSuccess(`¡Bienvenido, ${result.username}!`);
      
      // Llamamos a la función que nos pasó app.js para avisar que ya entramos
      if (onLoginSuccess) onLoginSuccess();
      
    } catch (error) {
      showError(error.message);
      btnSubmit.disabled = false;
      btnSubmit.textContent = textoOriginal;
      passInput.value = ''; // Limpiar contraseña si falla
      passInput.focus();
    }
  });
}