# Mobile Fixes — Commit Agrupado

**Aplicación**: byutie Aura — gestión de estudios de belleza  
**Stack**: React + Vite + TypeScript + Tailwind CSS + Zustand + Drizzle ORM  
**Deploy**: Vercel (API catch-all), fallback a `mockFetch` (localStorage) en desarrollo  
**Breakpoints Tailwind**: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px

---

## Resumen ejecutivo

Este commit agrupa **7 fixes visuales para mobile** distribuidos en 5 archivos. Se resuelven problemas de desbordamiento, filtros cortados, menús redundantes y catálogo vacío, sin tocar lógica de negocio, API, base de datos ni dependencias.

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

---

## Pendientes / Siguientes tandas

- Calendario vista semana: grid con `min-w-[900px]` — requiere scroll horizontal en mobile. UX subóptima.
- Drawer mobile: items largos ("Pagos / Facturas") pueden truncarse en viewports < 360px.
- Otros módulos con tablas/filtros no revisados (Finanzas, Historial, Tratamientos, Inventario, Colaboradores, Usuarios, Configuración).

---

## Notas para futuros agentes

- **NO** eliminar `mobileShortcuts` (Layout.tsx:107) — el drawer mobile lo usa para generar el menú.
- El `login()` usa `/api/auth/login` → el mock `loginDemo` usa `/api/tenants` y `setCurrentTenant` → fallback a localStorage.
- Para resetear el mock DB en dev: borrar localStorage del navegador.
- El catch-all de Vercel (`api/[...].ts`) enruta todas las `/api/*` al handler de Vercel.
