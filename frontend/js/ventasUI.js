import { getProductos } from './productos.js';
import { createVentaApi } from '../api.js';
import { showSuccess, showError } from './utils/alerts.js';

let carrito = [];
let todosLosProductos = [];

/**
 * Helper para mostrar el stock detallado (Cajas, Sobres, Unidades)
 */
function formatearStock(stock, unidades_por_caja, tiene_sobres, unidades_por_sobre) {
  if (!stock) return '0';
  
  // Caso 1: Producto Simple (1 a 1)
  if (unidades_por_caja <= 1) return `${stock} Unid.`;

  const cajas = Math.floor(stock / unidades_por_caja);
  let resto = stock % unidades_por_caja;
  let sobres = 0;
  let sueltas = resto;

  // Caso 2: Con Sobres
  if (tiene_sobres && unidades_por_sobre > 0) {
    sobres = Math.floor(resto / unidades_por_sobre);
    sueltas = resto % unidades_por_sobre;
  }

  let texto = [];
  if (cajas > 0) texto.push(`${cajas} Caja(s)`);
  if (sobres > 0) texto.push(`${sobres} Sobre(s)`);
  if (sueltas > 0) texto.push(`${sueltas} Unid.`);
  
  return texto.length > 0 ? texto.join(", ") : "0 Unid.";
}

/**
 * Calcula cuántas unidades de un producto ya están comprometidas en el carrito
 */
function calcularUnidadesEnCarrito(productoId) {
  return carrito.reduce((total, item) => {
    if (item.productoId === productoId) {
      return total + (item.cantidad * item.unidadesPorItem);
    }
    return total;
  }, 0);
}

// --- LÓGICA DE VISUALIZACIÓN ---

function renderCarrito() {
  const container = document.getElementById('carrito-items');
  const totalSpan = document.getElementById('carrito-total-valor');
  const btn = document.getElementById('btn-finalizar-venta');
  
  if (!container) return;

  if (carrito.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#888; margin-top:20px;">El carrito está vacío</p>';
    btn.disabled = true;
  } else {
    container.innerHTML = `
      <ul class="lista-carrito">
        ${carrito.map(item => `
          <li>
            <div class="carrito-info">
              <span class="carrito-nombre">${item.nombre}</span>
              <small style="color:#666; font-size:0.85em;">${item.detalleTipo}</small>
            </div>
            <div class="carrito-controles">
              <button data-id="${item.cartItemId}" data-action="dec" class="btn-cantidad">-</button>
              <span style="font-weight:bold; min-width:20px; text-align:center;">${item.cantidad}</span>
              <button data-id="${item.cartItemId}" data-action="inc" class="btn-cantidad">+</button>
            </div>
            <span style="font-weight:bold; min-width:60px; text-align:right;">
              $${(item.cantidad * item.precio).toLocaleString()}
            </span>
          </li>
        `).join('')}
      </ul>
    `;
    btn.disabled = false;
  }
  
  const total = carrito.reduce((s, i) => s + (i.cantidad * i.precio), 0);
  totalSpan.textContent = total.toLocaleString();
}

/**
 * Agrega un item al carrito manejando los 3 tipos de venta
 */
function agregarAlCarrito(productoId, tipo) { // tipo: 'unidad', 'sobre', 'caja'
  const cartItemId = `${productoId}-${tipo}`;
  const p = todosLosProductos.find(x => x.id === productoId);
  
  if (!p) return;

  const itemExistente = carrito.find(x => x.cartItemId === cartItemId);
  
  let nombre = p.nombre;
  let precio = 0;
  let unidadesPorItem = 1;
  let detalleTipo = '';

  // Configurar según el tipo de venta
  if (tipo === 'caja') {
    detalleTipo = '📦 Caja Completa';
    precio = p.precio_caja;
    unidadesPorItem = p.unidades_por_caja;
  } else if (tipo === 'sobre') {
    detalleTipo = '✉️ Sobre Individual';
    precio = p.precio_sobre;
    unidadesPorItem = p.unidades_por_sobre; // Ej: 2 pastillas
  } else {
    detalleTipo = '💊 Unidad Suelta';
    precio = p.precio;
    unidadesPorItem = 1;
  }

  // Validar Stock
  const enCarrito = calcularUnidadesEnCarrito(productoId);
  // Verificar si cabe 1 item más de este tipo
  if ((enCarrito + unidadesPorItem) <= p.stock) {
    if (itemExistente) {
      itemExistente.cantidad++;
    } else {
      carrito.push({ 
        cartItemId, 
        productoId, 
        nombre, 
        precio, 
        tipo, 
        cantidad: 1, 
        unidadesPorItem, 
        detalleTipo 
      });
    }
    renderCarrito();
  } else {
    showError(`Stock insuficiente. Quedan ${formatearStock(p.stock - enCarrito, p.unidades_por_caja, p.tiene_sobres, p.unidades_por_sobre)} disponibles.`);
  }
}

