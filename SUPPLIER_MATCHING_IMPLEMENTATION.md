# Cambios de Implementación: Supplier Name Matching

## Descripción General
Se implementó un sistema de matching automático para nombres de proveedores que coincide entre los nombres extraídos por Gemini y los proveedores almacenados en la base de datos. El sistema es similar al matching de productos existente.

## Cambios Realizados

### 1. Base de Datos (Supabase)
**Archivo**: `supabase/schema.sql`

#### Nueva tabla: `suppliers`
```sql
create table public.suppliers (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade,
  supplier_code text,         -- Código único del proveedor
  supplier_name text,         -- Nombre canónico del proveedor
  supplier_vat text,          -- NIT/RUT/VAT
  supplier_address text,
  supplier_email text,
  supplier_phone text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
```

#### Nuevas columnas en tabla `invoices`
- `matched_supplier_id`: UUID referencia al proveedor seleccionado
- `supplier_candidates`: JSONB con candidatos de proveedores (para mostrar opciones al usuario)

### 2. Backend

#### Nuevo archivo: `backend/app/services/suppliers.py`
- Clase `SupplierRecord`: Representa un proveedor
- `normalize_supplier_name()`: Normaliza nombres para matching robusto
- `match_supplier()`: Encuentra el mejor match para un nombre extraído
- `find_partial_supplier_matches()`: Encuentra todas las coincidencias parciales
- `select_best_supplier_candidate()`: Selecciona el mejor de varios candidatos

#### Nuevo archivo: `backend/app/routes/suppliers.py`
**Endpoints disponibles**:

1. **GET `/api/suppliers`**
   - Obtiene todos los proveedores del usuario autenticado
   - Requiere token JWT en header `Authorization: Bearer <token>`
   - Retorna lista de proveedores

2. **POST `/api/suppliers`**
   - Crea un nuevo proveedor
   - Requiere token JWT
   - Cuerpo: `{ supplier_code, supplier_name, supplier_vat?, supplier_address?, supplier_email?, supplier_phone? }`

#### Actualizaciones: `backend/app/schemas/invoice.py`
- Nueva clase `SupplierCandidate`:
  ```python
  class SupplierCandidate(BaseModel):
    id: str
    code: str
    name: str
    vat: str | None = None
    address: str | None = None
    email: str | None = None
    phone: str | None = None
    confidence_score: float | None = None
  ```

- Nuevos campos en `InvoiceProcessingResponse`:
  - `matched_supplier_id`: ID del proveedor identificado
  - `matched_supplier_name`: Nombre del proveedor de la BD
  - `supplier_candidates`: Lista de candidatos disponibles

#### Actualizaciones: `backend/main.py`
- Importación y registro del router de proveedores

### 3. Frontend

#### Nuevo archivo: `frontend/src/utils/supplierMatching.js`
Utilities para matching de proveedores:
- `normalizeSupplierName()`: Normaliza nombres
- `calculateSimilarity()`: Calcula similitud entre strings
- `matchSupplier()`: Encuentra el mejor match
- `findPartialSupplierMatches()`: Encuentra coincidencias parciales

#### Actualización: `frontend/src/api/client.js`
Nuevas funciones:
- `getAuthHeaders(token)`: Genera headers de autenticación
- `fetchSuppliers(token)`: Obtiene proveedores del usuario
- `createSupplier(token, supplierData)`: Crea nuevo proveedor

#### Actualización: `frontend/src/pages/UploadPage.jsx`
```javascript
// Después de procesar la factura:
1. Obtiene proveedores del usuario (si está autenticado)
2. Busca coincidencias con el supplier_name extraído
3. Si hay exactamente 1 coincidencia: auto-selecciona
4. Si hay múltiples coincidencias: guarda candidatos para modal
5. Pasa los datos al WorkspacePage
```

#### Actualización: `frontend/src/components/InvoiceEditor.jsx`
- Nuevo estado para modal de proveedores: `supplierModal`
- Funciones: `openSupplierModal()`, `closeSupplierModal()`, `selectSupplier()`
- Campo `supplier_name` ahora muestra:
  - Nombre del proveedor de la BD (si fue identificado)
  - Botón para cambiar si hay múltiples candidatos
  - Indicador visual ✓ cuando se identifica el proveedor
  - Campo bloqueado para edición cuando está seleccionado

## Flujo de Matching

### Automático (al cargar factura)
1. Usuario carga PDF
2. Gemini extrae supplier_name
3. Sistema obtiene proveedores del usuario
4. Busca coincidencias:
   - **Match exacto**: Usa nombre de BD automáticamente
   - **1 coincidencia parcial**: Auto-selecciona
   - **Múltiples coincidencias**: Muestra modal para elegir
   - **Sin coincidencias**: Mantiene nombre extraído

### Manual (en el editor)
1. Usuario ve el nombre del proveedor en el campo
2. Si hay candidatos, puede clickear "Cambiar proveedor"
3. Se abre modal con opciones
4. Usuario selecciona y se actualiza el nombre

## Características Clave

### Matching Inteligente
- Normalización de caracteres especiales y espacios
- Búsqueda por substring (contención)
- Similitud fuzzy (Levenshtein distance)
- Puntuación de confianza (0-100%)

### Seguridad
- Autenticación por JWT token
- Datos aislados por usuario (RLS en Supabase)
- Validación de entrada en backend

### UX
- Indicadores visuales claros (✓ verificado)
- Botón para cambiar selección
- Modal para seleccionar de múltiples opciones
- Campo bloqueado cuando está identificado

## Pendiente (Futuro)

1. **Crear página de gestión de proveedores**: Para CRUD completo
2. **Importar proveedores desde CSV**: Similar a catálogo de productos
3. **Sincronización con Toteat**: Validar proveedores contra API de Toteat
4. **Email/VAT validation**: Validar emails y NIT/RUT
5. **Historial de matching**: Guardar decisiones para mejorar sugerencias futuras

## Testing

### Backend
```bash
# Listar proveedores
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/suppliers

# Crear proveedor
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"supplier_code":"SUP001","supplier_name":"Empresa A"}' \
  http://localhost:8000/api/suppliers
```

### Frontend
- Verificar que se obtienen proveedores al cargar factura
- Probar matching con nombres similares
- Verificar modal de selección con múltiples candidatos
- Confirmar que nombre se actualiza en el editor
