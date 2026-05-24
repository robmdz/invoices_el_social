Registrar facturas de compra de ingredientes
Permite ingresar facturas de compra de ingredientes a Toteat mediante API para:

Registrar movimientos contables de compras
Realizar ajustes automáticos en el inventario
Mantener trazabilidad de insumos ingresados
Flujo del Proceso:
Validación de la factura y sus líneas
Registro contable del movimiento
Ajuste automático de inventario
Actualización de costos y existencias
Notas Importantes:
Las facturas ingresadas afectan inmediatamente el inventario
Requiere configuración previa de productos y proveedores en Toteat
Los impuestos se calculan automáticamente si no se proporcionan
⚠️ Límite de solicitudes
1 solicitud por segundo
query Parameters
xir
required
integer
Identificador único del restaurante

xil
required
integer
Identificador del local asociado al restaurante

xiu
required
integer
Identificador del usuario autorizado

xapitoken
required
string
Token de autenticación para el API

Request Body schema: application/json
required
invoice_number
required
string non-empty
Número de factura del proveedor

emission_date
required
string <date>
Fecha de emisión de la factura

provider_vat
required
string non-empty
RUT/RFC/VAT del proveedor

invoice_type
required
string non-empty
Tipo de documento (FACTURA, BOLETA, NOTA_CREDITO, etc.)

line_details
required
Array of objects (PurchaseLineDetailSchema) non-empty
Detalle de productos/items de la factura

reference_number	
string non-empty
Número de orden de compra o referencia interna

status	
string non-empty
Estado de la factura (PAGADA, PENDIENTE, ANULADA, etc.)

comment	
string
Comentarios o observaciones adicionales

due_date	
string <date>
Fecha de vencimiento para pago

accounting_date	
string <date>
Fecha contable del movimiento

currency	
string non-empty
Moneda de la transacción (CLP, USD, EUR, etc.)

net_amount	
number <float>
Monto neto total de la factura (calculado automáticamente si no se proporciona)

taxes_amount	
number <float>
Total de impuestos de la factura (calculado automáticamente si no se proporciona)

total_amount	
number <float>
Monto total de la factura (calculado automáticamente si no se proporciona)

taxes	
Array of objects (TaxSchema)
Lista de impuestos aplicados a nivel de factura

Responses
201
Factura de compra registrada exitosamente

400
Error en validación de datos

404
Recurso no encontrado (producto, proveedor, etc.)

429
Too Many Requests