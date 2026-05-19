/**
 * Muestra el PDF cargado en un iframe.
 */
export default function InvoicePreview({ file, previewUrl, fill = false }) {
  if (!file || !previewUrl) {
    return (
      <div
        className={`flex items-center justify-center border border-neutral-200 bg-neutral-50 ${
          fill ? "h-full min-h-[320px]" : "min-h-[320px]"
        }`}
      >
        <p className="text-sm text-neutral-500">Vista previa del documento</p>
      </div>
    );
  }

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  const containerClass = fill
    ? "flex h-full flex-col border-0"
    : "border border-neutral-200 bg-white";

  const viewerClass = fill
    ? "min-h-0 flex-1"
    : "h-[min(70vh,520px)] overflow-auto bg-neutral-50";

  return (
    <div className={containerClass}>
      {!fill && (
        <div className="border-b border-neutral-200 px-3 py-2">
          <p className="truncate text-xs text-neutral-600">{file.name}</p>
        </div>
      )}
      <div className={viewerClass}>
        {isPdf ? (
          <iframe
            title="Vista previa de la factura"
            src={previewUrl}
            className="h-full min-h-[400px] w-full border-0 bg-neutral-100"
          />
        ) : (
          <img
            src={previewUrl}
            alt="Factura"
            className="mx-auto max-h-full w-full object-contain"
          />
        )}
      </div>
    </div>
  );
}
