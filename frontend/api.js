// frontend/api.js

const API_URL = "http://localhost:3000/api";
const TOKEN = "mi-token-supersecreto"; 

async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
    cache: 'no-cache', // <-- AÑADE ESTA LÍNEA
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}/${endpoint}`, options);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Error en la petición a ${endpoint}`);
  }
  
  // No intentar parsear JSON si la respuesta no tiene contenido (ej. en DELETE)
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
}

// Funciones de Productos
export const getProductosApi = () => apiCall('productos');
export const createProductoApi = (data) => apiCall('productos', 'POST', data);
export const updateProductoApi = (id, data) => apiCall(`productos/${id}`, 'PUT', data);
export const deleteProductoApi = (id) => apiCall(`productos/${id}`, 'DELETE');


export const createVentaApi = (data) => apiCall('ventas', 'POST', data);
export const getVentasApi = () => apiCall('ventas');

export const getCierreDiarioApi = (fecha) => apiCall(`ventas/cierre-diario?fecha=${fecha}`);
export const getVentasPorDiaApi = (fecha) => apiCall(`ventas/por-dia?fecha=${fecha}`);