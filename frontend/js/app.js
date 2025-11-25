import { renderProductosView } from './productosUI.js';
import { renderVentasView } from './ventasUI.js';
import { renderHistorialVentasView } from './historialVentasUI.js';
import { renderReportesView } from './reportesUI.js';
import { renderLoginView } from './loginUI.js';
import { renderPerfilView } from './perfilUI.js'; // Importar Perfil
import { showConfirm } from './utils/alerts.js';

// Función para verificar si hay sesión activa
function checkAuth() {
  const token = localStorage.getItem('farmacia_token');
  return !!token; // Devuelve true si existe, false si no
}

// Función para cerrar sesión (Acción real)
function realizarLogout() {
  localStorage.removeItem('farmacia_token');
  localStorage.removeItem('farmacia_user');
  window.location.reload(); // Recargar para volver al login
}

// Función para iniciar la Interfaz Principal (Solo si está logueado)
function initApp(appContainer) {
  const user = localStorage.getItem('farmacia_user') || 'Usuario';

  // Dibujamos el menú y el contenedor
  appContainer.innerHTML = `
    <div class="app-layout">
      <nav class="menu">
        <button id="btnVentas" class="active">🛒 Punto de Venta</button>
        <button id="btnProductos">💊 Productos</button>
        <button id="btnHistorial">📅 Historial</button>
        <button id="btnReportes">🏆 Reportes</button>
        
        <div class="menu-spacer"></div>
        
        <!-- Botón Perfil -->
        <button id="btnPerfil" style="color:#555;">⚙️ Perfil</button>
        <button id="btnLogout" style="color: #dc3545; font-weight: bold;">🚪 Salir (${user})</button>
      </nav>
      <section id="vista"></section>
    </div>
  `;

  // Estilos layout
  const style = document.createElement('style');
  style.innerHTML = `
    .menu-spacer { flex: 1; } 
    .app-layout { display: flex; flex-direction: column; height: 100vh; }
  `;
  appContainer.appendChild(style);

  const vista = document.getElementById("vista");

  // --- Asignar Eventos del Menú ---
  
  const botones = document.querySelectorAll('.menu button:not(#btnLogout)');
  
  const activarBoton = (btnId) => {
    botones.forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('active');
  };

  document.getElementById("btnVentas").addEventListener("click", () => {
    activarBoton('btnVentas');
    renderVentasView(vista);
  });

  document.getElementById("btnProductos").addEventListener("click", () => {
    activarBoton('btnProductos');
    renderProductosView(vista);
  });
  
  document.getElementById("btnHistorial").addEventListener("click", () => {
    activarBoton('btnHistorial');
    renderHistorialVentasView(vista);
  });

  document.getElementById("btnReportes").addEventListener("click", () => {
    activarBoton('btnReportes');
    renderReportesView(vista);
  });

  // Evento Perfil
  document.getElementById("btnPerfil").addEventListener("click", () => { 
    activarBoton('btnPerfil'); 
    renderPerfilView(vista); 
  });
  
  // Lógica para el botón Salir con SweetAlert
  document.getElementById("btnLogout").addEventListener("click", async () => {
    const confirmacion = await showConfirm(
      '¿Cerrar Sesión?', 
      '¿Estás seguro de que deseas salir del sistema?'
    );
    
    if (confirmacion.isConfirmed) {
      realizarLogout();
    }
  });

  // Carga inicial por defecto (Punto de Venta)
  activarBoton('btnVentas');
  renderVentasView(vista);
}

// --- PUNTO DE ENTRADA ---
document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  if (checkAuth()) {
    // Si ya hay token guardado, entramos directo
    initApp(app);
  } else {
    // Si no, mostramos el Login
    renderLoginView(app, () => {
      // Esta función se ejecuta CUANDO el login es exitoso
      initApp(app);
    });
  }
});