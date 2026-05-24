import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

const navClass = ({ isActive }) =>
  `text-sm transition ${
    isActive
      ? "font-medium text-brand"
      : "text-[var(--color-muted)] hover:text-brand"
  }`;

export default function Layout({ children, compact = false }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="shrink-0 border-b border-[var(--color-border)]">
        <div
          className={`mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 ${compact ? "py-3" : "py-4"}`}
        >
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img
              src="/logo.png"
              alt="el Social facturas"
              className="h-12 w-auto shrink-0 object-contain sm:h-14"
            />
          </Link>

          <nav className="hidden items-center gap-6 sm:flex">
            <NavLink to="/" end className={navClass}>
              Inicio
            </NavLink>
            {user && (
              <>
                <NavLink to="/cargar" className={navClass}>
                  Cargar factura
                </NavLink>
                <NavLink to="/facturas" className={navClass}>
                  Mis facturas
                </NavLink>
                <NavLink to="/faltas" className={navClass}>
                  Faltas
                </NavLink>
                <NavLink to="/configuracion" className={navClass}>
                  Configuración
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {user ? (
              <>
                <span className="hidden max-w-[140px] truncate text-xs text-[var(--color-muted)] md:inline">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted)] transition hover:border-brand hover:text-brand"
                >
                  Salir
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-muted)] transition hover:border-brand hover:text-brand"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>

        <nav className="flex justify-center gap-6 border-t border-[var(--color-border)] py-2 sm:hidden">
          <NavLink to="/" end className={navClass}>
            Inicio
          </NavLink>
          {user && (
            <>
              <NavLink to="/cargar" className={navClass}>
                Cargar
              </NavLink>
              <NavLink to="/facturas" className={navClass}>
                Facturas
              </NavLink>
              <NavLink to="/faltas" className={navClass}>
                Faltas
              </NavLink>
              <NavLink to="/configuracion" className={navClass}>
                Config
              </NavLink>
            </>
          )}
        </nav>
      </header>

      {children}
    </div>
  );
}
