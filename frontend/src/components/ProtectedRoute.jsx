import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading, isConfigured } = useAuth();
  const location = useLocation();

  if (!isConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-[var(--color-muted)]">
        <p>
          Configura <code className="text-brand">VITE_SUPABASE_URL</code> y{" "}
          <code className="text-brand">VITE_SUPABASE_ANON_KEY</code> en{" "}
          <code>frontend/.env</code> y reinicia el servidor de desarrollo.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--color-muted)]">
        Cargando…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
