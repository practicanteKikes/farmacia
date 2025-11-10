import { getProductos } from './productos.js';
import { createVentaApi } from '../api.js';
import { showSuccess, showError } from './utils/alerts.js';

let carrito = []; // Ahora será un array de objetos más complejos
let todosLosProductos = [];

/**
 * Función auxiliar para formatear el stock.
 * Copiada de productosUI.js para consistencia.
 */
function formatearStock(stock, unidades_por_caja) {
  if (stock === null || stock === undefined) return 'N/A';
  if (unidades_por_caja <= 1) {
    return `${stock} Unid.`;
  }
  const cajas = Math.floor(stock / unidades_por_caja);
  const unidades = stock % unidades_por_caja;
  let resultado = '';
  if (cajas > 0) resultado += `${cajas} ${cajas === 1 ? 'Caja' : 'Cajas'}`;
  if (unidades > 0) {
    if (cajas > 0) resultado += ', ';
    resultado += `${unidades} ${unidades === 1 ? 'Unid.' : 'Unid.'}`;
  }
  if (resultado === '') resultado = '0 Unid.';
  return resultado;
}

/**
 * Calcula el total de unidades de un producto que ya están en el carrito.
 * Esto es clave para validar el stock.
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
  
  // Revisar stock
  const unidadesYaEnCarrito = calcularUnidadesEnCarrito(item.productoId);
  const stockDisponible = productoInfo.stock - unidadesYaEnCarrito;
  
  if (stockDisponible >= item.unidadesPorItem) {
    item.cantidad++;
    renderCarrito();
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
            <span>${item.nombre}</span> <!-- El nombre ya es "Paracetamol (Caja)" -->
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
  totalValorSpan.textContent = total.toFixed(2);
}

/**
 * Agrega un item (unidad o caja) al carrito.
 */
function agregarAlCarrito(productoId, tipo) {
  const cartItemId = `${productoId}-${tipo}`; // ID único para el carrito, ej: "5-caja"
  const productoInfo = todosLosProductos.find(p => p.id === productoId);
  if (!productoInfo) return;

  // Revisar si el item (ej. "5-caja") ya existe
  const itemExistente = carrito.find(item => item.cartItemId === cartItemId);
  
  if (itemExistente) {
    incrementarCantidad(cartItemId);
    return;
  }
  
  // Definir las propiedades del nuevo item
  let nombre, precio, unidadesPorItem;
  
  if (tipo === 'caja') {
    nombre = `${productoInfo.nombre} (Caja)`;
    precio = productoInfo.precio_caja;
    unidadesPorItem = productoInfo.unidades_por_caja;
  } else {
    nombre = `${productoInfo.nombre} (Unidad)`;
    precio = productoInfo.precio;
    unidadesPorItem = 1;
  }

  // Validar Stock antes de agregar
  const unidadesYaEnCarrito = calcularUnidadesEnCarrito(productoId);
  const stockDisponible = productoInfo.stock - unidadesYaEnCarrito;
  
  if (stockDisponible >= unidadesPorItem) {
    carrito.push({
      cartItemId: cartItemId,
      productoId: productoId,
      nombre: nombre,
      precio: precio,
      tipo: tipo,
      cantidad: 1, // Siempre se agrega 1 al inicio
      unidadesPorItem: unidadesPorItem // Cuánto descuenta del stock (1 o 30)
    });
    renderCarrito();
  } else {
    showError('Este producto no tiene stock disponible.');
  }
}

/**
 * Muestra los resultados de búsqueda, duplicando si se puede vender por caja.
 */