function renderResultadosBusqueda(resultados) {
  const container = document.getElementById('resultados-busqueda');
  
  if (!resultados || resultados.length === 0) {
    container.innerHTML = '';
    return;
  }

  // Aplanamos la lista: Un producto puede generar hasta 3 opciones
  const opciones = resultados.flatMap(p => {
    const opts = [];
    const stockTxt = formatearStock(p.stock, p.unidades_por_caja, p.tiene_sobres, p.unidades_por_sobre);
    
    // 1. Unidad (Siempre)
    opts.push({ 
      id: p.id, 
      tipo: 'unidad', 
      nombre: p.nombre, 
      detalle: 'Unidad', 
      precio: p.precio, 
      icono: '💊',
      stock: stockTxt
    });
    
    // 2. Sobre (Si aplica)
    if (p.tiene_sobres && p.precio_sobre > 0) {
      opts.push({ 
        id: p.id, 
        tipo: 'sobre', 
        nombre: p.nombre, 
        detalle: `Sobre (x${p.unidades_por_sobre} unids)`, 
        precio: p.precio_sobre, 
        icono: '✉️',
        stock: stockTxt
      });
    }

    // 3. Caja (Si aplica)
    if (p.unidades_por_caja > 1 && p.precio_caja > 0) {
      opts.push({ 
        id: p.id, 
        tipo: 'caja', 
        nombre: p.nombre, 
        detalle: `Caja (x${p.unidades_por_caja} unids)`, 
        precio: p.precio_caja, 
        icono: '📦',
        stock: stockTxt
      });
    }
    return opts;
  });
  
  container.innerHTML = `
    <ul class="lista-resultados">
      ${opciones.map(op => `
        <li data-id="${op.id}" data-tipo="${op.tipo}">
          <div class="resultado-info">
            <span class="resultado-icono">${op.icono}</span>
            <div>
              <strong>${op.nombre}</strong> 
              <span class="badge-tipo">${op.detalle}</span>
              <br>
              <small style="color:#666">Stock: ${op.stock}</small>
            </div>
          </div>
          <div class="resultado-precio">$${op.precio.toLocaleString()}</div>
        </li>
      `).join('')}
    </ul>
  `;
}

async function finalizarVenta() {
  if (carrito.length === 0) return showError("El carrito está vacío.");
  
  const items = carrito.map(i => ({ 
    id: i.productoId, 
    cantidad: i.cantidad, 
    tipo: i.tipo // Importante para que el backend sepa qué precio/costo usar
  }));

  try {
    const res = await createVentaApi({ items });
    showSuccess("¡Venta realizada con éxito!");
    carrito = [];
    renderCarrito();
    // Recargar productos para actualizar stocks
    todosLosProductos = await getProductos();
    // Limpiar búsqueda
    const input = document.getElementById('input-busqueda');
    if(input) { input.value = ''; document.getElementById('resultados-busqueda').innerHTML = ''; input.focus(); }
  } catch (e) { 
    showError(e.message); 
  }
}

// --- FUNCIÓN PRINCIPAL EXPORTADA ---

