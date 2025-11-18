import { renderProductosView } from './productosUI.js';
import { renderVentasView } from './ventasUI.js';
import { renderHistorialVentasView } from './historialVentasUI.js';
// 1. 👇 Importamos la nueva vista de Reportes
import { renderReportesView } from './reportesUI.js'; 

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  // 2. 👇 Agregamos el botón "Reportes" al menú HTML
  app.innerHTML = `
    <nav class="menu">
      <button id="btnVentas">💵 Punto de Venta</button>
      <button id="btnProductos">📦 Productos</button>
      <button id="btnHistorial">🧾 Historial</button>
      <button id="btnReportes">🏆 Reportes</button> 
    </nav>
    <section id="vista"></section>
  `;

  const vista = document.getElementById("vista");

  // --- Event Listeners ---

  document.getElementById("btnVentas").addEventListener("click", () => {
    renderVentasView(vista);
  });

  document.getElementById("btnProductos").addEventListener("click", () => {
    renderProductosView(vista);
  });
  
  document.getElementById("btnHistorial").addEventListener("click", () => {
    renderHistorialVentasView(vista);
  });

  // 3. 👇 Activamos el botón de Reportes
  document.getElementById("btnReportes").addEventListener("click", () => {
    renderReportesView(vista);
  });

  // Carga la vista de ventas por defecto al iniciar
  renderVentasView(vista); 
});