import { addProduct, deleteProducto, getProductos, updateProducto } from './productos.js';
import { showConfirm, showSuccess, showError } from './utils/alerts.js';

// Función para mostrar el stock de forma bonita en la tabla
function formatearStock(stock, unidades_por_caja, tiene_sobres, unidades_por_sobre) {
  if (!stock) return '0';
  
  if (unidades_por_caja <= 1) return `${stock} Unid.`;

  const cajas = Math.floor(stock / unidades_por_caja);
  let resto = stock % unidades_por_caja;
  let sobres = 0;
  let sueltas = resto;

  // Aunque no lo pidamos en el formulario, aquí sí lo mostramos bonito
  if (tiene_sobres && unidades_por_sobre > 0) {
    sobres = Math.floor(resto / unidades_por_sobre);
    sueltas = resto % unidades_por_sobre;
  }

  let texto = [];
  if (cajas > 0) texto.push(`${cajas} Caja(s)`);
  if (sobres > 0) texto.push(`${sobres} Sobre(s)`);
  if (sueltas > 0) texto.push(`${sueltas} Unid.`);
  
  return texto.length > 0 ? texto.join(", ") : "0";
}

async function mostrarFormularioProducto(prod = {}) {
  const id = prod.id || null;
  const titulo = id ? '✏️ Editar Producto' : '➕ Nuevo Producto';
  
  const tieneSobres = prod.tiene_sobres === 1;
  const unidadesCaja = prod.unidades_por_caja || 1; 
  const sobresPorCaja = prod.sobres_por_caja || 1; 
  const unidadesPorSobre = prod.unidades_por_sobre || 1; 

  // --- LÓGICA SIMPLIFICADA DE STOCK ---
  // Solo calculamos Cajas y el Resto (Unidades sueltas totales)
  let stockCajas = 0;
  let stockSueltas = 0;
  
  if (prod.stock) {
    stockCajas = Math.floor(prod.stock / unidadesCaja);
    stockSueltas = prod.stock % unidadesCaja; // Todo lo que no es caja, es unidad suelta
  }

  const { value: formValues } = await Swal.fire({
    title: titulo,
    width: '700px',
    html: `
      <div class="swal-form-container" style="text-align:left; font-size:0.9rem;">
        
        <div class="swal-grupo">
          <input id="swal-nombre" class="swal2-input" placeholder="Nombre" value="${prod.nombre || ''}" style="flex:2">
          <input id="swal-codigo" class="swal2-input" placeholder="Código" value="${prod.codigo_barras || ''}" style="flex:1">
        </div>

        <div style="background:#f8f9fa; padding:10px; border-radius:8px; margin:10px 0; border:1px solid #dee2e6;">
          <label style="display:flex; align-items:center; cursor:pointer; font-weight:bold; color:#007bff; margin-bottom:10px;">
            <input type="checkbox" id="check-tiene-sobres" ${tieneSobres ? 'checked' : ''} style="width:20px; height:20px; margin-right:10px;">
            ¿Este producto se vende por Sobres?
          </label>

          <!-- OPCIÓN A: NORMAL -->
          <div id="config-normal" style="display:${tieneSobres ? 'none' : 'flex'}; gap:10px;">
            <div class="input-wrapper">
              <label>Unidades por Caja</label>
              <input id="swal-unidades-simple" class="swal2-input" type="number" min="1" value="${!tieneSobres ? unidadesCaja : 1}">
            </div>
          </div>

          <!-- OPCIÓN B: CON SOBRES -->
          <div id="config-sobres" style="display:${tieneSobres ? 'flex' : 'none'}; gap:10px;">
            <div class="input-wrapper">
              <label>Sobres por Caja</label>
              <input id="swal-sobres-caja" class="swal2-input" type="number" min="1" value="${sobresPorCaja}">
            </div>
            <div class="input-wrapper">
              <label>Unidades por Sobre</label>
              <input id="swal-unidades-sobre" class="swal2-input" type="number" min="1" value="${unidadesPorSobre}">
            </div>
          </div>
          
          <div class="input-wrapper" style="margin-top:10px;">
            <label>Costo de la Caja ($)</label>
            <input id="swal-costo-caja" class="swal2-input" type="number" min="0" value="${prod.costo_caja || ''}">
          </div>
        </div>

        <label class="swal-label">💰 Precios de Venta</label>
        <div class="swal-grupo">
          <div class="input-wrapper"><label>P. Caja</label><input id="swal-precio-caja" class="swal2-input" type="number" value="${prod.precio_caja || ''}"></div>,
          
          <div class="input-wrapper" id="div-precio-sobre" style="display:${tieneSobres ? 'block' : 'none'}">
            <label>P. Sobre</label><input id="swal-precio-sobre" class="swal2-input" type="number" value="${prod.precio_sobre || ''}">
          </div>
          
          <div class="input-wrapper"><label>P. Unidad</label><input id="swal-precio-unidad" class="swal2-input" type="number" value="${prod.precio || ''}"></div>
        </div>

        <!-- ⭐️ STOCK SIMPLIFICADO -->
        <label class="swal-label">🏭 Stock Físico</label>
        <div class="swal-grupo bg-gray">
          <div class="input-wrapper">
            <label>Cajas Cerradas</label>
            <input id="swal-stock-cajas" class="swal2-input" type="number" min="0" value="${stockCajas}">
          </div>
          
          <div class="input-wrapper">
            <label>Unidades Sueltas (Total)</label> 
            <input id="swal-stock-sueltas" class="swal2-input" type="number" min="0" value="${stockSueltas}">
            <small style="color:#666; font-size:0.75rem;">(Incluye el contenido de cajas abiertas)</small>
          </div>
        </div>

      </div>
    `,
    didOpen: () => {
      const check = document.getElementById('check-tiene-sobres');
      check.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        document.getElementById('config-normal').style.display = isChecked ? 'none' : 'flex';
        document.getElementById('config-sobres').style.display = isChecked ? 'flex' : 'none';
        document.getElementById('div-precio-sobre').style.display = isChecked ? 'block' : 'none';
      });
    },
    preConfirm: () => {
      const tieneSobres = document.getElementById('check-tiene-sobres').checked;
      
      let unidadesTotalCaja = 1;
      let sobresPorCaja = 1;
      let unidadesPorSobre = 1;

      if (tieneSobres) {
        sobresPorCaja = parseInt(document.getElementById('swal-sobres-caja').value) || 1;
        unidadesPorSobre = parseInt(document.getElementById('swal-unidades-sobre').value) || 1;
        unidadesTotalCaja = sobresPorCaja * unidadesPorSobre;
      } else {
        unidadesTotalCaja = parseInt(document.getElementById('swal-unidades-simple').value) || 1;
      }

      // Capturamos el stock simplificado
      const stCajas = parseInt(document.getElementById('swal-stock-cajas').value) || 0;
      const stSueltas = parseInt(document.getElementById('swal-stock-sueltas').value) || 0;

      // Calculamos el total
      const stockTotal = (stCajas * unidadesTotalCaja) + stSueltas;

      return {
        nombre: document.getElementById('swal-nombre').value,
        codigo_barras: document.getElementById('swal-codigo').value,
        tiene_sobres: tieneSobres,
        unidades_por_caja: unidadesTotalCaja,
        sobres_por_caja: sobresPorCaja,
        unidades_por_sobre: unidadesPorSobre,
        costo_caja: parseFloat(document.getElementById('swal-costo-caja').value),
        precio_caja: parseFloat(document.getElementById('swal-precio-caja').value),
        precio_sobre: parseFloat(document.getElementById('swal-precio-sobre').value),
        precio: parseFloat(document.getElementById('swal-precio-unidad').value),
        stock: stockTotal
      };
    }
  });
  return formValues;
}

