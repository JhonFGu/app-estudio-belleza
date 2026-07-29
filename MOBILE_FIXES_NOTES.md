# Mobile Fixes — Commit Agrupado

**Aplicación**: byutie Aura — gestión de estudios de belleza  
**Stack**: React + Vite + TypeScript + Tailwind CSS + Zustand + Drizzle ORM  
**Deploy**: Vercel (API catch-all), fallback a `mockFetch` (localStorage) en desarrollo  
**Breakpoints Tailwind**: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px

---

## Resumen ejecutivo

Este commit agrupa **13 archivos modificados** con ajustes responsive mobile para **todos los módulos principales** de la aplicación. Se resuelven problemas de desbordamiento, filtros cortados, tablas sin scroll, paneles de detalle invisibles y menús redundantes, sin tocar lógica de negocio, API, base de datos ni dependencias.

**Archivos modificados**: `Layout.tsx`, `Modal.tsx`, `ActivityLogSection.tsx`, `CRMPage.tsx`, `CalendarPage.tsx`, `POSPage.tsx`, `CollaboratorsPage.tsx`, `SchedulePage.tsx`, `TreatmentsPage.tsx`, `HistoryPage.tsx`, `FinancePage.tsx`, `UsersPage.tsx`, `mockFetch.ts`

---

## Tandas incluidas en este commit

### Tanda 1 — Landing Page (commit `5092c0c`)
- Padding del Hero reducido (`pt-10 pb-16 lg:pt-16 lg:pb-20`).
- Firma cambiada a "Creado con ❤️ por GUACHETA.CO".

### Tanda 2 — Header mobile, dashboard y POS
| Issue | Archivo | Cambio |
|---|---|---|
| Header móvil: título en 3 renglones | `Layout.tsx:221` | `whitespace-nowrap truncate min-w-0` |
| Header móvil: selector usuario/rol cortado, avatar desaparecido | `Layout.tsx:244-292` | Mobile: iniciales en `<details>` tap-to-reveal. Desktop: select inline |
| Botón "Abrir caja" desalineado en POS | `POSPage.tsx:472` | `justify-center sm:justify-end` |
| Catálogo POS sin ítems | `mockFetch.ts:4, 1301-1502` | SEED_KEY → v5, 6 productos seed, auto-reparación de tablas vacías |

### Tanda 3 — Calendario, Layout, Clientes (este commit)
| Issue | Archivo | Cambio |
|---|---|---|
| Filtros del Calendario en 5 renglones | `CalendarPage.tsx:361-425` | `<details>` "Filtros ▼" con auto-close |
| Menú inferior móvil redundante | `Layout.tsx:334, 347-373` | Eliminado bottom nav, `pb-24` → `pb-5` |
| Filtros de clientes cortados | `CRMPage.tsx:1413-1493` | `<details>` "Filtros ▼" en mobile, `min-w-0` en search |
| Tabla de clientes se sale del contenedor | `CRMPage.tsx:1495-1496` | `overflow-auto` + `min-w-[640px]` (scroll horizontal) |
| Pills toggle del detalle se desborda | `CRMPage.tsx:613` | `flex-wrap` |
| Paneles del detalle exceden el viewport | `CRMPage.tsx:610` | `min-w-0` en `lg:col-span-3` |
| Botón "Registrar" sale del header Historial | `ActivityLogSection.tsx:69-95` | `flex-col sm:flex-row flex-wrap` |

---

### Tanda 4 — Colaboradores y Horarios
| Issue | Archivo | Cambio |
|---|---|---|
| Contenedor de colaboradores no llega al borde inferior | `CollaboratorsPage.tsx:42` | `h-[calc(100vh-110px)]` con `overflow-auto` |
| Tabla de colaboradores se corta en mobile | `CollaboratorsPage.tsx:69-70` | `overflow-auto -mx-5 px-5` + `min-w-[640px]` |
| Filtros de horarios desalineados en mobile | `SchedulePage.tsx:162` | `justify-center sm:justify-end` en botón "Guardar Horarios" |
| Badge "X días activos" abarca demasiado espacio | `SchedulePage.tsx:94` | `hidden sm:inline-flex` |

