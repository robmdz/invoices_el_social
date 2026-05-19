import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";

export default function RegisterPage() {
  const { signUp, user, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const { session } = await signUp(email.trim(), password);
      if (session) {
        navigate("/", { replace: true });
      } else {
        setMessage(
          "Cuenta creada. Si tu proyecto requiere confirmación por correo, revisa tu bandeja de entrada y luego inicia sesión."
        );
      }
    } catch (err) {
      setError(err.message || "No se pudo crear la cuenta.");
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
          <p className="mt-4 font-display text-lg text-brand">Registro de Personal</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Crea tu cuenta de empleado autorizada para la gestión de facturas de El Social.
          </p>
        </div>

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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-[var(--color-muted)]">
              Confirmar contraseña
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input-field"
            />
          </label>

          {error && (
            <p role="alert" className="text-xs text-brand">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-xs text-[var(--color-text)]">
              {message}
            </p>
          )}

          <button type="submit" disabled={loading || !isConfigured} className="btn-primary w-full">
            {loading ? "Creando cuenta corporativa…" : "Registrarse"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          ¿Ya tienes cuenta autorizada?{" "}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Inicia sesión aquí
          </Link>
        </p>
      </main>
    </div>
  );
}