export async function renderProductosView(container) {
  if (container.handleProductosClick) container.removeEventListener('click', container.handleProductosClick);
  const oldSearch = container.querySelector('#search-productos');
  if (oldSearch && container.handleSearchInput) oldSearch.removeEventListener('input', container.handleSearchInput);

  const role = localStorage.getItem('farmacia_role') || 'vendedor';
  const isAdmin = role === 'admin';

  console.log(`👤 Usuario actual - Rol: ${role}, ¿Es Admin?: ${isAdmin}`);

  container.innerHTML = `
    <div class="historial-header">
      <h2>Gestión de Productos ${isAdmin ? '(Modo Admin)' : '(Modo Lectura)'}</h2>
      ${isAdmin ? '<button id="btn-nuevo-producto" class="btn-primario">➕ Nuevo Producto</button>' : '<p style="color: #999; font-size: 0.9rem;">Solo lectura: requiere permisos de admin</p>'}
    </div>
    <div class="search-bar-container" style="margin-bottom: 15px;">
      <input type="text" id="search-productos" placeholder="🔍 Buscar..." style="width:100%; padding:10px;">
    </div>
    <div id="productos-lista-container">Cargando...</div>
  `;

  const listaContainer = document.getElementById('productos-lista-container');
  let todosLosProductos = [];

  const dibujarTabla = (productos) => {
    if (!productos || productos.length === 0) {
      listaContainer.innerHTML = '<p>No hay productos.</p>';
      return;
    }
    listaContainer.innerHTML = `
      <table class="tabla-productos">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Stock</th>
            <th>P. Unidad</th>
            <th>P. Sobre</th>
            <th>P. Caja</th>
            ${isAdmin ? '<th>Acciones</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${productos.map(p => `
            <tr>
              <td><strong>${p.nombre}</strong><br><small>${p.codigo_barras || ''}</small></td>
              <td>
                <span style="color:#007bff; font-weight:bold">
                  ${formatearStock(p.stock, p.unidades_por_caja, p.tiene_sobres, p.unidades_por_sobre)}
                </span>
              </td>
              <td>$${p.precio.toLocaleString()}</td>
              <td>${p.tiene_sobres ? `$${p.precio_sobre.toLocaleString()}` : '-'}</td>
              <td>${p.unidades_por_caja > 1 ? `$${p.precio_caja.toLocaleString()}` : '-'}</td>
              ${isAdmin ? `<td>
                <button data-id="${p.id}" data-action="editar">✏️</button>
                <button data-id="${p.id}" data-action="eliminar">🗑️</button>
              </td>` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  try {
    todosLosProductos = await getProductos();
    dibujarTabla(todosLosProductos);
  } catch (error) { listaContainer.innerHTML = `<p>${error.message}</p>`; }

  container.handleSearchInput = (e) => {
    const t = e.target.value.toLowerCase();
    dibujarTabla(todosLosProductos.filter(p => p.nombre.toLowerCase().includes(t) || (p.codigo_barras && p.codigo_barras.includes(t))));
  };
  document.getElementById('search-productos').addEventListener('input', container.handleSearchInput);

  container.handleProductosClick = async (e) => {
    if (!isAdmin && (e.target.closest('#btn-nuevo-producto') || e.target.closest('[data-action]'))) {
      showError('No tienes permisos para editar productos');
      return;
    }

    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    
    if (btn.id === 'btn-nuevo-producto') {
      const data = await mostrarFormularioProducto();
      if (data) { await addProduct(data); showSuccess('Producto creado'); todosLosProductos = await getProductos(); dibujarTabla(todosLosProductos); document.getElementById('search-productos').value='';}
    } else if (action === 'editar') {
      const p = todosLosProductos.find(x => x.id == id);
      const data = await mostrarFormularioProducto(p);
      if (data) { await updateProducto(id, data); showSuccess('Producto actualizado'); todosLosProductos = await getProductos(); dibujarTabla(todosLosProductos); document.getElementById('search-productos').value=''; }
    } else if (action === 'eliminar') {
      if ((await showConfirm('¿Eliminar?')).isConfirmed) { await deleteProducto(id); showSuccess('Eliminado'); todosLosProductos = await getProductos(); dibujarTabla(todosLosProductos); document.getElementById('search-productos').value=''; }
    }
  };
  container.addEventListener('click', container.handleProductosClick);

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