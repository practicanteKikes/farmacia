import { getProductos } from './productos.js';
import { createVentaApi } from '../api.js';
import { showSuccess, showError } from './utils/alerts.js';

let carrito = []; // Ahora será un array de objetos más complejos
let todosLosProductos = [];

/**
 * Función auxiliar para formatear el stock.
 * Copiada de productosUI.js para consistencia visual.
 */
function formatearStock(stock, unidades_por_caja) {
  if (stock === null || stock === undefined) return 'N/A';
  if (unidades_por_caja <= 1) {
    return `${stock} Unid.`;
  }
  const cajas = Math.floor(stock / unidades_por_caja);
  const unidades = stock % unidades_por_caja;
  let resultado = [];
  if (cajas > 0) resultado.push(`${cajas} ${cajas === 1 ? 'Caja' : 'Cajas'}`);
  if (unidades > 0) resultado.push(`${unidades} ${unidades === 1 ? 'Unid.' : 'Unid.'}`);
  
  if (resultado.length === 0) return '0 Unid.';
  return resultado.join(', ');
}

/**
 * Calcula el total de unidades de un producto que ya están en el carrito.
 * Esto es clave para validar el stock y no vender más de lo que tienes.
 */
function calcularUnidadesEnCarrito(productoId) {
  return carrito.reduce((total, item) => {
    if (item.productoId === productoId) {
      return total + (item.cantidad * item.unidadesPorItem);
    }
    return total;
  }, 0);
}

// --- MANEJO DE CANTIDADES ---

function incrementarCantidad(cartItemId) {
  const item = carrito.find(p => p.cartItemId === cartItemId);
  if (!item) return;
  
  const productoInfo = todosLosProductos.find(p => p.id === item.productoId);
  
  // Revisar stock disponible
  const unidadesYaEnCarrito = calcularUnidadesEnCarrito(item.productoId);
  const stockDisponible = productoInfo.stock - unidadesYaEnCarrito;
  
  // Si hay suficiente stock para agregar OTRO item de este tipo (ej. otra caja de 30)
  if (stockDisponible >= 0) { // La lógica de validación ya se hizo al agregar, aquí solo sumamos si no excedemos el total
      // Re-validamos con el total teórico si sumamos uno más
      if ((unidadesYaEnCarrito + item.unidadesPorItem) <= productoInfo.stock) {
        item.cantidad++;
        renderCarrito();
      } else {
        showError('No hay más stock disponible para agregar otra unidad/caja.');
      }
  } else {
    showError('No hay más stock disponible.');
  }
}

function decrementarCantidad(cartItemId) {
  const item = carrito.find(p => p.cartItemId === cartItemId);
  if (item) {
    item.cantidad--;
    if (item.cantidad === 0) {
      carrito = carrito.filter(p => p.cartItemId !== cartItemId);
    }
    renderCarrito();
  }
}

// --- LÓGICA DEL CARRITO Y VENTA ---

function renderCarrito() {
  const carritoItemsContainer = document.getElementById('carrito-items');
  const totalValorSpan = document.getElementById('carrito-total-valor');
  const btnFinalizarVenta = document.getElementById('btn-finalizar-venta');

  if (!carritoItemsContainer) return;

  if (carrito.length === 0) {
    carritoItemsContainer.innerHTML = '<p>El carrito está vacío.</p>';
    btnFinalizarVenta.disabled = true;
  } else {
    carritoItemsContainer.innerHTML = `
      <ul class="lista-carrito">
        ${carrito.map(item => `
          <li>
            <div class="carrito-info">
                <span class="carrito-nombre">${item.nombre}</span>
                <small style="color:#666">${item.tipo === 'caja' ? '📦 Caja' : '💊 Unidad'}</small>
            </div>
            <div class="carrito-controles">
              <button data-id="${item.cartItemId}" data-action="decrementar" class="btn-cantidad">-</button>
              <span>${item.cantidad}</span>
              <button data-id="${item.cartItemId}" data-action="incrementar" class="btn-cantidad">+</button>
            </div>
            <span><strong>$${(item.cantidad * item.precio).toFixed(2)}</strong></span>
          </li>
        `).join('')}
      </ul>
    `;
    btnFinalizarVenta.disabled = false;
  }

  const total = carrito.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
  totalValorSpan.textContent = total.toLocaleString(); // Formato moneda
}

/**
 * Agrega un item (unidad o caja) al carrito.
 */
