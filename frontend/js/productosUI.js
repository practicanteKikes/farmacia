import { addProduct, deleteProducto, getProductos, updateProducto } from './productos.js';
import { showConfirm, showSuccess, showError } from './utils/alerts.js';

/**
 * Función auxiliar para formatear el stock.
 * Ejemplo: 119 unidades_por_caja=30 -> "3 Cajas, 29 Unid."
 */
function formatearStock(stock, unidades_por_caja) {
  if (stock === null || stock === undefined) return 'N/A';
  if (unidades_por_caja <= 1) {
    return `${stock} Unid.`;
  }
  
  const cajas = Math.floor(stock / unidades_por_caja);
  const unidades = stock % unidades_por_caja;
  
  let resultado = '';
  if (cajas > 0) {
    resultado += `${cajas} ${cajas === 1 ? 'Caja' : 'Cajas'}`;
  }
  if (unidades > 0) {
    if (cajas > 0) resultado += ', ';
    resultado += `${unidades} ${unidades === 1 ? 'Unid.' : 'Unid.'}`;
  }
  if (resultado === '') {
    resultado = '0 Unid.';
  }
  return resultado;
}

/**
 * Formulario de SweetAlert para añadir o editar productos.
 * Es más complejo pero maneja la lógica de cajas/unidades.
 */
