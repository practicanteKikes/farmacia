// Importamos las NUEVAS funciones de la API
import { getVentasApi, getCierreDiarioApi, getVentasPorDiaApi } from '../api.js';
import { showError } from './utils/alerts.js';

// --- NUEVA FUNCIÓN ---
// Función para obtener la fecha de hoy en formato YYYY-MM-DD (ajustada a -5 horas)
function getFechaHoyLocal() {
  const ahora = new Date();
  ahora.setHours(ahora.getHours() - 5);
  return ahora.toISOString().split('T')[0];
}

/**
 * Renderiza la vista del historial de ventas (Ahora con Cierre Diario).
 * @param {HTMLElement} container - El elemento donde se dibujará la vista.
 */
export async function renderHistorialVentasView(container) {
  
  const fechaHoy = getFechaHoyLocal();

  // 1. DIBUJAR LA ESTRUCTURA HTML INICIAL
  container.innerHTML = `
    <div class="historial-header">
      <h2>Historial y Cierre de Caja</h2>
    </div>

    <!-- Sección del Cierre Diario -->
    <div class="cierre-diario-controles">
      <div class="control-grupo">
        <label for="fecha-consulta">Consultar Cierre Diario:</label>
        <!-- 💡 MEJORA: El calendario ya no tiene un valor por defecto, pero sí un máximo -->
        <input type="date" id="fecha-consulta" max="${fechaHoy}">
      </div>
      <button id="btn-consultar-dia" class="btn-primario">Consultar Día</button>
      <button id="btn-consultar-mes" class="btn-secundario">Ver Mes Actual</button>
    </div>

    <!-- Aquí se mostrará el resumen de ganancias -->
    <div id="cierre-diario-resumen" class="cierre-diario-resumen">
      <!-- El contenido se cargará dinámicamente -->
    </div>

    <!-- Aquí se mostrará la lista de ventas -->
    <h3 id="historial-lista-titulo">Detalle de Ventas</h3>
    <div id="historial-ventas-lista" class="historial-ventas-lista">
      Cargando...
    </div>
  `;

  // 2. OBTENER REFERENCIAS A LOS NUEVOS ELEMENTOS
  const fechaInput = document.getElementById('fecha-consulta');
  const btnConsultarDia = document.getElementById('btn-consultar-dia');
  const btnConsultarMes = document.getElementById('btn-consultar-mes');
  const resumenContainer = document.getElementById('cierre-diario-resumen');
  const listaContainer = document.getElementById('historial-ventas-lista');
  const listaTitulo = document.getElementById('historial-lista-titulo');

  // 3. LÓGICA DE LOS BOTONES Y CARGA DE DATOS

  // --- Función para consultar el CIERRE DIARIO (Ganancias) ---
  const consultarCierreDiario = async (fecha) => {
    try {
      const data = await getCierreDiarioApi(fecha);
      resumenContainer.innerHTML = `
        <div class="resumen-card">
          <strong>Total Ventas (Facturado):</strong>
          <span>$${data.totalVentas.toFixed(2)}</span>
        </div>
        <div class="resumen-card">
          <strong>Total Costos:</strong>
          <span>$${data.totalCostos.toFixed(2)}</span>
        </div>
        <div class="resumen-card ganancia">
          <strong>Ganancia Neta:</strong>
          <span>$${data.gananciaNeta.toFixed(2)}</span>
        </div>
      `;
    } catch (error) {
      showError(error.message);
      resumenContainer.innerHTML = `<p class="error-msg">Error al cargar resumen de ganancias.</p>`;
    }
  };

  // --- Función para consultar la LISTA DE VENTAS (Por Día) ---
  const consultarVentasPorDia = async (fecha) => {
    listaTitulo.textContent = `Detalle de Ventas del ${fecha}`;
    listaContainer.innerHTML = 'Cargando ventas del día...';
    try {
      const data = await getVentasPorDiaApi(fecha);
      const historial = Array.isArray(data.ventas) ? data.ventas : [];
      renderListaVentas(historial, true); // true = mostrar ganancia
    } catch (error) {
      showError(error.message);
      listaContainer.innerHTML = `<p class="error-msg">Error al cargar ventas del día.</p>`;
    }
  };

  // --- Función para consultar la LISTA DE VENTAS (Por Mes) ---
  const consultarVentasMesActual = async () => {
    listaTitulo.textContent = 'Detalle de Ventas del Mes Actual';
    resumenContainer.innerHTML = ''; // Limpiamos el resumen diario
    listaContainer.innerHTML = 'Cargando ventas del mes...';
    try {
      const data = await getVentasApi(); // Esta es tu función antigua
      const historial = Array.isArray(data.ventas) ? data.ventas : [];
      
      // Mostramos el total del mes en el resumen
      resumenContainer.innerHTML = `
        <div class="resumen-card ganancia">
          <strong>Total Vendido (Mes):</strong>
          <span>$${(data.totalMes || 0).toFixed(2)}</span>
        </div>
      `;
      renderListaVentas(historial, false); // false = no mostrar ganancia
    } catch (error) {
      showError(error.message);
      listaContainer.innerHTML = `<p class="error-msg">Error al cargar ventas del mes.</p>`;
    }
  };

  // --- Función para DIBUJAR LA LISTA de ventas ---
  const renderListaVentas = (historial, mostrarGanancia = false) => {
    if (historial.length === 0) {
      listaContainer.innerHTML = '<p>No se encontraron ventas para esta selección.</p>';
      return;
    }

    listaContainer.innerHTML = historial.map(venta => `
      <div class="venta-card">
        <div class="venta-card-header">
          <strong>Venta #${venta.venta_id}</strong>
          <span>${new Date(venta.fecha).toLocaleString('es-CO', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}</span>
        </div>
        <ul class="venta-card-body">
          ${venta.productos.map(p => `
            <li>
              <span>${p.cantidad} x ${p.nombre}</span>
              ${mostrarGanancia ? `
                <span class="ganancia-producto">(Ganancia: $${p.ganancia_producto.toFixed(2)})</span>
              ` : ''}
              <span>$${p.subtotal.toFixed(2)}</span>
            </li>
          `).join('')}
        </ul>
        <div class="venta-card-footer">
          <strong>Total: $${venta.total.toFixed(2)}</strong>
        </div>
      </div>
    `).join('');
  };

  // 4. EVENT LISTENERS PARA LOS BOTONES

  btnConsultarDia.addEventListener('click', () => {
    const fecha = fechaInput.value;
    if (!fecha) {
      showError("Por favor, selecciona una fecha.");
      return;
    }
    consultarCierreDiario(fecha);
    consultarVentasPorDia(fecha);
  });

  btnConsultarMes.addEventListener('click', () => {
    consultarVentasMesActual();
  });

  // 5. CARGA INICIAL (Al abrir la vista, consultamos el MES ACTUAL)
  // 💡 CAMBIO: Ahora la carga inicial es la del mes, como lo tenías antes.
  consultarVentasMesActual();
}