import { renderProductosView } from './productosUI.js';
import { renderVentasView } from './ventasUI.js';
import { renderHistorialVentasView } from './historialVentasUI.js';
import { renderLoginView } from './loginUI.js';
import { renderPerfilView } from './perfilUI.js';
import { showConfirm } from './utils/alerts.js';

// --- LÓGICA DE SESIÓN ---

function checkAuth() {
  // Verificamos si existe el token en la sesión temporal
  const token = sessionStorage.getItem('farmacia_token');
  return !!token;
}

function realizarLogout() {
  sessionStorage.removeItem('farmacia_token');
  sessionStorage.removeItem('farmacia_user');
  window.location.reload(); // Recargar para volver al login limpio
}

// --- INICIO DE LA APLICACIÓN (POST-LOGIN) ---

function initApp(appContainer) {
  const user = sessionStorage.getItem('farmacia_user') || 'Usuario';

  // 1. Dibujar la estructura base (Menú + Contenedor de Vistas)
  appContainer.innerHTML = `
    <div class="app-layout">
      <nav class="menu">
        <button id="btnVentas" class="active">🛒 Punto de Venta</button>
        <button id="btnProductos">📦 Productos</button>
        <!-- ⭐️ Botón Unificado -->
        <button id="btnHistorial">📊 Historial y Reportes</button>
        
        <div class="menu-spacer"></div>
        
        <button id="btnPerfil" style="color:#555;">⚙️ Perfil</button>
        <button id="btnLogout" style="color: #dc3545; font-weight: bold;">🚪 Salir (${user})</button>
      </nav>
      <section id="vista"></section>
    </div>
  `;

  // Estilos para el layout (Flexbox para empujar botones a la derecha)
  const style = document.createElement('style');
  style.innerHTML = `
    .menu-spacer { flex: 1; } 
    .app-layout { display: flex; flex-direction: column; height: 100vh; }
  `;
  appContainer.appendChild(style);

  const vista = document.getElementById("vista");
  
  // Helper para resaltar el botón activo
  const botones = document.querySelectorAll('.menu button:not(#btnLogout)');
  const activarBoton = (btnId) => {
    botones.forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('active');
  };

  // --- 2. ASIGNAR EVENTOS A LOS BOTONES ---

  document.getElementById("btnVentas").addEventListener("click", () => {
    activarBoton('btnVentas');
    renderVentasView(vista);
  });

  document.getElementById("btnProductos").addEventListener("click", () => {
    activarBoton('btnProductos');
    renderProductosView(vista);
  });
  
  // Este botón ahora carga la vista unificada (Historial + Top Ventas)
  document.getElementById("btnHistorial").addEventListener("click", () => {
    activarBoton('btnHistorial');
    renderHistorialVentasView(vista);
  });

  document.getElementById("btnPerfil").addEventListener("click", () => { 
    activarBoton('btnPerfil'); 
    renderPerfilView(vista); 
  });
  
  document.getElementById("btnLogout").addEventListener("click", async () => {
    const confirmacion = await showConfirm('¿Cerrar Sesión?', '¿Deseas salir del sistema?');
    if (confirmacion.isConfirmed) realizarLogout();
  });

  // 3. CARGA INICIAL POR DEFECTO
  activarBoton('btnVentas');
  renderVentasView(vista);
}

// --- PUNTO DE ENTRADA PRINCIPAL ---

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  if (checkAuth()) {
    // Si hay sesión activa, cargamos la app
    initApp(app);
  } else {
    // Si no, mostramos el Login
    renderLoginView(app, () => {
      // Callback: Se ejecuta cuando el login es exitoso
      initApp(app);
    });
  }
});