### Tanda 5 — Tratamientos (split panel → modal)
| Issue | Archivo | Cambio |
|---|---|---|
| Panel de detalle y tabla visibles al mismo tiempo en mobile | `TreatmentsPage.tsx` | `hidden xl:flex` en panel detalle. Mobile: solo la tabla |
| Contenedor con espacio vacío abajo | `TreatmentsPage.tsx` | `xl:h-[calc(100vh-110px)] xl:overflow-hidden` / `h-[calc(100vh-180px)] xl:h-auto` |
| Tabla se comprime en mobile | `TreatmentsPage.tsx` | `overflow-auto -mx-5 px-5` + `min-w-[640px]` |
| Detalle invisible en mobile | `TreatmentsPage.tsx` + `Modal.tsx` | Nuevo `fullscreen` prop en Modal. Mobile: tap en tratamiento abre modal fullscreen con el detalle |
| Prop `fullscreen` en Modal | `Modal.tsx` | `h-full sm:max-h-[90vh] sm:rounded-2xl` en mobile |

### Tanda 6 — Pagos / Facturas (Historial)
| Issue | Archivo | Cambio |
|---|---|---|
| Misma estructura que Tratamientos (split panel) | `HistoryPage.tsx:110` | `xl:h-[calc(100vh-110px)] xl:overflow-hidden` |
| Panel tabla altura fija en mobile | `HistoryPage.tsx:129` | `xl:h-full h-[calc(100vh-180px)] xl:h-auto` |
| Tabla se comprime | `HistoryPage.tsx:146-147` | `overflow-auto -mx-5 px-5` + `min-w-[640px]` |
| Panel detalle invisible en mobile | `HistoryPage.tsx:204` | `hidden xl:flex` + nuevo modal fullscreen con todo el detalle (badge, cliente, items, subtotal/IVA/total, botón "Ver Tirilla") |

### Tanda 7 — Finanzas (Ingresos)
| Issue | Archivo | Cambio |
|---|---|---|
| Header con título + pill "Total Ingresos" colapsa en mobile | `FinancePage.tsx:958` | `flex-col sm:flex-row` + `whitespace-nowrap` en pill |
| Contenedor sin altura limitada → pocas filas visibles | `FinancePage.tsx:956` | `flex flex-col xl:h-[calc(100vh-110px)] h-[calc(100vh-180px)]` |
| Tabla sin scroll horizontal real | `FinancePage.tsx:967-968` | `flex-1 overflow-auto -mx-5 px-5` + `min-w-[640px]` |
| Tabs de navegación en mobile | (no cambios) | Ya usaban `overflow-x-auto` con scroll horizontal táctil — patrón correcto |

