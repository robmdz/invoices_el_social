import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <Layout>
      <main className="flex-1 bg-[var(--color-bg)]">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
          <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-30">
            <div className="h-[400px] w-[400px] rounded-full bg-brand/5 blur-3xl" />
          </div>

          <div className="mx-auto max-w-3xl">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-medium text-brand">
              <span className="flex h-2 w-2 rounded-full bg-brand animate-pulse" />
              Gestión inteligente de facturación
            </div>

            {/* Main Headline */}
            <h1 className="mt-8 font-display text-4xl text-[var(--color-text)] sm:text-6xl">
              El Social <span className="text-brand">facturas</span>
            </h1>
            
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--color-muted)] sm:text-lg">
              Portal corporativo exclusivo para la digitalización y gestión interna de facturas de El Social. Sube tus archivos para extraer de forma automática y precisa la información contable mediante Inteligencia Artificial.
            </p>

            {/* Calls to Action */}
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              {user ? (
                <>
                  <Link to="/cargar" className="btn-primary flex items-center gap-2 px-6 py-3 shadow-sm hover:shadow-md transition">
                    Cargar nueva factura
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </Link>
                  <Link to="/facturas" className="btn-secondary px-6 py-3">
                    Historial de facturas
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/registro" className="btn-primary flex items-center gap-2 px-6 py-3 shadow-sm hover:shadow-md transition">
                    Registro de Personal
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                  <Link to="/login" className="btn-secondary px-6 py-3">
                    Acceso al Portal
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Minimal Interactive Visual Showcase */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm sm:p-10">
            <div className="flex flex-col gap-8 md:flex-row md:items-center justify-between">
              {/* Fake PDF Drop Zone */}
              <div className="flex-1 rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center bg-[var(--color-bg)]">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="mt-4 text-sm font-medium text-[var(--color-text)]">factura_servicio.pdf</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">PDF detectado y procesado</p>
              </div>

              {/* Extraction Visual Indicator */}
              <div className="flex shrink-0 items-center justify-center text-[var(--color-muted)] md:h-12 md:w-12">
                <svg className="h-6 w-6 rotate-90 md:rotate-0 animate-pulse text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>

              {/* Fake Extracted Fields */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm">
                  <span className="text-xs text-[var(--color-muted)] font-medium">Proveedor</span>
                  <span className="font-semibold text-brand">El Social S.L.</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm">
                  <span className="text-xs text-[var(--color-muted)] font-medium">Fecha</span>
                  <span className="font-semibold text-[var(--color-text)]">19/05/2026</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm">
                  <span className="text-xs text-[var(--color-muted)] font-medium">Total</span>
                  <span className="font-semibold text-[var(--color-text)]">158,50 €</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-display text-3xl text-[var(--color-text)]">
              Guía para el <span className="text-brand">Uso Correcto</span> de la Plataforma
            </h2>
            
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
              {/* Feature 1 */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 transition hover:shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-[var(--color-text)]">1. Calidad y Formato</h3>
                <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                  Sube únicamente documentos en formato PDF, JPEG, PNG o WEBP. Asegúrate de que las imágenes tengan buena resolución y no estén borrosas para garantizar una extracción de datos precisa por la IA.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 transition hover:shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-[var(--color-text)]">2. Verificación Obligatoria</h3>
                <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                  La extracción por IA (Gemini) es de alta precisión, pero no exime de responsabilidad. Es obligatorio que el usuario compruebe y corrija importes, IVA, proveedor y número de factura antes de guardar en el sistema.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 transition hover:shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-[var(--color-text)]">3. Uso Corporativo</h3>
                <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                  El uso de este portal es estrictamente corporativo y confidencial para la empresa El Social. Queda totalmente prohibida la carga de facturas personales o documentos ajenos a la actividad empresarial autorizada.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Subtle Footer */}
        <footer className="border-t border-[var(--color-border)] px-4 py-8 text-center text-xs text-[var(--color-muted)] sm:px-6">
          <p>© {new Date().getFullYear()} El Social Facturas. Diseñado con una estética minimalista para la máxima eficiencia.</p>
        </footer>
      </main>
    </Layout>
  );
}
