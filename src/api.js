/**
 * API Service for TuDelicia
 * Consumes the backend at http://localhost:3000/api
 */

const DEFAULT_API_URL = 'http://localhost:8080';
const STORAGE_KEY = 'tudelicia_api_url';

export function getApiBaseUrl() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_API_URL;
}

export function setApiBaseUrl(url) {
  if (!url) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    // Remove trailing slash if present
    const cleanUrl = url.replace(/\/+$/, '');
    localStorage.setItem(STORAGE_KEY, cleanUrl);
  }
}

/**
 * Normalizes a product response to standard frontend schema
 */
export function normalizeProduct(raw) {
  if (!raw) return null;
  return {
    id: Number(raw.id),
    name: raw.nombre || raw.name || 'Sin nombre',
    description: raw.descripcion || raw.description || '',
    price: Number(raw.precio !== undefined ? raw.precio : raw.price) || 0,
    stock: Number(raw.stock) || 0,
    imageUrl: raw.imagen_url || raw.imageUrl || raw.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString()
  };
}

/**
 * Formats data for backend POST / PUT
 */
export function formatProductPayload(data) {
  const price = parseFloat(data.price || data.precio || 0);
  const stock = parseInt(data.stock || 0, 10);
  const name = (data.name || data.nombre || '').trim();
  const description = (data.description || data.descripcion || '').trim();
  const imageUrl = (data.imageUrl || data.imagen_url || '').trim();

  return {
    name,
    nombre: name,
    description,
    descripcion: description,
    price,
    precio: price,
    stock,
    imagen_url: imageUrl
  };
}

/**
 * GET /products - Fetch all products
 */
export async function fetchProducts() {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/products`, {
    headers: { 'Accept': 'application/json' }
  });

  if (!res.ok) {
    throw new Error(`Error al obtener productos (${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('La respuesta de productos no es un array válido');
  }

  return data.map(normalizeProduct);
}

/**
 * GET /products/:id - Fetch product by ID
 */
export async function fetchProductById(id) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/products/${id}`, {
    headers: { 'Accept': 'application/json' }
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Producto con ID ${id} no encontrado`);
    }
    throw new Error(`Error al obtener producto (${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  return normalizeProduct(data);
}

/**
 * POST /products - Create a new product
 */
export async function createProduct(productData) {
  const base = getApiBaseUrl();
  const payload = formatProductPayload(productData);

  const res = await fetch(`${base}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`Error al crear producto (${res.status}): ${errorBody || res.statusText}`);
  }

  const data = await res.json();
  return normalizeProduct(data);
}

/**
 * PUT /products/:id - Update product
 */
export async function updateProduct(id, productData) {
  const base = getApiBaseUrl();
  const payload = formatProductPayload(productData);

  const res = await fetch(`${base}/products/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`Error al actualizar producto (${res.status}): ${errorBody || res.statusText}`);
  }

  const data = await res.json();
  return normalizeProduct(data);
}

/**
 * DELETE /products/:id - Delete product
 */
export async function deleteProduct(id) {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/products/${id}`, {
    method: 'DELETE',
    headers: { 'Accept': 'application/json' }
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`Error al eliminar producto (${res.status}): ${errorBody || res.statusText}`);
  }

  const data = await res.json().catch(() => ({}));
  return data;
}

/**
 * Health check / ping API server
 */
export async function checkApiHealth() {
  const base = getApiBaseUrl();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${base}/products`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return { ok: res.ok, status: res.status, url: base };
  } catch (err) {
    return { ok: false, error: err.message, url: base };
  }
}
