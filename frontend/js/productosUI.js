import { addProduct, deleteProducto, getProductos, updateProducto } from './productos.js';
import { showConfirm, showSuccess, showError } from './utils/alerts.js';

/**
 * Función auxiliar para mostrar el stock de forma humana.
 * Ejemplo: "3 Cajas, 5 Unid."
 */
function formatearStock(stock, unidades_por_caja) {
  if (stock === null || stock === undefined) return '0';
  
  // Si es un producto simple (1 unidad por caja), mostramos solo el número
  if (unidades_por_caja <= 1) {
    return `${stock} Unid.`;
  }
  
  const cajas = Math.floor(stock / unidades_por_caja);
  const sueltas = stock % unidades_por_caja;
  
  let texto = [];
  if (cajas > 0) texto.push(`${cajas} ${cajas === 1 ? 'Caja' : 'Cajas'}`);
  if (sueltas > 0) texto.push(`${sueltas} ${sueltas === 1 ? 'Unid.' : 'Unid.'}`);
  
  if (texto.length === 0) return "0 Unid.";
  return texto.join(", ");
}

/**
 * Formulario Principal de Productos
 */
async function mostrarFormularioProducto(productoActual = {}) {
  const id = productoActual.id || null;
  const titulo = id ? '✏️ Editar Producto' : '➕ Nuevo Producto';
  
  // Datos Básicos
  const nombre = productoActual.nombre || '';
  const codigo_barras = productoActual.codigo_barras || '';
  
  // Configuración de Caja
  const unidades_por_caja = productoActual.unidades_por_caja || 1;
  
  // Costos
  const costo_caja = productoActual.costo_caja || '';
  
  // Precios de Venta
  const precio_unidad = productoActual.precio || '';
  const precio_caja = productoActual.precio_caja || '';

  // Cálculo inverso del Stock para mostrarlo en el formulario
  let stock_cajas = 0;
  let stock_sueltas = 0;
  
  if (productoActual.stock) {
    stock_cajas = Math.floor(productoActual.stock / unidades_por_caja);
    stock_sueltas = productoActual.stock % unidades_por_caja;
  }

  const { value: formValues } = await Swal.fire({
    title: titulo,
    html: `
      <div class="swal-form-container">
        
        <!-- 1. IDENTIFICACIÓN -->
        <label class="swal-section-title">📦 Producto</label>
        <div class="swal-grupo">
          <input id="swal-nombre" class="swal2-input" placeholder="Nombre" value="${nombre}">
          <input id="swal-codigo" class="swal2-input" placeholder="Código Barras" value="${codigo_barras}">
        </div>

        <!-- 2. DEFINICIÓN DE LA CAJA (IMPORTANTE) -->
        <label class="swal-section-title">📏 Configuración de Empaque</label>
        <div class="swal-grupo">
          <div class="input-wrapper">
            <label>Unidades por Caja</label>
            <input id="swal-unidades-caja" class="swal2-input" type="number" min="1" value="${unidades_por_caja}">
          </div>
          <div class="input-wrapper">
             <label>Costo de la Caja ($)</label>
            <input id="swal-costo-caja" class="swal2-input" type="number" min="0" step="0.01" value="${costo_caja}">
          </div>
        </div>

        <!-- 3. STOCK FÍSICO (Lo que tienes en estantería) -->
        <label class="swal-section-title">🏭 Inventario Físico</label>
        <div class="swal-grupo bg-gray">
          <div class="input-wrapper">
            <label>Cajas Cerradas</label>
            <input id="swal-stock-cajas" class="swal2-input" type="number" min="0" value="${stock_cajas}">
          </div>
          <div class="input-wrapper">
            <label>Unidades Sueltas</label>
            <input id="swal-stock-sueltas" class="swal2-input" type="number" min="0" value="${stock_sueltas}">
          </div>
        </div>

        <!-- 4. PRECIOS DE VENTA (Al Público) -->
        <label class="swal-section-title">💰 Precios de Venta</label>
        <div class="swal-grupo">
          <div class="input-wrapper">
            <label>Precio Unidad</label>
            <input id="swal-precio-unidad" class="swal2-input" type="number" min="0" value="${precio_unidad}">
          </div>
          <div class="input-wrapper">
            <label>Precio Caja</label>
            <input id="swal-precio-caja" class="swal2-input" type="number" min="0" value="${precio_caja}">
          </div>
        </div>

      </div>
    `,
    width: '600px',
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      // 1. Obtener valores
      const unidadesCaja = parseInt(document.getElementById('swal-unidades-caja').value, 10) || 1;
      const stockCajas = parseInt(document.getElementById('swal-stock-cajas').value, 10) || 0;
      const stockSueltas = parseInt(document.getElementById('swal-stock-sueltas').value, 10) || 0;
      
      // 2. Calcular Stock Total automáticamente
      const stockTotal = (stockCajas * unidadesCaja) + stockSueltas;

      const datos = {
        nombre: document.getElementById('swal-nombre').value.trim(),
        codigo_barras: document.getElementById('swal-codigo').value.trim(),
        
        unidades_por_caja: unidadesCaja,
        costo_caja: parseFloat(document.getElementById('swal-costo-caja').value),
        
        // Guardamos el total calculado
        stock: stockTotal,
        
        precio: parseFloat(document.getElementById('swal-precio-unidad').value),
        precio_caja: parseFloat(document.getElementById('swal-precio-caja').value)
      };

      // 3. Validaciones simples
      if (!datos.nombre || !datos.codigo_barras || isNaN(datos.precio)) {
        Swal.showValidationMessage('Nombre, Código y Precio Unidad son obligatorios');
        return false;
      }
      if (datos.unidades_por_caja < 1) {
        Swal.showValidationMessage('Las unidades por caja deben ser al menos 1');
        return false;
      }

      return datos;
    }
  });
  return formValues;
}