function agregarAlCarrito(productoId, tipo) {
  const cartItemId = `${productoId}-${tipo}`; // ID único para el carrito, ej: "5-caja"
  const productoInfo = todosLosProductos.find(p => p.id === productoId);
  if (!productoInfo) return;

  // Revisar si el item ya existe en el carrito
  const itemExistente = carrito.find(item => item.cartItemId === cartItemId);
  
  // Definir propiedades según el tipo de venta
  let nombre, precio, unidadesPorItem;
  
  if (tipo === 'caja') {
    nombre = `${productoInfo.nombre}`;
    precio = productoInfo.precio_caja;
    unidadesPorItem = productoInfo.unidades_por_caja;
  } else {
    nombre = `${productoInfo.nombre}`;
    precio = productoInfo.precio;
    unidadesPorItem = 1;
  }

  // Validar Stock
  const unidadesYaEnCarrito = calcularUnidadesEnCarrito(productoId);
  // Cuántas unidades "reales" necesitamos para agregar este item
  const unidadesNecesarias = unidadesPorItem; 
  
  if ((unidadesYaEnCarrito + unidadesNecesarias) <= productoInfo.stock) {
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({
          cartItemId: cartItemId,
          productoId: productoId,
          nombre: nombre,
          precio: precio,
          tipo: tipo,
          cantidad: 1, 
          unidadesPorItem: unidadesPorItem // Guardamos cuánto descuenta del stock real
        });
    }
    renderCarrito();
  } else {
    showError(`Stock insuficiente. Necesitas ${unidadesNecesarias} unidades libres.`);
  }
}

/**
 * Muestra los resultados de búsqueda.
 * MAGIA: Muestra opción de CAJA si el producto tiene configuración de caja.
 */