function renderResultadosBusqueda(resultados) {
  const contenedorResultados = document.getElementById('resultados-busqueda');
  
  // Convertimos la lista de productos en una lista de "opciones de venta"
  const opcionesDeVenta = resultados.flatMap(p => {
    const opciones = [];
    
    // Opción 1: Vender por Unidad (siempre)
    opciones.push({
      id: p.id,
      tipo: 'unidad',
      nombre: `${p.nombre} (Unidad)`,
      precio: p.precio,
      stockTexto: formatearStock(p.stock, p.unidades_por_caja)
    });

    // Opción 2: Vender por Caja (solo si aplica)
    if (p.unidades_por_caja > 1 && p.precio_caja > 0) {
      opciones.push({
        id: p.id,
        tipo: 'caja',
        nombre: `${p.nombre} (Caja)`,
        precio: p.precio_caja,
        stockTexto: formatearStock(p.stock, p.unidades_por_caja)
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
        <!-- El data-id es el ID del producto, data-tipo es 'unidad' o 'caja' -->
        <li data-id="${op.id}" data-tipo="${op.tipo}">
          <strong>${op.nombre}</strong> - $${op.precio.toFixed(2)} 
          <span style="color:var(--dark-gray); font-size: 0.9em;">(Stock: ${op.stockTexto})</span>
        </li>
      `).join('')}
    </ul>
  `;
}

async function finalizarVenta() {
  if (carrito.length === 0) {
    return showError("El carrito está vacío.");
  }

  // ⭐️ CRÍTICO: Preparamos los datos para el NUEVO backend
  // El backend ahora necesita saber el 'tipo' ('unidad' o 'caja')
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
    // Recargamos los productos porque el stock ha cambiado
    todosLosProductos = await getProductos();
  } catch (error) {
    showError(error.message);
  }
}

// --- FUNCIÓN PRINCIPAL DE LA VISTA ---

export async function renderVentasView(container) {
  // Limpia listeners antiguos...
  if (container.handleVentasClick) container.removeEventListener('click', container.handleVentasClick);
  if (container.handleVentasSubmit) container.removeEventListener('submit', container.handleVentasSubmit);
  if (container.handleVentasInput) {
    const oldInput = container.querySelector('#input-busqueda');
    if (oldInput) oldInput.removeEventListener('input', container.handleVentasInput);
  }

  try {
    todosLosProductos = await getProductos();
  } catch(e) {
    showError("Error fatal: No se pudieron cargar los productos. Revisa el backend.");
    todosLosProductos = [];
  }

  container.innerHTML = `
    <div class="vista-ventas">
      <div class="panel-busqueda">
        <h2>Punto de Venta</h2>
        <form id="form-busqueda-producto" novalidate>
          <input type="text" id="input-busqueda" placeholder="Buscar por nombre o escanear código..." autofocus />
        </form>
        <div id="resultados-busqueda"></div>
      </div>
      <div class="panel-carrito">
        <h3>Carrito de Compras</h3>
        <div id="carrito-items"><p>El carrito está vacío.</p></div>
        <div class="carrito-total"><strong>Total: $<span id="carrito-total-valor">0.00</span></strong></div>
        <button id="btn-finalizar-venta" disabled>Finalizar Venta</button>
      </div>
    </div>
  `;

  renderCarrito();

  const inputBusqueda = document.getElementById('input-busqueda');

  // --- MANEJADORES DE EVENTOS ---

  container.handleVentasClick = (e) => {
    const target = e.target;

    // Click en un resultado de búsqueda
    const itemBusqueda = target.closest('.lista-resultados li');
    if (itemBusqueda) {
      const productoId = parseInt(itemBusqueda.dataset.id, 10);
      const tipo = itemBusqueda.dataset.tipo; // 'unidad' o 'caja'
      
      agregarAlCarrito(productoId, tipo);
      
      inputBusqueda.value = '';
      document.getElementById('resultados-busqueda').innerHTML = '';
      inputBusqueda.focus();
      return;
    }

    // Click en botones +/- del carrito
    const btnCantidad = target.closest('.btn-cantidad');
    if (btnCantidad) {
      const cartItemId = btnCantidad.dataset.id; // "5-caja" o "5-unidad"
      const action = btnCantidad.dataset.action;
      if (action === 'incrementar') incrementarCantidad(cartItemId);
      if (action === 'decrementar') decrementarCantidad(cartItemId);
      return;
    }

    // Click en "Finalizar Venta"
    if (target.id === 'btn-finalizar-venta') {
      finalizarVenta();
    }
  };

  // Manejador para el ESCÁNER DE CÓDIGO
  container.handleVentasSubmit = (e) => {
    if (e.target.id === 'form-busqueda-producto') {
      e.preventDefault();
      const codigo = inputBusqueda.value.trim();
      if (codigo === '') return;
      const productoEncontrado = todosLosProductos.find(p => p.codigo_barras === codigo);
      
      if (productoEncontrado) {
        // ASUNCIÓN: El escáner siempre agrega 1 UNIDAD.
        // Es la acción más segura y común.
        agregarAlCarrito(productoEncontrado.id, 'unidad');
        
        inputBusqueda.value = '';
        document.getElementById('resultados-busqueda').innerHTML = '';
      } else {
        showError('Producto no encontrado con ese código.');
        inputBusqueda.select();
      }
    }
  };
  
  // Manejador para la BÚSQUEDA POR NOMBRE
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