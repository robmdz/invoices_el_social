# el Social facturas

Aplicación web para cargar facturas en PDF, extraer datos con IA (Gemini), guardarlas por usuario en Supabase y descargar un listado imprimible en PDF ordenado por número de factura.

## Tech stack

| Layer    | Technologies                                      |
|----------|---------------------------------------------------|
| Frontend | React 18, Vite, Tailwind CSS, Supabase Auth/DB    |
| Backend  | Python 3.10+, FastAPI, Google Gemini              |
| Database | Supabase (PostgreSQL + Row Level Security)        |

## Funcionalidades

1. **Registro e inicio de sesión** con Supabase Auth.
2. **Carga de PDF** y extracción automática de campos con Gemini.
3. **Edición y guardado** de cada factura en tu cuenta.
4. **Listado de facturas** ordenado por número de factura.
5. **Descarga PDF** del listado completo, listo para imprimir.
6. **Tema claro/oscuro** con la paleta de marca (#C61A23).

## Configuración de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta el script `supabase/schema.sql`.
3. En **Authentication → Providers**, habilita Email (y desactiva la confirmación de correo en desarrollo si lo prefieres).
4. Copia **Project URL** y **anon public key** desde **Project Settings → API**.

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edita .env con GEMINI_API_KEY y CORS_ORIGINS
uvicorn main:app --reload --port 8000
```

## Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edita .env con VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY y VITE_API_URL
npm run dev
```

Abre **http://localhost:5173**. El logo de marca está en `frontend/public/logo.png`.

## Variables de entorno

### `frontend/.env`

| Variable                 | Descripción                    |
|--------------------------|--------------------------------|
| `VITE_API_URL`           | URL del backend FastAPI        |
| `VITE_SUPABASE_URL`      | URL del proyecto Supabase      |
| `VITE_SUPABASE_ANON_KEY` | Clave pública anon de Supabase |

### `backend/.env`

| Variable          | Descripción              |
|-------------------|--------------------------|
| `GEMINI_API_KEY`  | API key de Google Gemini |
| `CORS_ORIGINS`    | Orígenes permitidos CORS |

## API

### `POST /api/invoice/upload`

Acepta `multipart/form-data` con el campo `file` (PDF o imagen). Devuelve campos extraídos.

### `GET /health`

Devuelve `{ "status": "ok" }`.

## License

Provided as-is for development purposes.
