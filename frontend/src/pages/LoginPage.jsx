import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

export default function LoginPage() {
  const { signIn, user, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-8 text-center">
          <img
            src="/logo.png"
            alt="el Social facturas"
            className="mx-auto h-24 w-auto object-contain"
          />
          <p className="mt-4 font-display text-lg text-brand">Acceso de Personal Autorizado</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Inicia sesión con tus credenciales corporativas para gestionar las facturas de El Social.
          </p>
        </div>

        {!isConfigured && (
          <p className="mb-4 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-xs text-brand">
            Configura las variables de Supabase en <code>frontend/.env</code>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">Correo</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">Contraseña</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </label>

          {error && (
            <p role="alert" className="text-xs text-brand">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading || !isConfigured} className="btn-primary w-full">
            {loading ? "Accediendo…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          ¿No tienes cuenta de empleado?{" "}
          <Link to="/registro" className="font-medium text-brand hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </main>
    </div>
  );
}
