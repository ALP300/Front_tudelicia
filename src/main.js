import './style.css';
import {
  fetchProducts,
  fetchProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  checkApiHealth,
  getApiBaseUrl,
  setApiBaseUrl
} from './api.js';
import { showToast } from './toast.js';
import { cart } from './cart.js';
import {
  createIcons,
  ShoppingBag,
  Store,
  Layers,
  Search,
  Plus,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  Sun,
  Moon,
  CheckCircle,
  AlertTriangle,
  Package,
  DollarSign,
  TrendingUp,
  X,
  ExternalLink,
  Settings,
  ArrowRight,
  Sparkles
} from 'lucide';

// Preset sample food & gourmet images for quick creation
const IMAGE_PRESETS = [
  { name: 'Tarta de Frutos Rojos', url: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600' },
  { name: 'Hamburguesa Gourmet', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600' },
  { name: 'Café Latte Artesanal', url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600' },
  { name: 'Pastel de Chocolate', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600' },
  { name: 'Pizza Napolitana', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600' },
  { name: 'Croissant Mantequilla', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600' }
];

class App {
  constructor() {
    this.products = [];
    this.filteredProducts = [];
    this.activeView = 'catalog'; // 'catalog' | 'inventory'
    this.searchQuery = '';
    this.sortBy = 'default';
    this.stockFilter = 'all';
    this.isLoading = false;
    this.apiConnected = false;
    this.currentEditProduct = null;
    this.currentDeleteId = null;

    this.init();
  }

  async init() {
    this.setupTheme();
    this.renderSkeletonLayout();
    this.attachGlobalListeners();
    this.subscribeCart();
    await this.testConnection();
    await this.loadProducts();
  }

  setupTheme() {
    const savedTheme = localStorage.getItem('tudelicia_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tudelicia_theme', next);
    this.updateThemeButton();
  }

  updateThemeButton() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}"></i>`;
    btn.setAttribute('title', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    this.refreshIcons();
  }

  refreshIcons() {
    createIcons({
      icons: {
        ShoppingBag,
        Store,
        Layers,
        Search,
        Plus,
        Trash2,
        Edit,
        Eye,
        RefreshCw,
        Sun,
        Moon,
        CheckCircle,
        AlertTriangle,
        Package,
        DollarSign,
        TrendingUp,
        X,
        ExternalLink,
        Settings,
        ArrowRight,
        Sparkles
      }
    });
  }

  async testConnection() {
    const health = await checkApiHealth();
    this.apiConnected = health.ok;
    this.updateStatusBadge(health);
  }

  updateStatusBadge(health) {
    const badge = document.getElementById('api-status-badge');
    if (!badge) return;

    if (this.apiConnected) {
      badge.innerHTML = `
        <span class="status-dot connected"></span>
        <span>API Conectada (${new URL(getApiBaseUrl()).port || '3000'})</span>
      `;
      badge.className = 'api-status-badge';
    } else {
      badge.innerHTML = `
        <span class="status-dot disconnected"></span>
        <span>API Desconectada</span>
      `;
      badge.className = 'api-status-badge';
    }
  }

  async loadProducts() {
    this.isLoading = true;
    this.renderProductsSection();
    try {
      this.products = await fetchProducts();
      this.apiConnected = true;
      this.updateStatusBadge({ ok: true });
    } catch (err) {
      console.error('Error fetching products:', err);
      this.apiConnected = false;
      this.updateStatusBadge({ ok: false });
      showToast(`No se pudo conectar a ${getApiBaseUrl()}. Verifica que el backend esté corriendo.`, 'error', 5000);
    } finally {
      this.isLoading = false;
      this.applyFilters();
      this.render();
    }
  }

  applyFilters() {
    let list = [...this.products];

    // Search query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        String(p.id) === q
      );
    }

    // Stock filter
    if (this.stockFilter === 'in-stock') {
      list = list.filter(p => p.stock > 0);
    } else if (this.stockFilter === 'low-stock') {
      list = list.filter(p => p.stock > 0 && p.stock < 10);
    } else if (this.stockFilter === 'out-of-stock') {
      list = list.filter(p => p.stock <= 0);
    }

    // Sorting
    if (this.sortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (this.sortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (this.sortBy === 'name-asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortBy === 'stock-asc') {
      list.sort((a, b) => a.stock - b.stock);
    } else {
      // Default: sort by ID descending (newest first)
      list.sort((a, b) => b.id - a.id);
    }

    this.filteredProducts = list;
  }

  calculateStats() {
    const totalProducts = this.products.length;
    const totalStock = this.products.reduce((acc, p) => acc + (p.stock || 0), 0);
    const totalValue = this.products.reduce((acc, p) => acc + (p.price * (p.stock || 0)), 0);
    const lowStockCount = this.products.filter(p => p.stock > 0 && p.stock < 10).length;

    return { totalProducts, totalStock, totalValue, lowStockCount };
  }

  formatCurrency(val) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(val || 0);
  }

  renderSkeletonLayout() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const appEl = document.getElementById('app');
    appEl.innerHTML = `
      <div class="app-container">
        <!-- HEADER NAVBAR -->
        <header class="navbar">
          <div class="nav-inner">
            <div class="brand-wrapper" id="brand-home-btn">
              <div class="brand-logo-icon">🧁</div>
              <div class="brand-text">
                <h1>TUDELICIA</h1>
                <span>Sabor & Inventario Gourmet</span>
              </div>
            </div>

            <nav class="nav-center">
              <button class="nav-tab-btn active" id="tab-catalog" data-view="catalog">
                <i data-lucide="store"></i>
                <span>Catálogo</span>
              </button>
              <button class="nav-tab-btn" id="tab-inventory" data-view="inventory">
                <i data-lucide="layers"></i>
                <span>Inventario</span>
              </button>
            </nav>

            <div class="nav-actions">
              <button class="api-status-badge" id="api-status-badge" title="Configurar conexión API">
                <span class="status-dot"></span>
                <span>Conectando...</span>
              </button>

              <button class="btn-primary" id="btn-open-create">
                <i data-lucide="plus"></i>
                <span>Nuevo Producto</span>
              </button>

              <button class="icon-btn" id="btn-open-cart" title="Ver Carrito de Compras">
                <i data-lucide="shopping-bag"></i>
                <span class="badge-count" id="cart-badge">0</span>
              </button>

              <button class="icon-btn" id="theme-toggle-btn" title="Alternar tema">
                <i data-lucide="${isDark ? 'sun' : 'moon'}"></i>
              </button>

              <button class="icon-btn" id="btn-open-settings" title="Ajustes de API">
                <i data-lucide="settings"></i>
              </button>
            </div>
          </div>
        </header>

        <!-- MAIN VIEW -->
        <main class="main-content">
          <!-- KPI METRICS -->
          <section class="kpi-grid" id="kpi-section"></section>

          <!-- TOOLBAR CONTROLS -->
          <section class="toolbar-section">
            <div class="search-box">
              <i data-lucide="search"></i>
              <input 
                type="text" 
                id="search-input" 
                class="search-input" 
                placeholder="Buscar por nombre, descripción o ID..." 
                value="${this.searchQuery}"
              />
            </div>

            <div class="filters-group">
              <select id="filter-stock" class="filter-select">
                <option value="all">Todo el Inventario</option>
                <option value="in-stock">En Stock (> 0)</option>
                <option value="low-stock">Stock Bajo (< 10)</option>
                <option value="out-of-stock">Agotados (0)</option>
              </select>

              <select id="filter-sort" class="filter-select">
                <option value="default">Recientes primero</option>
                <option value="price-asc">Precio: Menor a Mayor</option>
                <option value="price-desc">Precio: Mayor a Menor</option>
                <option value="name-asc">Nombre (A-Z)</option>
                <option value="stock-asc">Menor Stock</option>
              </select>

              <button class="btn-secondary" id="btn-refresh" title="Recargar productos">
                <i data-lucide="refresh-cw"></i>
                <span>Actualizar</span>
              </button>
            </div>
          </section>

          <!-- VIEW CONTAINER -->
          <div id="view-container"></div>
        </main>
      </div>

      <!-- CREATE / EDIT PRODUCT MODAL -->
      <div class="modal-backdrop" id="product-modal">
        <div class="modal-dialog">
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="modal-icon"><i data-lucide="package"></i></div>
              <h2 class="modal-title" id="modal-form-title">Nuevo Producto</h2>
            </div>
            <button class="modal-close" id="btn-close-product-modal">&times;</button>
          </div>
          <form id="product-form">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Nombre del Producto <span class="req">*</span></label>
                <input type="text" id="form-name" class="form-control" placeholder="Ej: Tarta Selva Negra Gourmet" required />
              </div>

              <div class="form-group">
                <label class="form-label">Descripción <span class="req">*</span></label>
                <textarea id="form-description" class="form-control" placeholder="Describe los ingredientes, sabor o características..." required></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Precio ($ MXN) <span class="req">*</span></label>
                  <input type="number" id="form-price" class="form-control" step="0.01" min="0" placeholder="0.00" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Stock en Inventario <span class="req">*</span></label>
                  <input type="number" id="form-stock" class="form-control" min="0" step="1" placeholder="Cantidad" required />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">URL de la Imagen</label>
                <input type="url" id="form-image" class="form-control" placeholder="https://ejemplo.com/imagen.jpg" />
                
                <div style="margin-top: 0.6rem;">
                  <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.35rem;">Sugerencias rápidas de delicias:</span>
                  <div class="quick-image-presets">
                    ${IMAGE_PRESETS.map((p, idx) => `
                      <button type="button" class="preset-chip" data-url="${p.url}" data-name="${p.name}">
                        ${p.name}
                      </button>
                    `).join('')}
                  </div>
                </div>

                <div class="image-preview-wrapper">
                  <img id="form-image-preview" class="image-preview" src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500" alt="Vista previa" />
                  <span style="font-size: 0.8rem; color: var(--text-muted);">Vista previa de la imagen del producto</span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" id="btn-cancel-product-modal">Cancelar</button>
              <button type="submit" class="btn-primary" id="btn-save-product">
                <i data-lucide="check-circle"></i>
                <span id="btn-save-text">Guardar Producto</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- PRODUCT DETAIL MODAL (GET /products/:id) -->
      <div class="modal-backdrop" id="detail-modal">
        <div class="modal-dialog" style="max-width: 680px;">
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="modal-icon"><i data-lucide="eye"></i></div>
              <h2 class="modal-title" id="detail-modal-title">Detalle del Producto</h2>
            </div>
            <button class="modal-close" id="btn-close-detail-modal">&times;</button>
          </div>
          <div class="modal-body" id="detail-modal-body">
            <!-- Dynamic content injected here -->
          </div>
          <div class="modal-footer" id="detail-modal-footer"></div>
        </div>
      </div>

      <!-- DELETE CONFIRMATION MODAL -->
      <div class="modal-backdrop" id="delete-modal">
        <div class="modal-dialog" style="max-width: 440px;">
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="modal-icon" style="background: var(--status-danger);"><i data-lucide="alert-triangle"></i></div>
              <h2 class="modal-title">Confirmar Eliminación</h2>
            </div>
            <button class="modal-close" id="btn-close-delete-modal">&times;</button>
          </div>
          <div class="modal-body">
            <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5;" id="delete-modal-text">
              ¿Estás seguro de que deseas eliminar este producto? Esta acción consumirá el endpoint DELETE de tu backend y no se puede deshacer.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" id="btn-cancel-delete">Cancelar</button>
            <button class="btn-danger" id="btn-confirm-delete">
              <i data-lucide="trash-2"></i>
              <span>Eliminar Producto</span>
            </button>
          </div>
        </div>
      </div>

      <!-- API SETTINGS MODAL -->
      <div class="modal-backdrop" id="settings-modal">
        <div class="modal-dialog" style="max-width: 500px;">
          <div class="modal-header">
            <div class="modal-title-group">
              <div class="modal-icon"><i data-lucide="settings"></i></div>
              <h2 class="modal-title">Configuración de API</h2>
            </div>
            <button class="modal-close" id="btn-close-settings-modal">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">URL Base de la API (Backend)</label>
              <input type="text" id="settings-api-url" class="form-control" value="${getApiBaseUrl()}" />
              <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                <button type="button" class="preset-chip" id="btn-preset-local">Localhost (http://localhost:3000/api)</button>
                <button type="button" class="preset-chip" id="btn-preset-render">Render (Producción)</button>
              </div>
            </div>
            <div id="settings-test-result" style="margin-top: 1rem; font-size: 0.85rem;"></div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" id="btn-test-settings-connection">Probar Conexión</button>
            <button class="btn-primary" id="btn-save-settings">Guardar y Recargar</button>
          </div>
        </div>
      </div>

      <!-- SHOPPING CART DRAWER -->
      <div class="drawer-backdrop" id="cart-drawer">
        <div class="drawer-panel">
          <div class="drawer-header">
            <h2 class="drawer-title">
              <i data-lucide="shopping-bag" style="color: var(--accent-amber);"></i>
              <span>Tu Carrito</span>
            </h2>
            <button class="modal-close" id="btn-close-cart">&times;</button>
          </div>
          <div class="drawer-body" id="cart-items-container"></div>
          <div class="drawer-footer" id="cart-footer"></div>
        </div>
      </div>
    `;

    this.refreshIcons();
  }

  render() {
    this.renderKPIs();
    this.renderProductsSection();
    this.refreshIcons();
  }

  renderKPIs() {
    const kpiSection = document.getElementById('kpi-section');
    if (!kpiSection) return;

    const { totalProducts, totalStock, totalValue, lowStockCount } = this.calculateStats();

    kpiSection.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon-wrap amber"><i data-lucide="package"></i></div>
        <div class="kpi-info">
          <span class="kpi-label">Total Productos</span>
          <span class="kpi-value">${totalProducts}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-wrap green"><i data-lucide="dollar-sign"></i></div>
        <div class="kpi-info">
          <span class="kpi-label">Valor del Inventario</span>
          <span class="kpi-value">${this.formatCurrency(totalValue)}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-wrap blue"><i data-lucide="trending-up"></i></div>
        <div class="kpi-info">
          <span class="kpi-label">Unidades en Stock</span>
          <span class="kpi-value">${totalStock}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon-wrap red"><i data-lucide="alert-triangle"></i></div>
        <div class="kpi-info">
          <span class="kpi-label">Stock Crítico (< 10)</span>
          <span class="kpi-value">${lowStockCount}</span>
        </div>
      </div>
    `;
  }

  renderProductsSection() {
    const container = document.getElementById('view-container');
    if (!container) return;

    if (this.isLoading) {
      container.innerHTML = `
        <div class="skeleton-grid">
          ${[1, 2, 3, 4, 5, 6].map(() => `<div class="skeleton-card"></div>`).join('')}
        </div>
      `;
      return;
    }

    if (this.filteredProducts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🧁</div>
          <h3 class="empty-title">No hay delicias encontradas</h3>
          <p class="empty-desc">
            ${this.searchQuery ? `No encontramos resultados para "${this.searchQuery}". Intenta otra búsqueda o limpia los filtros.` : 'Aún no hay productos en la base de datos o el inventario está vacío.'}
          </p>
          <button class="btn-primary" id="btn-empty-create">
            <i data-lucide="plus"></i>
            <span>Agregar Primer Producto</span>
          </button>
        </div>
      `;
      document.getElementById('btn-empty-create')?.addEventListener('click', () => this.openCreateModal());
      return;
    }

    if (this.activeView === 'catalog') {
      this.renderCatalogView(container);
    } else {
      this.renderInventoryView(container);
    }
  }

  renderCatalogView(container) {
    container.innerHTML = `
      <div class="products-grid">
        ${this.filteredProducts.map(p => this.createProductCardHtml(p)).join('')}
      </div>
    `;
    this.attachProductCardEvents();
  }

  createProductCardHtml(p) {
    let stockClass = 'in-stock';
    let stockText = `${p.stock} en stock`;
    if (p.stock <= 0) {
      stockClass = 'out-of-stock';
      stockText = 'Agotado';
    } else if (p.stock < 10) {
      stockClass = 'low-stock';
      stockText = `¡Últimas ${p.stock}!`;
    }

    return `
      <article class="product-card" data-id="${p.id}">
        <div class="product-image-container">
          <img 
            src="${p.imageUrl}" 
            alt="${p.name}" 
            class="product-image" 
            loading="lazy" 
            onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'"
          />
          <div class="product-badges">
            <span class="stock-badge ${stockClass}">${stockText}</span>
            <span class="id-badge">#${p.id}</span>
          </div>

          <div class="quick-admin-actions">
            <button class="quick-action-btn edit-product-btn" data-id="${p.id}" title="Editar (PUT)">
              <i data-lucide="edit"></i>
            </button>
            <button class="quick-action-btn delete-btn delete-product-btn" data-id="${p.id}" title="Eliminar (DELETE)">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>

        <div class="product-body">
          <h3 class="product-title">${p.name}</h3>
          <p class="product-desc">${p.description || 'Sin descripción detallada.'}</p>

          <div class="product-footer">
            <div class="price-container">
              <span class="price-label">Precio</span>
              <span class="price-tag">${this.formatCurrency(p.price)}</span>
            </div>

            <div class="card-actions">
              <button class="btn-view-details view-detail-btn" data-id="${p.id}" title="Ver Detalles">
                <i data-lucide="eye"></i>
              </button>
              <button 
                class="btn-add-cart add-to-cart-btn" 
                data-id="${p.id}" 
                ${p.stock <= 0 ? 'disabled' : ''}
              >
                <i data-lucide="shopping-bag"></i>
                <span>${p.stock <= 0 ? 'Agotado' : 'Agregar'}</span>
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  renderInventoryView(container) {
    container.innerHTML = `
      <div class="table-card">
        <div class="table-wrapper">
          <table class="inventory-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>ID</th>
                <th>Precio</th>
                <th>Inventario / Stock</th>
                <th>Estado</th>
                <th>Acciones API</th>
              </tr>
            </thead>
            <tbody>
              ${this.filteredProducts.map(p => this.createTableRowHtml(p)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    this.attachTableEvents();
  }

  createTableRowHtml(p) {
    let stockLevel = 'high';
    let stockBadgeClass = 'in-stock';
    let statusLabel = 'Disponible';
    if (p.stock <= 0) {
      stockLevel = 'low';
      stockBadgeClass = 'out-of-stock';
      statusLabel = 'Agotado';
    } else if (p.stock < 10) {
      stockLevel = 'medium';
      stockBadgeClass = 'low-stock';
      statusLabel = 'Stock Bajo';
    }

    const percentage = Math.min(100, Math.max(0, (p.stock / 50) * 100));

    return `
      <tr data-id="${p.id}">
        <td>
          <div class="table-product-cell">
            <img 
              src="${p.imageUrl}" 
              alt="${p.name}" 
              class="table-thumb" 
              onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'"
            />
            <div>
              <div class="table-product-title">${p.name}</div>
              <div class="table-product-desc">${p.description || 'Sin descripción'}</div>
            </div>
          </div>
        </td>
        <td><span class="id-badge">#${p.id}</span></td>
        <td><strong style="color: var(--accent-amber);">${this.formatCurrency(p.price)}</strong></td>
        <td>
          <div class="stock-meter-container">
            <div class="stock-meter-header">
              <span>${p.stock} unid.</span>
            </div>
            <div class="stock-bar-track">
              <div class="stock-bar-fill ${stockLevel}" style="width: ${percentage}%"></div>
            </div>
          </div>
        </td>
        <td>
          <span class="stock-badge ${stockBadgeClass}">${statusLabel}</span>
        </td>
        <td>
          <div class="table-actions-group">
            <button class="table-action-btn view-detail-btn" data-id="${p.id}" title="Ver (GET /id)">
              <i data-lucide="eye"></i>
            </button>
            <button class="table-action-btn edit edit-product-btn" data-id="${p.id}" title="Editar (PUT /id)">
              <i data-lucide="edit"></i>
            </button>
            <button class="table-action-btn delete delete-product-btn" data-id="${p.id}" title="Eliminar (DELETE /id)">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  attachProductCardEvents() {
    document.querySelectorAll('.view-detail-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        this.openDetailModal(id);
      });
    });

    document.querySelectorAll('.edit-product-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        this.openEditModal(id);
      });
    });

    document.querySelectorAll('.delete-product-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        this.openDeleteModal(id);
      });
    });

    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        const product = this.products.find(p => p.id === id);
        if (product) {
          const res = cart.addItem(product, 1);
          if (res.success) {
            showToast(`¡"${product.name}" agregado al carrito!`, 'success');
          } else if (res.reason === 'stock_limit') {
            showToast(`No puedes agregar más: alcanzaste el stock disponible (${product.stock})`, 'warning');
          } else {
            showToast('Producto agotado', 'error');
          }
        }
      });
    });
  }

  attachTableEvents() {
    this.attachProductCardEvents();
  }

  attachGlobalListeners() {
    // Navigation Tabs
    const tabCatalog = document.getElementById('tab-catalog');
    const tabInventory = document.getElementById('tab-inventory');
    const brandHome = document.getElementById('brand-home-btn');

    const switchView = (view) => {
      this.activeView = view;
      tabCatalog.classList.toggle('active', view === 'catalog');
      tabInventory.classList.toggle('active', view === 'inventory');
      this.render();
    };

    tabCatalog.addEventListener('click', () => switchView('catalog'));
    tabInventory.addEventListener('click', () => switchView('inventory'));
    brandHome.addEventListener('click', () => switchView('catalog'));

    // Theme toggle
    document.getElementById('theme-toggle-btn').addEventListener('click', () => this.toggleTheme());

    // Search input with instant filtering
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.applyFilters();
      this.renderProductsSection();
      this.refreshIcons();
    });

    // Stock Filter
    document.getElementById('filter-stock').addEventListener('change', (e) => {
      this.stockFilter = e.target.value;
      this.applyFilters();
      this.renderProductsSection();
      this.refreshIcons();
    });

    // Sort Filter
    document.getElementById('filter-sort').addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.applyFilters();
      this.renderProductsSection();
      this.refreshIcons();
    });

    // Refresh Button
    document.getElementById('btn-refresh').addEventListener('click', async () => {
      showToast('Actualizando productos desde API...', 'info', 2000);
      await this.loadProducts();
      showToast('Catálogo sincronizado exitosamente', 'success');
    });

    // Open Create Modal
    document.getElementById('btn-open-create').addEventListener('click', () => this.openCreateModal());

    // Product Form Submit (POST or PUT)
    document.getElementById('product-form').addEventListener('submit', (e) => this.handleProductFormSubmit(e));
    document.getElementById('btn-close-product-modal').addEventListener('click', () => this.closeProductModal());
    document.getElementById('btn-cancel-product-modal').addEventListener('click', () => this.closeProductModal());

    // Form Image Live Preview
    const imgInput = document.getElementById('form-image');
    const imgPreview = document.getElementById('form-image-preview');
    imgInput.addEventListener('input', (e) => {
      imgPreview.src = e.target.value || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
    });

    // Preset Image Chips
    document.querySelectorAll('.preset-chip[data-url]').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const url = e.currentTarget.dataset.url;
        imgInput.value = url;
        imgPreview.src = url;
        const nameInput = document.getElementById('form-name');
        if (!nameInput.value) {
          nameInput.value = e.currentTarget.dataset.name;
        }
      });
    });

    // Detail Modal Close
    document.getElementById('btn-close-detail-modal').addEventListener('click', () => this.closeDetailModal());

    // Delete Modal Events
    document.getElementById('btn-close-delete-modal').addEventListener('click', () => this.closeDeleteModal());
    document.getElementById('btn-cancel-delete').addEventListener('click', () => this.closeDeleteModal());
    document.getElementById('btn-confirm-delete').addEventListener('click', () => this.confirmDeleteProduct());

    // API Status & Settings
    document.getElementById('api-status-badge').addEventListener('click', () => this.openSettingsModal());
    document.getElementById('btn-open-settings').addEventListener('click', () => this.openSettingsModal());
    document.getElementById('btn-close-settings-modal').addEventListener('click', () => this.closeSettingsModal());
    document.getElementById('btn-preset-local').addEventListener('click', () => {
      document.getElementById('settings-api-url').value = 'http://localhost:3000/api';
    });
    document.getElementById('btn-preset-render').addEventListener('click', () => {
      document.getElementById('settings-api-url').value = 'https://eccomerce-javascript.onrender.com/api';
    });
    document.getElementById('btn-test-settings-connection').addEventListener('click', () => this.testSettingsConnection());
    document.getElementById('btn-save-settings').addEventListener('click', () => this.saveSettings());

    // Cart Drawer
    document.getElementById('btn-open-cart').addEventListener('click', () => this.openCart());
    document.getElementById('btn-close-cart').addEventListener('click', () => this.closeCart());
    document.getElementById('cart-drawer').addEventListener('click', (e) => {
      if (e.target.id === 'cart-drawer') this.closeCart();
    });

    // Close modals on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeProductModal();
        this.closeDetailModal();
        this.closeDeleteModal();
        this.closeSettingsModal();
        this.closeCart();
      }
    });
  }

  // MODAL: CREATE / EDIT PRODUCT
  openCreateModal() {
    this.currentEditProduct = null;
    document.getElementById('modal-form-title').textContent = 'Nuevo Producto';
    document.getElementById('btn-save-text').textContent = 'Crear Producto';
    document.getElementById('product-form').reset();
    document.getElementById('form-image-preview').src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
    document.getElementById('product-modal').classList.add('open');
  }

  openEditModal(id) {
    const p = this.products.find(item => item.id === id);
    if (!p) return;

    this.currentEditProduct = p;
    document.getElementById('modal-form-title').textContent = `Editar Producto #${p.id}`;
    document.getElementById('btn-save-text').textContent = 'Actualizar Cambios';

    document.getElementById('form-name').value = p.name;
    document.getElementById('form-description').value = p.description;
    document.getElementById('form-price').value = p.price;
    document.getElementById('form-stock').value = p.stock;
    document.getElementById('form-image').value = p.imageUrl;
    document.getElementById('form-image-preview').src = p.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';

    document.getElementById('product-modal').classList.add('open');
  }

  closeProductModal() {
    document.getElementById('product-modal').classList.remove('open');
    this.currentEditProduct = null;
  }

  async handleProductFormSubmit(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('btn-save-product');
    const originalText = document.getElementById('btn-save-text').textContent;
    saveBtn.disabled = true;
    document.getElementById('btn-save-text').textContent = 'Guardando...';

    const payload = {
      name: document.getElementById('form-name').value,
      description: document.getElementById('form-description').value,
      price: parseFloat(document.getElementById('form-price').value),
      stock: parseInt(document.getElementById('form-stock').value, 10),
      imageUrl: document.getElementById('form-image').value || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
    };

    try {
      if (this.currentEditProduct) {
        // PUT /products/:id
        const updated = await updateProduct(this.currentEditProduct.id, payload);
        showToast(`Producto #${updated.id} "${updated.name}" actualizado exitosamente`, 'success');
      } else {
        // POST /products
        const created = await createProduct(payload);
        showToast(`¡Producto "${created.name}" creado con éxito!`, 'success');
      }

      this.closeProductModal();
      await this.loadProducts();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error', 6000);
    } finally {
      saveBtn.disabled = false;
      document.getElementById('btn-save-text').textContent = originalText;
    }
  }

  // MODAL: DETAIL VIEW (GET /products/:id)
  async openDetailModal(id) {
    const modal = document.getElementById('detail-modal');
    const body = document.getElementById('detail-modal-body');
    const footer = document.getElementById('detail-modal-footer');
    
    body.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <i data-lucide="refresh-cw" class="spin" style="width: 32px; height: 32px; color: var(--accent-amber);"></i>
        <p style="margin-top: 1rem; color: var(--text-secondary);">Consultando GET /products/${id}...</p>
      </div>
    `;
    this.refreshIcons();
    modal.classList.add('open');

    try {
      const product = await fetchProductById(id);
      document.getElementById('detail-modal-title').textContent = `${product.name} (#${product.id})`;

      const dateStr = product.createdAt 
        ? new Date(product.createdAt).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })
        : 'Reciente';

      body.innerHTML = `
        <div class="detail-modal-layout">
          <div>
            <img 
              src="${product.imageUrl}" 
              alt="${product.name}" 
              class="detail-image" 
              onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'"
            />
          </div>
          <div>
            <h3 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 0.5rem; font-family: var(--font-heading);">
              ${product.name}
            </h3>
            <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.25rem;">
              ${product.description || 'Sin descripción detallada.'}
            </p>

            <div class="detail-specs-list">
              <div class="detail-spec-item">
                <span class="detail-spec-label">Precio Unitario</span>
                <span class="detail-spec-val" style="color: var(--accent-amber); font-size: 1.15rem;">
                  ${this.formatCurrency(product.price)}
                </span>
              </div>
              <div class="detail-spec-item">
                <span class="detail-spec-label">Inventario Disponible</span>
                <span class="detail-spec-val">${product.stock} unidades</span>
              </div>
              <div class="detail-spec-item">
                <span class="detail-spec-label">ID del Producto</span>
                <span class="detail-spec-val">#${product.id}</span>
              </div>
              <div class="detail-spec-item">
                <span class="detail-spec-label">Fecha de Registro</span>
                <span class="detail-spec-val" style="font-size: 0.82rem;">${dateStr}</span>
              </div>
            </div>
          </div>
        </div>
      `;

      footer.innerHTML = `
        <button class="btn-secondary" id="detail-edit-btn">
          <i data-lucide="edit"></i>
          <span>Editar</span>
        </button>
        <button class="btn-primary" id="detail-add-cart-btn" ${product.stock <= 0 ? 'disabled' : ''}>
          <i data-lucide="shopping-bag"></i>
          <span>${product.stock <= 0 ? 'Sin Stock' : 'Agregar al Carrito'}</span>
        </button>
      `;

      document.getElementById('detail-edit-btn')?.addEventListener('click', () => {
        this.closeDetailModal();
        this.openEditModal(product.id);
      });

      document.getElementById('detail-add-cart-btn')?.addEventListener('click', () => {
        cart.addItem(product, 1);
        showToast(`¡"${product.name}" agregado al carrito!`, 'success');
      });

      this.refreshIcons();
    } catch (err) {
      body.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--status-danger);">
          <p>Error al obtener el producto: ${err.message}</p>
        </div>
      `;
      footer.innerHTML = `<button class="btn-secondary" id="btn-close-err-detail">Cerrar</button>`;
      document.getElementById('btn-close-err-detail')?.addEventListener('click', () => this.closeDetailModal());
    }
  }

  closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('open');
  }

  // MODAL: DELETE CONFIRMATION (DELETE /products/:id)
  openDeleteModal(id) {
    this.currentDeleteId = id;
    const p = this.products.find(item => item.id === id);
    const pName = p ? `"${p.name}" (ID #${p.id})` : `con ID #${id}`;
    document.getElementById('delete-modal-text').innerHTML = `
      ¿Estás seguro de que deseas eliminar permanentemente el producto <strong>${pName}</strong>?<br><br>
      Esta acción ejecutará <code>DELETE /products/${id}</code> en tu backend.
    `;
    document.getElementById('delete-modal').classList.add('open');
  }

  closeDeleteModal() {
    document.getElementById('delete-modal').classList.remove('open');
    this.currentDeleteId = null;
  }

  async confirmDeleteProduct() {
    if (!this.currentDeleteId) return;

    const id = this.currentDeleteId;
    const confirmBtn = document.getElementById('btn-confirm-delete');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `<span>Eliminando...</span>`;

    try {
      await deleteProduct(id);
      showToast(`Producto #${id} eliminado correctamente del backend`, 'success');
      this.closeDeleteModal();
      await this.loadProducts();
    } catch (err) {
      console.error(err);
      showToast(`Error al eliminar: ${err.message}`, 'error', 6000);
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `<i data-lucide="trash-2"></i><span>Eliminar Producto</span>`;
      this.refreshIcons();
    }
  }

  // MODAL: SETTINGS
  openSettingsModal() {
    document.getElementById('settings-api-url').value = getApiBaseUrl();
    document.getElementById('settings-test-result').innerHTML = '';
    document.getElementById('settings-modal').classList.add('open');
  }

  closeSettingsModal() {
    document.getElementById('settings-modal').classList.remove('open');
  }

  async testSettingsConnection() {
    const inputUrl = document.getElementById('settings-api-url').value.trim();
    const resultDiv = document.getElementById('settings-test-result');
    resultDiv.innerHTML = `<span style="color: var(--text-muted);">Probando conexión a ${inputUrl}...</span>`;

    try {
      const res = await fetch(`${inputUrl}/products`, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        resultDiv.innerHTML = `<span style="color: var(--status-success); font-weight: 700;">✓ Conexión exitosa (HTTP ${res.status} OK)</span>`;
      } else {
        resultDiv.innerHTML = `<span style="color: var(--status-danger);">✗ Respondió con error HTTP ${res.status}</span>`;
      }
    } catch (err) {
      resultDiv.innerHTML = `<span style="color: var(--status-danger);">✗ Fallo de conexión: ${err.message}</span>`;
    }
  }

  saveSettings() {
    const inputUrl = document.getElementById('settings-api-url').value.trim();
    setApiBaseUrl(inputUrl);
    this.closeSettingsModal();
    showToast(`URL de API actualizada: ${inputUrl}`, 'info');
    this.testConnection();
    this.loadProducts();
  }

  // CART MANAGEMENT
  subscribeCart() {
    cart.subscribe((items) => {
      this.updateCartBadge();
      this.renderCartDrawer(items);
    });
  }

  updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = cart.getTotalCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  openCart() {
    document.getElementById('cart-drawer').classList.add('open');
  }

  closeCart() {
    document.getElementById('cart-drawer').classList.remove('open');
  }

  renderCartDrawer(items) {
    const container = document.getElementById('cart-items-container');
    const footer = document.getElementById('cart-footer');
    if (!container || !footer) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
          <div style="font-size: 3rem; margin-bottom: 0.75rem;">🛒</div>
          <p style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.35rem;">Tu carrito está vacío</p>
          <p style="font-size: 0.88rem;">Explora el catálogo y agrega tus delicias favoritas.</p>
        </div>
      `;
      footer.innerHTML = `
        <button class="btn-primary" style="width: 100%;" id="btn-cart-start-shopping">
          <span>Ver Delicias</span>
        </button>
      `;
      document.getElementById('btn-cart-start-shopping')?.addEventListener('click', () => {
        this.closeCart();
        this.activeView = 'catalog';
        this.render();
      });
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="cart-item">
        <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'" />
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">${this.formatCurrency(item.price)}</div>
        </div>
        <div class="cart-qty-controls">
          <button class="qty-btn" data-cart-delta="-1" data-id="${item.id}">-</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" data-cart-delta="1" data-id="${item.id}">+</button>
        </div>
        <button class="cart-remove-btn" data-cart-remove="${item.id}" title="Eliminar del carrito">
          <i data-lucide="x" style="width: 16px; height: 16px;"></i>
        </button>
      </div>
    `).join('');

    const subtotal = cart.getSubtotal();
    const taxes = subtotal * 0.16;
    const total = subtotal + taxes;

    footer.innerHTML = `
      <div class="cart-summary-row">
        <span>Subtotal</span>
        <span>${this.formatCurrency(subtotal)}</span>
      </div>
      <div class="cart-summary-row">
        <span>IVA Estimado (16%)</span>
        <span>${this.formatCurrency(taxes)}</span>
      </div>
      <div class="cart-summary-row total">
        <span>Total a Pagar</span>
        <span>${this.formatCurrency(total)}</span>
      </div>
      <button class="btn-primary" style="width: 100%; margin-top: 1rem;" id="btn-checkout">
        <i data-lucide="sparkles"></i>
        <span>Confirmar Pedido (${this.formatCurrency(total)})</span>
      </button>
    `;

    // Attach cart actions
    container.querySelectorAll('[data-cart-delta]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.id);
        const delta = Number(e.currentTarget.dataset.cartDelta);
        cart.updateQuantity(id, delta);
      });
    });

    container.querySelectorAll('[data-cart-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(e.currentTarget.dataset.cartRemove);
        cart.removeItem(id);
      });
    });

    document.getElementById('btn-checkout')?.addEventListener('click', () => {
      showToast('¡Pedido completado con éxito! Gracias por tu compra en TuDelicia 🧁', 'success', 5000);
      cart.clearCart();
      this.closeCart();
    });

    this.refreshIcons();
  }
}

// Bootstrap Application
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