### Tanda 8 — Usuarios (matriz de permisos)
| Issue | Archivo | Cambio |
|---|---|---|
| Matriz de permisos dentro de `<tr>` con `overflow-x-auto` → cortada | `UsersPage.tsx:314-364` | Panel extraído fuera del `<table>` y del `overflow-x-auto`. Renderizado como `<div>` independiente dentro del Card |
| Padding excesivo en mobile (`px-8 py-6`) | `UsersPage.tsx:317` | Reducido a `p-5` |
| Panel se cortaba y requería scroll horizontal | `UsersPage.tsx:339` | Grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` sin cambios — ahora no afectado por overflow-x |

---

## Patrones reutilizables

### `<details>` tap-to-reveal con auto-close

```tsx
<details className="sm:hidden relative group">
  <summary className="list-none cursor-pointer flex items-center gap-1.5 px-3 py-2 bg-...">
    <Filter className="w-3.5 h-3.5" />
    Filtros
    {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-app-mint" />}
  </summary>
  <div className="absolute right-0 top-full mt-1 z-30 bg-white border ...">
    <select onChange={(e) => {
      handleChange(e.target.value);
      e.target.blur();
      e.target.closest('details')?.removeAttribute('open');
    }}>
      ...
    </select>
  </div>
</details>
```

### Tabla responsive con scroll horizontal

```tsx
<div className="flex-1 overflow-auto -mx-5 px-5">
  <table className="w-full min-w-[640px] text-left text-sm border-collapse">
    ...
  </table>
</div>
```

### Evitar desbordamiento en grid/flex

```tsx
<div className="lg:col-span-3 flex flex-col min-w-0">
  {/* children con text truncate */}
  <h2 className="truncate whitespace-nowrap min-w-0">Título largo que no se sale</h2>
</div>
```

### Split panel → modal fullscreen en mobile

Patrón usado en Tratamientos y Pagos/Facturas. La vista desktop tiene tabla + panel de detalle en grid de 3 columnas. En mobile, el panel de detalle se oculta con `hidden xl:flex` y un `tap` en la tabla abre un modal fullscreen con el mismo contenido.

```tsx
// Desktop: ambos paneles visibles
<div className="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:h-[calc(100vh-110px)] xl:overflow-hidden">
  <div className="xl:col-span-2 ...">
    {/* Tabla con overflow-auto + min-w-[640px] */}
  </div>
  <div className="hidden xl:flex xl:col-span-1 ...">
    {/* Panel detalle — solo visible en desktop */}
  </div>
</div>

// Mobile: modal fullscreen al tap en la tabla
<Modal
  isOpen={!!selectedItem}
  onClose={() => setSelectedItem(null)}
  title={selectedItem?.name}
  fullscreen
>
  {/* Mismo contenido del panel detalle en JSX duplicado */}
</Modal>
```

**Nota**: JSX del detalle está duplicado (panel desktop + modal mobile). Si se agregan campos, actualizar ambos. Mejora futura: extraer a componente.

### Modal con prop `fullscreen`

```tsx
// Modal.tsx:42
<div className={`${
  fullscreen
    ? 'h-full sm:max-h-[90vh] sm:rounded-2xl'
    : 'max-h-[85vh] rounded-2xl'
}`}>
```

---

## Cómo verificar manualmente

1. `npm run dev` en la raíz del proyecto.
2. Abrir `http://localhost:5173`.
3. **Si es la primera vez después de este commit**: abrir en incógnita o borrar localStorage (`F12` → Application → Clear site data) para que el SEED_KEY v5 dispare la re-siembra.
4. Hacer "Explorar Demo" → se carga Beauté Spa.
5. Con DevTools en modo iPhone SE (375×667):

| Módulo | Verificar |
|---|---|
| Dashboard | Título no se corta, selector de usuario muestra iniciales (e.g., "ER") y se expande al tap |
| POS | Botón "Abrir Caja" centrado en mobile, catálogo muestra servicios y productos |
| Citas | Filtros en 2 filas: "Hoy" + chevrones + fecha + mes / "Filtros ▼" + "Agendar Cita" |
| Citas → tap Filtros | Popover con Especialista y Vista, se cierra al elegir |
| Clientes | Barra: search + "Filtros ▼" + date + Limpiar + Registrar. Tabla hace scroll horizontal |
| Clientes → tap Filtros | Acordeón con Tratamiento y Especialista, se cierra al elegir |
| Clientes → Ver Ficha → Historial | Header en 2 filas, botón "Registrar" visible |
| Clientes → Ver Ficha → Tratamientos | Contenido no se sale del card |
| Clientes → Ver Ficha → tabs | Pills toggle hace wrap en 2 filas |
| General | Bottom nav eliminado, hamburguesa en header abre drawer |
| Colaboradores | Tabla con scroll horizontal, contenedor llega al borde inferior |
| Horarios | Filtro de fecha + "Guardar Horarios" centrados en mobile |
| Tratamientos | Solo tabla visible. Tap en fila → modal fullscreen con detalle (nombre, duración, precio, activo) |
| Pagos / Facturas | Solo tabla visible. Tap en fila → modal fullscreen con detalle (ticket ID, cliente, items, total) |
| Finanzas → Ingresos | Tabla con scroll horizontal. Header título + pill apilados en mobile |
| Usuarios | Expandir permisos → matriz se ve completa sin scroll horizontal |

---

## Pendientes / Siguientes tandas

- Calendario vista semana: grid con `min-w-[900px]` — requiere scroll horizontal en mobile. UX subóptima.
- Drawer mobile: items largos ("Pagos / Facturas") pueden truncarse en viewports < 360px.
- Inventario y Configuración: módulos no revisados aún para mobile.
- Vista detalle en desktop: algunos módulos duplican JSX (desktop panel + mobile modal). Mejora futura: extraer a componente compartido.

---

## Notas para futuros agentes

- **NO** eliminar `mobileShortcuts` (Layout.tsx:107) — el drawer mobile lo usa para generar el menú.
- El `login()` usa `/api/auth/login` → el mock `loginDemo` usa `/api/tenants` y `setCurrentTenant` → fallback a localStorage.
- Para resetear el mock DB en dev: borrar localStorage del navegador.
- El catch-all de Vercel (`api/[...].ts`) enruta todas las `/api/*` al handler de Vercel.