// Renderizado Principal
export async function renderProductosView(container) {
  if (container.handleProductosClick) container.removeEventListener('click', container.handleProductosClick);

  container.innerHTML = `
    <div class="historial-header">
      <h2>Gestión de Productos</h2>
      <button id="btn-nuevo-producto" class="btn-primario">➕ Nuevo Producto</button>
    </div>
    <div id="productos-lista-container">Cargando...</div>
  `;

  const listaContainer = document.getElementById('productos-lista-container');

  const dibujarTabla = (productos) => {
    if (!productos || productos.length === 0) {
      listaContainer.innerHTML = '<p>No hay productos registrados.</p>';
      return;
    }
    listaContainer.innerHTML = `
      <table class="tabla-productos">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Inventario</th>
            <th>Precio (Unid)</th>
            <th>Precio (Caja)</th>
            <th>Costo (Caja)</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${productos.map(p => `
            <tr>
              <td>
                <strong>${p.nombre}</strong><br>
                <small style="color:#666">${p.codigo_barras}</small>
              </td>
              <td>
                <span style="font-size:1.1em; color:#007bff; font-weight:bold">
                  ${formatearStock(p.stock, p.unidades_por_caja)}
                </span>
                <br>
                <small style="color:#666">(${p.stock} total)</small>
              </td>
              <td>$${p.precio.toLocaleString()}</td>
              <td>${p.unidades_por_caja > 1 ? `$${p.precio_caja.toLocaleString()}` : '-'}</td>
              <td>$${p.costo_caja.toLocaleString()}</td>
              <td>
                <button data-id="${p.id}" data-action="editar">✏️</button>
                <button data-id="${p.id}" data-action="eliminar">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  // Carga Inicial
  try {
    const productos = await getProductos();
    dibujarTabla(productos);
  } catch (error) {
    listaContainer.innerHTML = `<p class="error-msg">${error.message}</p>`;
  }

  // Eventos
  container.handleProductosClick = async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (btn.id === 'btn-nuevo-producto') {
      const data = await mostrarFormularioProducto();
      if (data) {
        await addProduct(data);
        showSuccess('Producto creado');
        dibujarTabla(await getProductos());
      }
    } else if (action === 'editar') {
      const prod = (await getProductos()).find(p => p.id == id);
      const data = await mostrarFormularioProducto(prod);
      if (data) {
        await updateProducto(id, data);
        showSuccess('Producto actualizado');
        dibujarTabla(await getProductos());
      }
    } else if (action === 'eliminar') {
      const confirm = await showConfirm('¿Eliminar producto?');
      if (confirm.isConfirmed) {
        await deleteProducto(id);
        showSuccess('Eliminado');
        dibujarTabla(await getProductos());
      }
    }
  };

  container.addEventListener('click', container.handleProductosClick);

  // Estilos extra para el formulario
  const style = document.createElement('style');
  style.innerHTML = `
    .swal-form-container { text-align: left; font-size: 0.9rem; }
    .swal-section-title { display:block; font-weight:bold; margin: 15px 0 5px; color:#333; border-bottom:1px solid #eee; padding-bottom:2px;}
    .swal-grupo { display: flex; gap: 10px; margin-bottom: 5px; }
    .bg-gray { background: #f9f9f9; padding: 10px; border-radius: 6px; border: 1px dashed #ccc; }
    .input-wrapper { flex: 1; }
    .input-wrapper label { display: block; font-size: 0.8rem; color: #666; margin-bottom: 2px; }
    .swal2-input { margin: 0 !important; height: 2.5em !important; font-size: 1rem !important; }
  `;
  document.head.appendChild(style);
}