function renderResultadosBusqueda(resultados) {
  const contenedorResultados = document.getElementById('resultados-busqueda');
  
  // Aplanamos la lista: Un producto puede generar 1 o 2 líneas en el resultado
  const opcionesDeVenta = resultados.flatMap(p => {
    const opciones = [];
    const stockTexto = formatearStock(p.stock, p.unidades_por_caja);
    
    // 1. Opción Venta por UNIDAD (Siempre disponible)
    opciones.push({
      id: p.id,
      tipo: 'unidad',
      nombre: `${p.nombre}`,
      detalle: 'Unidad',
      precio: p.precio,
      stockTexto: stockTexto,
      icono: '💊'
    });

    // 2. Opción Venta por CAJA (Solo si configuraste unidades_por_caja > 1 y precio_caja > 0)
    if (p.unidades_por_caja > 1 && p.precio_caja > 0) {
      opciones.push({
        id: p.id,
        tipo: 'caja',
        nombre: `${p.nombre}`,
        detalle: `Caja x${p.unidades_por_caja}`,
        precio: p.precio_caja,
        stockTexto: stockTexto,
        icono: '📦'
      });
    }
    
    return opciones;
  });

  if (!opcionesDeVenta || opcionesDeVenta.length === 0) {
    contenedorResultados.innerHTML = '';
    return;
  }
  
  contenedorResultados.innerHTML = `
    <ul class="lista-resultados">
      ${opcionesDeVenta.map(op => `
        <li data-id="${op.id}" data-tipo="${op.tipo}">
          <div class="resultado-info">
            <span class="resultado-icono">${op.icono}</span>
            <div>
                <strong>${op.nombre}</strong> <span class="badge-tipo">${op.detalle}</span>
                <br>
                <small>Stock: ${op.stockTexto}</small>
            </div>
          </div>
          <div class="resultado-precio">
            $${op.precio.toLocaleString()}
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

async function finalizarVenta() {
  if (carrito.length === 0) {
    return showError("El carrito está vacío.");
  }

  // Preparamos los datos para el backend (que ahora espera 'tipo')
  const itemsParaVenta = carrito.map(item => ({
    id: item.productoId,
    cantidad: item.cantidad,
    tipo: item.tipo 
  }));

  try {
    const resultado = await createVentaApi({ items: itemsParaVenta });
    showSuccess(resultado.mensaje || "¡Venta realizada con éxito!");
    carrito = [];
    renderCarrito();
    // Recargamos productos para actualizar stocks
    todosLosProductos = await getProductos();
  } catch (error) {
    showError(error.message);
  }
}

// --- FUNCIÓN PRINCIPAL DE LA VISTA ---

export async function renderVentasView(container) {
  // Limpieza de listeners
  if (container.handleVentasClick) container.removeEventListener('click', container.handleVentasClick);
  if (container.handleVentasSubmit) container.removeEventListener('submit', container.handleVentasSubmit);
  if (container.handleVentasInput) {
    const oldInput = container.querySelector('#input-busqueda');
    if (oldInput) oldInput.removeEventListener('input', container.handleVentasInput);
  }

  try {
    todosLosProductos = await getProductos();
  } catch(e) {
    showError("No se pudieron cargar los productos.");
    todosLosProductos = [];
  }

  container.innerHTML = `
    <div class="vista-ventas">
      <div class="panel-busqueda">
        <h2>Punto de Venta</h2>
        <form id="form-busqueda-producto" novalidate>
          <input type="text" id="input-busqueda" placeholder="🔍 Buscar por nombre o código..." autofocus />
        </form>
        <div id="resultados-busqueda"></div>
      </div>
      <div class="panel-carrito">
        <h3>🛒 Carrito</h3>
        <div id="carrito-items"><p>El carrito está vacío.</p></div>
        <div class="carrito-total">Total: $<span id="carrito-total-valor">0.00</span></div>
        <button id="btn-finalizar-venta" disabled>Cobrar</button>
      </div>
    </div>
  `;

  // Estilos específicos para esta vista (Pequeño ajuste visual)
  const style = document.createElement('style');
  style.innerHTML = `
    .lista-resultados li { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; }
    .lista-resultados li:hover { background-color: #f8f9fa; }
    .resultado-info { display: flex; align-items: center; gap: 10px; }
    .resultado-icono { font-size: 1.5em; }
    .resultado-precio { font-weight: bold; color: var(--primary-color); font-size: 1.1em; }
    .badge-tipo { background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; color: #495057; font-weight: normal; }
    .carrito-info { display: flex; flex-direction: column; }
    .carrito-nombre { font-weight: 500; }
  `;
  container.appendChild(style);

  renderCarrito();

  const inputBusqueda = document.getElementById('input-busqueda');

  // --- EVENTOS ---

  container.handleVentasClick = (e) => {
    const target = e.target;

    // Seleccionar producto de la lista
    const itemBusqueda = target.closest('.lista-resultados li');
    if (itemBusqueda) {
      const productoId = parseInt(itemBusqueda.dataset.id, 10);
      const tipo = itemBusqueda.dataset.tipo; 
      agregarAlCarrito(productoId, tipo);
      
      inputBusqueda.value = '';
      document.getElementById('resultados-busqueda').innerHTML = '';
      inputBusqueda.focus();
      return;
    }

    // Botones carrito
    const btnCantidad = target.closest('.btn-cantidad');
    if (btnCantidad) {
      const cartItemId = btnCantidad.dataset.id;
      const action = btnCantidad.dataset.action;
      if (action === 'incrementar') incrementarCantidad(cartItemId);
      if (action === 'decrementar') decrementarCantidad(cartItemId);
      return;
    }

    // Finalizar
    if (target.id === 'btn-finalizar-venta') {
      finalizarVenta();
    }
  };

  container.handleVentasSubmit = (e) => {
    if (e.target.id === 'form-busqueda-producto') {
      e.preventDefault();
      const codigo = inputBusqueda.value.trim();
      if (codigo === '') return;
      
      // Búsqueda exacta por código de barras
      const productoEncontrado = todosLosProductos.find(p => p.codigo_barras === codigo);
      
      if (productoEncontrado) {
        // Por defecto, el escáner agrega 1 UNIDAD
        agregarAlCarrito(productoEncontrado.id, 'unidad');
        inputBusqueda.value = '';
        document.getElementById('resultados-busqueda').innerHTML = '';
      } else {
        showError('Producto no encontrado.');
        inputBusqueda.select();
      }
    }
  };
  
  container.handleVentasInput = (e) => {
    const termino = e.target.value.toLowerCase().trim();
    if (termino.length < 2) {
      document.getElementById('resultados-busqueda').innerHTML = '';
      return;
    }
    const resultados = todosLosProductos.filter(p => 
      p.nombre.toLowerCase().includes(termino) ||
      (p.codigo_barras && p.codigo_barras.toLowerCase().includes(termino))
    );
    renderResultadosBusqueda(resultados);
  };

  container.addEventListener('click', container.handleVentasClick);
  container.addEventListener('submit', container.handleVentasSubmit);
  inputBusqueda.addEventListener('input', container.handleVentasInput);
}