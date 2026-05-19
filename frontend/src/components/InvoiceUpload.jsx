import { useCallback, useRef, useState } from "react";

const ACCEPTED_TYPES = ".pdf";
const ACCEPTED_MIME = ["application/pdf"];

export default function InvoiceUpload({
  selectedFile,
  onFileSelect,
  onUpload,
  onClear,
  loading,
  error,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const validateAndSetFile = useCallback(
    (file) => {
      if (!file) return;
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext !== "pdf" && !ACCEPTED_MIME.includes(file.type)) {
        return;
      }
      onFileSelect?.(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      validateAndSetFile(e.dataTransfer.files?.[0]);
    },
    [validateAndSetFile]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleFileChange = (e) => {
    validateAndSetFile(e.target.files?.[0]);
  };

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = "";
    onClear?.();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedFile && onUpload) {
      onUpload(selectedFile);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border border-dashed p-10 text-center transition-colors ${
          dragOver
            ? "border-brand bg-brand/10"
            : "border-[var(--color-border)] hover:border-brand/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          className="hidden"
          aria-label="Seleccionar archivo PDF"
        />
        <p className="text-sm font-medium text-[var(--color-text)]">
          Arrastra tu PDF aquí o haz clic para seleccionarlo
        </p>
        <p className="mt-2 text-xs text-[var(--color-muted)]">Solo archivos PDF — máximo 10 MB</p>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{selectedFile.name}</p>
            <p className="text-xs text-[var(--color-muted)]">{formatSize(selectedFile.size)}</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="ml-3 text-xs text-[var(--color-muted)] hover:text-brand disabled:opacity-50"
          >
            Quitar
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-brand">
          {error}
        </p>
      )}

      <button type="submit" disabled={!selectedFile || loading} className="btn-primary w-full">
        {loading ? "Extrayendo datos…" : "Cargar y extraer datos"}
      </button>
    </form>
  );
}
