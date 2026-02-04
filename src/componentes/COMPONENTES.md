# 📦 Librería de Componentes - Documentación

Guía rápida de los componentes reutilizables del proyecto.

---

## 🧱 Componentes Primitivos
`import { ... } from '@/componentes/primitivos'`

| Componente | Props principales | Descripción |
|------------|-------------------|-------------|
| `Boton` | `variant`, `size`, `cargando`, `icono` | Botón con variantes: primario, secundario, peligro, fantasma |
| `Entrada` | `tipo`, `size`, `error`, `iconoIzquierda` | Input para texto, email, número, etc. |
| `Selector` | `opciones`, `placeholder`, `error` | Dropdown/select |
| `AreaTexto` | `filas`, `maxLength` | Textarea multilinea |
| `CampoFormulario` | `etiqueta`, `error`, `ayuda`, `requerido` | Wrapper con label y mensajes |
| `Modal` | `abierto`, `alCerrar`, `titulo` | Modal base |
| `Tarjeta` | `titulo`, `subtitulo`, `pie` | Card container |
| `Alerta` | `tipo`, `mensaje` | Alertas: exito, error, advertencia, info |
| `Insignia` | `variante` | Badges con colores semánticos |

---

## 🔗 Componentes Compuestos
`import { ... } from '@/componentes/compuestos'`

| Componente | Props principales | Descripción |
|------------|-------------------|-------------|
| `TablaDatos` | `datos`, `columnas`, `rutaBase`, `colapsable` | Tabla genérica con formatos |
| `FormularioEntidad` | `campos`, `valores`, `alCambiar`, `alEnviar` | Formulario dinámico |
| `FormularioModal` | + `abierto`, `alCerrar` | FormularioEntidad en modal |
| `EditorItem` | `item`, `campos`, `alCambiar` | Editor de línea de item |
| `ModalBusqueda` | `datos`, `columnas`, `alSeleccionar` | Modal para búsqueda |
| `SelectorEntidad` | `recursoApi`, `alSeleccionar` | Selector con búsqueda |

---

## 🎨 Componentes UI
`import { ... } from '@/componentes/ui'`

| Componente | Props principales | Descripción |
|------------|-------------------|-------------|
| `ContenedorCargando` | `isLoading`, `error`, `alReintentar` | Wrapper para estados carga/error |
| `ModalConfirmacion` | `abierto`, `titulo`, `alConfirmar` | Modal de confirmación |
| `useConfirmacion` | - | Hook para ModalConfirmacion |

---

## 🏗️ Patrones de Página
`import { PaginaGestion } from '@/componentes/patrones'`

### PaginaGestion
Página CRUD completa con ~30 líneas de configuración.

```jsx
<PaginaGestion
    titulo="Clientes"
    icono={User}
    recursoApi="/api/clientes"
    columnas={[
        { clave: 'nombre', etiqueta: 'Nombre' },
        { clave: 'email', etiqueta: 'Email' },
    ]}
    campos={[
        { clave: 'nombre', requerido: true },
        { clave: 'email', tipo: 'email' },
    ]}
    rutaDetalle="/gestion/clientes"
/>
```

---

## 🪝 Hooks
`import { useGestionCRUD } from '@/componentes/hooks'`

### useGestionCRUD
Encapsula toda la lógica CRUD: fetch, estados, modal, formulario.

```jsx
const {
    datos, isLoading, error,
    formData, handleChange,
    isModalOpen, abrirModalNuevo, abrirModalEditar, cerrarModal,
    guardar, eliminar, guardando, errorGuardado
} = useGestionCRUD({
    recursoApi: '/api/clientes',
    camposIniciales: { nombre: '', email: '' }
});
```

---

## 📋 Definición de Campos

Para `FormularioEntidad`, `PaginaGestion`:

```javascript
const campos = [
    { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
    { clave: 'precio', tipo: 'numero', min: 0, step: '0.01' },
    { clave: 'categoria', tipo: 'selector', opciones: ['A', 'B', 'C'] },
    { clave: 'notas', tipo: 'textarea', filas: 4 },
    { clave: 'activo', tipo: 'checkbox' },
];
```

**Tipos disponibles**: `texto`, `numero`, `email`, `password`, `telefono`, `selector`, `textarea`, `checkbox`

---

## 📊 Definición de Columnas

Para `TablaDatos`, `PaginaGestion`:

```javascript
const columnas = [
    { clave: 'nombre', etiqueta: 'Nombre' },
    { clave: 'precio', etiqueta: 'Precio', formato: 'moneda' },
    { clave: 'fecha', etiqueta: 'Fecha', formato: 'fecha' },
    { clave: 'estado', etiqueta: 'Estado', formato: 'insignia',
      insigniaConfig: { 'Activo': 'exito', 'Inactivo': 'error' }
    },
    { clave: 'cliente.nombre', etiqueta: 'Cliente' }, // anidado
];
```

**Formatos**: `moneda`, `fecha`, `insignia`