async function mostrarFormularioProducto(productoActual = {}) {

  // Valores por defecto o del producto actual
  const id = productoActual.id || null;
  const nombre = productoActual.nombre || '';
  const codigo_barras = productoActual.codigo_barras || '';
  
  // Unidades por caja (ej. 30 pastillas)
  const unidades_por_caja = productoActual.unidades_por_caja || 1;
  // Costo de esa caja (ej. $3000)
  const costo_caja = productoActual.costo_caja || '';
  // Precio de venta (por pastilla)
  const precio = productoActual.precio || ''; 
  
  // Calcular stock en cajas y unidades para mostrar
  let stock_cajas = 0;
  let stock_unidades = 0;
  if (productoActual.stock) {
    stock_cajas = Math.floor(productoActual.stock / unidades_por_caja);
    stock_unidades = productoActual.stock % unidades_por_caja;
  }
  
  const titulo = id ? '✏️ Editar Producto' : '➕ Nuevo Producto';

  const { value: formValues } = await Swal.fire({
    title: titulo,
    html: `
      <div class="swal-form-container">
        <!-- Info Básica -->
        <input id="swal-nombre" class="swal2-input" placeholder="Nombre del Producto" value="${nombre}">
        <input id="swal-codigo" class="swal2-input" placeholder="Código de Barras" value="${codigo_barras}">
        
        <!-- Precios -->
        <div class="swal-grupo">
          <input id="swal-unidades-caja" class="swal2-input" placeholder="Unidades por Caja (ej. 30)" type="number" min="1" value="${unidades_por_caja}">
          <input id="swal-costo-caja" class="swal2-input" placeholder="Costo de la Caja ($)" type="number" min="0" step="0.01" value="${costo_caja}">
        </div>
        <input id="swal-precio-venta" class="swal2-input" placeholder="Precio Venta (por Unidad)" type="number" min="0" step="0.01" value="${precio}">
        
        <!-- Stock -->
        <label class="swal-label">Stock Actual:</label>
        <div class="swal-grupo">
          <input id="swal-stock-cajas" class="swal2-input" placeholder="Cajas" type="number" min="0" value="${stock_cajas || ''}">
          <input id="swal-stock-unidades" class="swal2-input" placeholder="Unidades Sueltas" type="number" min="0" value="${stock_unidades || ''}">
        </div>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar',
    width: '48em', // Más ancho para el formulario
    preConfirm: () => {
      // Recolectar y validar los datos
      const unidades = parseInt(document.getElementById('swal-unidades-caja').value, 10);
      const stockCajas = parseInt(document.getElementById('swal-stock-cajas').value, 10) || 0;
      const stockUnidades = parseInt(document.getElementById('swal-stock-unidades').value, 10) || 0;
      
      const datos = {
        nombre: document.getElementById('swal-nombre').value.trim(),
        codigo_barras: document.getElementById('swal-codigo').value.trim(),
        precio: parseFloat(document.getElementById('swal-precio-venta').value),
        
        unidades_por_caja: unidades || 1,
        costo_caja: parseFloat(document.getElementById('swal-costo-caja').value),
        
        stock_cajas: stockCajas,
        stock_unidades: stockUnidades
      };

      // Validaciones
      if (!datos.nombre || !datos.codigo_barras || isNaN(datos.precio) || isNaN(datos.costo_caja)) {
        Swal.showValidationMessage('Por favor, completa Nombre, Código, Precio Venta y Costo Caja.');
        return false;
      }
      if (datos.precio < 0 || datos.costo_caja < 0 || stockCajas < 0 || stockUnidades < 0) {
        Swal.showValidationMessage('Los precios y el stock no pueden ser negativos.');
        return false;
      }
      if (stockUnidades >= datos.unidades_por_caja && datos.unidades_por_caja > 1) {
         Swal.showValidationMessage(`Las unidades sueltas (${stockUnidades}) no pueden ser mayores o iguales a las unidades por caja (${datos.unidades_por_caja}).`);
         return false;
      }

      return datos; // Estos datos se envían al backend
    }
  });
  return formValues;
}

// Función principal para renderizar toda la vista de productos
export async function renderProductosView(container) {
  // Limpia listeners antiguos para evitar duplicados
  if (container.handleProductosClick) container.removeEventListener('click', container.handleProductosClick);
  // (Quitamos el listener 'submit' porque el formulario ya no está)

  // 1. DIBUJAR ESTRUCTURA (Ahora solo un botón y la tabla)
  container.innerHTML = `
    <div class="historial-header"> <!-- Reutilizamos este estilo -->
      <h2>Gestión de Productos</h2>
      <button id="btn-nuevo-producto" class="btn-primario">➕ Nuevo Producto</button>
    </div>
    <div id="productos-lista-container">Cargando productos...</div>
  `;

  const listaContainer = document.getElementById('productos-lista-container');
  const btnNuevoProducto = document.getElementById('btn-nuevo-producto');
  
  // 2. FUNCIÓN PARA DIBUJAR LA TABLA (Actualizada)
  const dibujarTabla = (productos) => {
    if (!productos || productos.length === 0) {
      listaContainer.innerHTML = '<p>No hay productos registrados.</p>';
      return;
    }
    listaContainer.innerHTML = `
      <table class="tabla-productos">
        <thead> 
          <tr> 
            <th>Nombre</th> 
            <th>Código</th> 
            <th>P. Venta (Unid.)</th> 
            <th>Costo (Unid.)</th> 
            <th>Stock (Detalle)</th> 
            <th>Stock (Total)</th> 
            <th>Acciones</th> 
          </tr> 
        </thead>
        <tbody>
          ${productos.map(p => `
            <tr>
              <td>${p.nombre}</td>
              <td>${p.codigo_barras || 'N/A'}</td>
              <td>$${p.precio.toFixed(2)}</td>
              <td>$${p.costo.toFixed(2)}</td>
              <!-- Columna de Stock Formateado -->
              <td><strong>${formatearStock(p.stock, p.unidades_por_caja)}</strong></td>
              <td>(${p.stock} Unid. Totales)</td>
              <td>
                <button data-id="${p.id}" data-action="editar" title="Editar">✏️</button>
                <button data-id="${p.id}" data-action="eliminar" title="Eliminar">🗑️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  let productos = [];
  
  // 3. CARGA INICIAL DE DATOS
  try {
    productos = await getProductos();
    dibujarTabla(productos);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    listaContainer.innerHTML = `<p class="error-msg">Error al cargar los productos.</p>`;
  }

  // 4. MANEJADOR DE EVENTOS (Simplificado)
  container.handleProductosClick = async (e) => {
    const button = e.target.closest('button');
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;
    
    // Botón "Nuevo Producto"
    if (button.id === 'btn-nuevo-producto') {
      const datosNuevos = await mostrarFormularioProducto();
      if (datosNuevos) {
        const fueExitoso = await addProduct(datosNuevos);
        if (fueExitoso) {
          showSuccess('Producto agregado');
          productos = await getProductos();
          dibujarTabla(productos);
        }
      }
    }

    // Botón "Eliminar"
    if (action === 'eliminar') {
      const confirm = await showConfirm('¿Estás seguro?', 'Esta acción no se puede revertir.');
      if (confirm && confirm.isConfirmed) {
        await deleteProducto(id);
        showSuccess('Producto eliminado');
        productos = await getProductos();
        dibujarTabla(productos);
      }
    }

    // Botón "Editar"
    if (action === 'editar') {
      const productoActual = productos.find(p => p.id === parseInt(id));
      const datosEditados = await mostrarFormularioProducto(productoActual);
      if (datosEditados) {
        await updateProducto(id, datosEditados);
        showSuccess('Producto actualizado');
        productos = await getProductos();
        dibujarTabla(productos);
      }
    }
  };
  
  container.addEventListener('click', container.handleProductosClick);
  
  // --- Añadimos los estilos CSS para el nuevo formulario de SweetAlert ---
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    .swal-form-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .swal-grupo {
      display: flex;
      gap: 10px;
    }
    .swal-grupo .swal2-input {
      flex: 1;
    }
    .swal-label {
      text-align: left;
      font-weight: 500;
      color: var(--dark-gray);
      margin-top: 10px;
      margin-left: 5px;
    }
  `;
  document.head.appendChild(styleEl);
}