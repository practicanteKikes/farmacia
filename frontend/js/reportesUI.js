import { getTopProductosApi } from '../api.js';
import { showError } from './utils/alerts.js';

// Reutilizamos la lógica de formateo para mostrar "X Cajas, Y Unid."
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

function getFechaHoyLocal() {
  const ahora = new Date();
  ahora.setHours(ahora.getHours() - 5);
  return ahora.toISOString().split('T')[0];
}

async function renderTablaTop(contenedorId, titulo, periodo, fecha = null) {
    const contenedor = document.getElementById(contenedorId);
    contenedor.innerHTML = '<p>Cargando...</p>';
    
    try {
        const productos = await getTopProductosApi(periodo, fecha);
        
        if (productos.length === 0) {
            contenedor.innerHTML = '<p class="text-muted">No hay ventas registradas en este periodo.</p>';
            return;
        }

        contenedor.innerHTML = `
            <table class="tabla-productos">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Producto</th>
                        <th>Cantidad Vendida</th>
                        <th>Dinero Generado</th>
                    </tr>
                </thead>
                <tbody>
                    ${productos.map((p, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td><strong>${p.nombre}</strong></td>
                            <td>
                                <span style="color:#007bff; font-weight:bold;">
                                    ${formatearCantidad(p.total_unidades_vendidas, p.unidades_por_caja)}
                                </span>
                                <br><small class="text-muted">(${p.total_unidades_vendidas} unid. total)</small>
                            </td>
                            <td>$${p.total_dinero.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        contenedor.innerHTML = `<p class="error-msg">Error al cargar datos.</p>`;
        console.error(error);
    }
}

export function renderReportesView(container) {
    const fechaHoy = getFechaHoyLocal();

    container.innerHTML = `
        <div class="historial-header">
            <h2>🏆 Productos Más Vendidos</h2>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            
            <!-- Columna 1: Top del Día -->
            <div class="panel-reporte">
                <div class="reporte-header">
                    <h3>🔥 Top del Día (Hoy)</h3>
                    <input type="date" id="fecha-top-dia" value="${fechaHoy}" max="${fechaHoy}">
                </div>
                <div id="tabla-top-dia"></div>
            </div>

            <!-- Columna 2: Top del Mes -->
            <div class="panel-reporte">
                <div class="reporte-header">
                    <h3>📅 Top del Mes Actual</h3>
                </div>
                <div id="tabla-top-mes"></div>
            </div>

        </div>
    `;
    
    // Estilos locales
    const style = document.createElement('style');
    style.innerHTML = `
        .panel-reporte { background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .reporte-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #f8f9fa; padding-bottom: 10px; }
        .reporte-header h3 { margin: 0; font-size: 1.2em; color: #333; }
        .text-muted { color: #6c757d; font-size: 0.9em; }
    `;
    container.appendChild(style);

    // Renderizar tablas iniciales
    renderTablaTop('tabla-top-dia', 'Top del Día', 'dia', fechaHoy);
    renderTablaTop('tabla-top-mes', 'Top del Mes', 'mes');

    // Evento para cambiar la fecha del top diario
    const fechaInput = document.getElementById('fecha-top-dia');
    fechaInput.addEventListener('change', (e) => {
        renderTablaTop('tabla-top-dia', 'Top del Día', 'dia', e.target.value);
    });
}