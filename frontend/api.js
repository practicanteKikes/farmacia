const API_URL = "http://localhost:3000/api";

function getToken() {
  return localStorage.getItem('farmacia_token');
}

async function apiCall(endpoint, method = 'GET', body = null) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers, cache: 'no-cache' };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_URL}/${endpoint}`, options);

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('farmacia_token');
    localStorage.removeItem('farmacia_user');
    window.location.reload();
    throw new Error("Sesión expirada.");
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Error en ${endpoint}`);
  }
  
  if (response.status === 204) return null;
  return response.json();
}

// Productos & Ventas
export const getProductosApi = () => apiCall('productos');
export const createProductoApi = (data) => apiCall('productos', 'POST', data);
export const updateProductoApi = (id, data) => apiCall(`productos/${id}`, 'PUT', data);
export const deleteProductoApi = (id) => apiCall(`productos/${id}`, 'DELETE');
export const createVentaApi = (data) => apiCall('ventas', 'POST', data);
export const getVentasApi = () => apiCall('ventas'); 
export const getCierreDiarioApi = (fecha) => apiCall(`ventas/cierre-diario?fecha=${fecha}`);
export const getVentasPorDiaApi = (fecha) => apiCall(`ventas/por-dia?fecha=${fecha}`);
export const getTopProductosApi = (periodo, fecha) => {
    const fechaParam = fecha ? `&fecha=${fecha}` : '';
    return apiCall(`ventas/top-productos?periodo=${periodo}${fechaParam}`);
};

// ⭐️ NUEVO: Actualizar Perfil
export const updateProfileApi = (data) => apiCall('profile', 'PUT', data);