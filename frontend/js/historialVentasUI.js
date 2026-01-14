import { getVentasApi, getCierreDiarioApi, getVentasPorDiaApi, getTopProductosApi } from '../api.js';
import { showError } from './utils/alerts.js';

function getFechaHoyLocal() {
  const ahora = new Date();
  ahora.setHours(ahora.getHours() - 5);
  return ahora.toISOString().split('T')[0];
}

// Helper para formatear cantidad (Cajas/Unidades)
function formatearCantidad(cantidadTotal, unidadesPorCaja) {
  if (!cantidadTotal) return "0";
  if (unidadesPorCaja <= 1) return `${cantidadTotal} Unid.`;
  const cajas = Math.floor(cantidadTotal / unidadesPorCaja);
  const sueltas = cantidadTotal % unidadesPorCaja;
  let texto = [];
  if (cajas > 0) texto.push(`${cajas} ${cajas === 1 ? 'Caja' : 'Cajas'}`);
  if (sueltas > 0) texto.push(`${sueltas} ${sueltas === 1 ? 'Unid.' : 'Unid.'}`);
  return texto.join(", ");
}

/**
 * Renderiza la tabla de Top Productos dentro del historial
 */
async function renderTopProductos(contenedorId, periodo, fecha) {
  const contenedor = document.getElementById(contenedorId);
  contenedor.innerHTML = '<p>Calculando productos estrella...</p>';
  
  try {
    const productos = await getTopProductosApi(periodo, fecha);
    
    if (productos.length === 0) {
      contenedor.innerHTML = '<p class="text-muted" style="text-align:center; padding:10px;">No hay datos de productos para este periodo.</p>';
      return;
    }

    // Tabla compacta para que no ocupe mucho espacio
    contenedor.innerHTML = `
      <table class="tabla-productos" style="font-size: 0.9em;">
        <thead>
          <tr>
            <th style="padding: 8px;">#</th>
            <th style="padding: 8px;">Producto Más Vendido</th>
            <th style="padding: 8px;">Cantidad</th>
            <th style="padding: 8px;">Total ($)</th>
          </tr>
        </thead>
        <tbody>
          ${productos.map((p, index) => `
            <tr>
              <td style="padding: 8px;">${index + 1}</td>
              <td style="padding: 8px;"><strong>${p.nombre}</strong></td>
              <td style="padding: 8px;">
                <span style="color:#007bff; font-weight:bold;">${formatearCantidad(p.total_unidades_vendidas, p.unidades_por_caja)}</span>
              </td>
              <td style="padding: 8px;">$${p.total_dinero.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    contenedor.innerHTML = `<p class="error-msg">Error cargando top.</p>`;
  }
}

async function mostrarCierreManual() {
  const fechaHoy = getFechaHoyLocal();
  try {
    const datosCierre = await getCierreDiarioApi(fechaHoy);
    const datosDetalle = await getVentasPorDiaApi(fechaHoy);
    const cantidadVentas = datosDetalle.ventas ? datosDetalle.ventas.length : 0;

    await Swal.fire({
      title: '🔒 CIERRE DE CAJA (HOY)',
      html: `
        <div style="text-align: left; font-family: 'Courier New', monospace; border: 1px dashed #ccc; padding: 15px; background: #fffdf0;">
          <p style="margin: 5px 0;"><strong>Fecha:</strong> ${fechaHoy}</p>
          <p style="margin: 5px 0;"><strong>Hora:</strong> ${new Date().toLocaleTimeString()}</p>
          <hr style="border-top: 1px dashed #ccc;">
          <p style="display:flex; justify-content:space-between;"><span>Transacciones:</span> <strong>${cantidadVentas}</strong></p>
          <p style="display:flex; justify-content:space-between;"><span>Facturado:</span> <strong style="color:#007bff">$${datosCierre.totalVentas.toLocaleString()}</strong></p>
          <p style="display:flex; justify-content:space-between;"><span>Costos:</span> <span>$${datosCierre.totalCostos.toLocaleString()}</span></p>
          <hr style="border-top: 1px dashed #ccc;">
          <h3 style="text-align: right; color: #28a745; margin: 10px 0;">Ganancia: $${datosCierre.gananciaNeta.toLocaleString()}</h3>
        </div>
      `,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#3085d6'
    });
  } catch (error) {
    showError(error.message);
  }
}

export async function renderHistorialVentasView(container) {
  const fechaHoy = getFechaHoyLocal();

  container.innerHTML = `
    <div class="historial-header">
      <h2>Centro de Historial</h2>
    </div>

    <!-- Controles -->
    <div class="cierre-diario-controles">
      <div style="width: 100%; margin-bottom: 15px; display: flex; justify-content: flex-end;">
        <button id="btn-cierre-manual" class="btn-primario" style="background-color: #dc3545;">🔒 Cierre Rápido</button>
      </div>
      <div class="control-grupo">
        <label>Fecha:</label>
        <input type="date" id="fecha-consulta" value="${fechaHoy}" max="${fechaHoy}">
      </div>
      <div class="grupo-botones">
        <button id="btn-consultar-dia" class="btn-primario">Ver Día</button>
        <button id="btn-consultar-mes" class="btn-secundario">Ver Mes</button>
      </div>
    </div>

    <!-- 1. Resumen Financiero -->
    <div id="cierre-diario-resumen" class="cierre-diario-resumen"></div>

    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
        <!-- 2. Top Productos (INTEGRADO AQUÍ) -->
        <div style="flex: 1; min-width: 300px;">
            <h3 id="titulo-top" style="border-bottom: 2px solid #eee; padding-bottom: 10px;">🏆 Lo Más Vendido</h3>
            <div id="top-productos-container" style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 10px; max-height: 400px; overflow-y: auto;">
                <!-- Aquí carga la tabla -->
            </div>
        </div>

        <!-- 3. Lista de Ventas -->
        <div style="flex: 1.5; min-width: 300px;">
            <h3 id="historial-lista-titulo" style="border-bottom: 2px solid #eee; padding-bottom: 10px;">🧾 Detalle de Tickets</h3>
            <div id="historial-ventas-lista" class="historial-ventas-lista">Cargando...</div>
        </div>
    </div>
  `;

  const btnCierreManual = document.getElementById('btn-cierre-manual');
  const fechaInput = document.getElementById('fecha-consulta');
  const btnConsultarDia = document.getElementById('btn-consultar-dia');
  const btnConsultarMes = document.getElementById('btn-consultar-mes');
  const resumenContainer = document.getElementById('cierre-diario-resumen');
  const listaContainer = document.getElementById('historial-ventas-lista');
  const listaTitulo = document.getElementById('historial-lista-titulo');
  const tituloTop = document.getElementById('titulo-top');

  // --- Lógica de Carga ---

  const cargarDatosDia = async (fecha) => {
    listaTitulo.textContent = `🧾 Tickets del ${fecha}`;
    tituloTop .textContent = `🏆 Lo Más Vendido del Día`;
    
    // 1. Resumen Financiero
    try {
      const data = await getCierreDiarioApi(fecha);
      resumenContainer.innerHTML = `
        <div class="resumen-card"><strong>Ventas:</strong><span>$${data.totalVentas.toLocaleString()}</span></div>
        <div class="resumen-card"><strong>Costos:</strong><span>$${data.totalCostos.toLocaleString()}</span></div>
        <div class="resumen-card ganancia"><strong>Ganancia:</strong><span>$${data.gananciaNeta.toLocaleString()}</span></div>
      `;
    } catch(e) { showError(e.message); }

    // 2. Top Productos (Integrado)
    renderTopProductos('top-productos-container', 'dia', fecha);

    // 3. Lista de Ventas
    try {
      const data = await getVentasPorDiaApi(fecha);
      const historial = Array.isArray(data.ventas) ? data.ventas : [];
      renderListaVentas(historial, true);
    } catch(e) { listaContainer.innerHTML = '<p>Error cargando lista.</p>'; }
  };

  const cargarDatosMes = async () => {
    listaTitulo.textContent = '🧾 Tickets del Mes Actual';
    tituloTop.textContent = `🏆 Lo Más Vendido del Mes`;
    
    // 1. Resumen Mes
    try {
      const data = await getVentasApi();
      resumenContainer.innerHTML = `
        <div class="resumen-card ganancia" style="width: 100%;">
          <strong>Total Mes:</strong><span>$${(data.totalMes || 0).toLocaleString()}</span>
        </div>`;
      
      // 2. Top Productos Mes
      renderTopProductos('top-productos-container', 'mes');

      // 3. Lista Mes
      const historial = Array.isArray(data.ventas) ? data.ventas : [];
      renderListaVentas(historial, false);
    } catch(e) { showError(e.message); }
  };

  const renderListaVentas = (historial, mostrarGanancia) => {
    if (historial.length === 0) {
      listaContainer.innerHTML = '<p>No hay ventas registradas.</p>';
      return;
    }
    listaContainer.innerHTML = historial.map(venta => `
      <div class="venta-card">
        <div class="venta-card-header">
          <strong>#${venta.venta_id}</strong>
          <span>${new Date(venta.fecha).toLocaleString()}</span>
        </div>
        <ul class="venta-card-body">
          ${venta.productos.map(p => `
            <li>
              <span>${p.cantidad} x ${p.nombre}</span>
              ${mostrarGanancia ? `<span class="ganancia-producto">($${p.ganancia_producto.toLocaleString()})</span>` : ''}
              <span>$${p.subtotal.toLocaleString()}</span>
            </li>
          `).join('')}
        </ul>
        <div class="venta-card-footer">Total: $${venta.total.toLocaleString()}</div>
      </div>
    `).join('');
  };

  btnCierreManual.addEventListener('click', mostrarCierreManual);
  btnConsultarDia.addEventListener('click', () => {
    if (!fechaInput.value) return showError("Selecciona fecha");
    cargarDatosDia(fechaInput.value);
  });
  btnConsultarMes.addEventListener('click', cargarDatosMes);

  // Iniciar con Mes Actual
  cargarDatosMes();
}