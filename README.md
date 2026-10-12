# 🧁 TUDELICIA - Frontend Gourmet & Gestión de Inventario

Frontend moderno y elegante para el proyecto **TUDELICIA**, desarrollado para consumir en tiempo real las APIs REST del backend en `http://localhost:3000/api`.

---

## 🚀 Tecnologías & Estética

- **Core:** JavaScript Vanilla + HTML5 semántico
- **Estilos:** Vanilla CSS con variables CSS, glassmorphism, modo claro/oscuro y diseño responsivo
- **Tipografía:** Google Fonts (*Outfit* para encabezados y *Plus Jakarta Sans* para textos)
- **Iconos:** [Lucide Icons](https://lucide.dev/)
- **Bundler:** Vite para recarga ultrarrápida (HMR)

---

## 🔌 APIs Consumidas del Backend

| Método | Endpoint | Acción en la Aplicación |
| :--- | :--- | :--- |
| `GET` | `/api/products` | Carga el listado completo de productos, calcula KPIs (Total productos, valor total, unidades y stock bajo) |
| `POST` | `/api/products` | Modal para crear nuevos productos con previsualización de imagen y presets rápidos |
| `GET` | `/api/products/:id` | Modal de detalle con especificaciones completas, fecha y disponibilidad |
| `PUT` | `/api/products/:id` | Modal de edición para actualizar nombre, descripción, precio, stock o imagen |
| `DELETE` | `/api/products/:id` | Diálogo de confirmación para eliminar productos del inventario de forma segura |

---

## 🌟 Características Destacadas

1. **Doble Modo de Visualización:**
   - **🛍️ Catálogo / Tienda:** Tarjetas interactivas de productos con animación al pasar el cursor, insignias de stock en tiempo real y botón de "Agregar al Carrito".
   - **📊 Gestión de Inventario:** Tabla administrativa con métricas visuales de stock, barras de progreso y acciones rápidas (`Ver`, `Editar`, `Eliminar`).
2. **Dashboard de Métricas (KPIs):**
   - Total de Productos.
   - Valor Total del Inventario ($ MXN).
   - Unidades en Stock.
   - Alerta de Stock Crítico (< 10 unidades).
3. **Búsqueda & Filtros en Vivo:**
   - Búsqueda instantánea por nombre, descripción o ID.
   - Filtro por estado de stock (`En Stock`, `Stock Bajo`, `Agotados`).
   - Ordenamiento por precio (menor/mayor), nombre (A-Z) o stock.
4. **Carrito de Compras Funcional:**
   - Panel lateral deslizante con cálculo de subtotales, IVA y total.
   - Control de cantidades respetando el límite de stock de la base de datos.
   - Simulación de compra con notificaciones.
5. **Monitor de Estado de la API:**
   - Indicador visual en el navbar con detección automática del backend (`localhost:3000`).
   - Modal de configuración para probar la conexión o alternar entre el entorno local y Render.

---

## 💻 Cómo Ejecutar el Proyecto

```bash
# 1. Instalar dependencias (ya instaladas)
npm install

# 2. Iniciar el servidor de desarrollo Vite
npm run dev

# 3. Abrir en tu navegador
# http://localhost:5173/
```