export async function renderVentasView(container) {
  // Limpieza de listeners previos
  if (container.handleVentasClick) container.removeEventListener('click', container.handleVentasClick);
  if (container.handleVentasSubmit) container.removeEventListener('submit', container.handleVentasSubmit);
  if (container.handleVentasInput) {
    const old = container.querySelector('#input-busqueda');
    if (old) old.removeEventListener('input', container.handleVentasInput);
  }

  try { 
    todosLosProductos = await getProductos(); 
  } catch(e) {
    showError("Error cargando inventario.");
    todosLosProductos = [];
  }

  container.innerHTML = `
    <div class="vista-ventas">
      <div class="panel-busqueda">
        <h2 style="margin-top:0;">Punto de Venta</h2>
        <form id="form-busqueda-producto" style="margin-bottom:10px;">
          <input type="text" id="input-busqueda" placeholder="🔍 Buscar producto por nombre o código..." autofocus style="width:100%; padding:12px;">
        </form>
        <div id="resultados-busqueda"></div>
      </div>
      
      <div class="panel-carrito">
        <h3 style="margin-top:0;">🛒 Carrito de Compras</h3>
        <div id="carrito-items" style="flex-grow:1; overflow-y:auto; border-top:1px solid #eee; border-bottom:1px solid #eee;">
          <p style="text-align:center; padding:20px; color:#888;">El carrito está vacío</p>
        </div>
        <div class="carrito-total">
          Total a Pagar: <span style="color:#28a745; font-size:1.4em;">$</span><span id="carrito-total-valor" style="color:#28a745; font-size:1.4em;">0</span>
        </div>
        <button id="btn-finalizar-venta" disabled>✅ Cobrar</button>
      </div>
    </div>
  `;
  
  // Inyectar estilos locales
  const style = document.createElement('style');
  style.innerHTML = `
    .lista-resultados li { display: flex; justify-content: space-between; padding:12px; border-bottom:1px solid #eee; cursor:pointer; align-items:center; } 
    .lista-resultados li:hover { background:#f8f9fa; } 
    .resultado-icono { font-size:1.6em; margin-right:12px; } 
    .badge-tipo { background:#e9ecef; padding:2px 6px; border-radius:4px; font-size:0.85em; color:#495057; }
    .resultado-precio { font-weight:bold; color:#007bff; font-size:1.1em; }
    .lista-carrito { list-style:none; padding:0; margin:0; }
    .lista-carrito li { padding:10px 0; border-bottom:1px solid #f0f0f0; display:flex; justify-content:space-between; align-items:center; }
    .carrito-controles { display:flex; align-items:center; gap:5px; }
    .btn-cantidad { width:24px; height:24px; border-radius:50%; border:1px solid #ddd; background:white; cursor:pointer; font-weight:bold; color:#555; }
    .btn-cantidad:hover { background:#eee; }
  `;
  container.appendChild(style);

  renderCarrito();
  const input = document.getElementById('input-busqueda');

  // --- EVENTOS ---

  container.handleVentasClick = (e) => {
    const t = e.target;
    
    // Clic en resultado de búsqueda
    const li = t.closest('.lista-resultados li');
    if (li) {
      agregarAlCarrito(parseInt(li.dataset.id), li.dataset.tipo);
      input.value = ''; 
      document.getElementById('resultados-busqueda').innerHTML = ''; 
      input.focus();
      return;
    }
    
    // Clic en controles de carrito
    const btn = t.closest('.btn-cantidad');
    if (btn) {
      const id = btn.dataset.id;
      if (btn.dataset.action === 'inc') {
        const item = carrito.find(x => x.cartItemId === id);
        if (item) {
          // Validar stock antes de incrementar
          const p = todosLosProductos.find(x => x.id === item.productoId);
          const enCarrito = calcularUnidadesEnCarrito(item.productoId);
          // Permitir sumar solo si hay stock REAL disponible
          // Importante: 'enCarrito' ya incluye las unidades del item actual, así que sumamos 1 "paquete" más
          if ((enCarrito + item.unidadesPorItem) <= p.stock) {
             item.cantidad++; 
             renderCarrito();
          } else { 
             showError("No hay más stock disponible de este producto."); 
          }
        }
      }
      if (btn.dataset.action === 'dec') {
        const item = carrito.find(x => x.cartItemId === id);
        if (item) {
          item.cantidad--; 
          if (item.cantidad === 0) carrito = carrito.filter(x => x.cartItemId !== id);
          renderCarrito();
        }
      }
    }
    
    // Clic en finalizar
    if (t.id === 'btn-finalizar-venta') finalizarVenta();
  };

  container.handleVentasSubmit = (e) => {
    if (e.target.id === 'form-busqueda-producto') {
      e.preventDefault();
      const code = input.value.trim();
      if (!code) return;
      
      const p = todosLosProductos.find(x => x.codigo_barras === code);
      if (p) { 
        // Si escanea código, agregamos por defecto 1 UNIDAD
        // (A menos que quieras que agregue caja, pero usualmente el código es del producto unitario)
        agregarAlCarrito(p.id, 'unidad'); 
        input.value = ''; 
        document.getElementById('resultados-busqueda').innerHTML = ''; 
      } else { 
        showError("Producto no encontrado."); 
        input.select(); 
      }
    }
  };

  container.handleVentasInput = (e) => {
    const v = e.target.value.toLowerCase().trim();
    if (v.length < 2) { 
      document.getElementById('resultados-busqueda').innerHTML = ''; 
      return; 
    }
    
    const filtrados = todosLosProductos.filter(p => 
      p.nombre.toLowerCase().includes(v) || 
      (p.codigo_barras && p.codigo_barras.includes(v))
    );
    renderResultadosBusqueda(filtrados);
  };

  container.addEventListener('click', container.handleVentasClick);
  container.addEventListener('submit', container.handleVentasSubmit);
  input.addEventListener('input', container.handleVentasInput);
}