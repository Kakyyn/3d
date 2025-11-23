# Guía de Uso - Calculadora de Precios de Impresión 3D

## Visión General
La nueva calculadora está diseñada siguiendo las mejores prácticas de la industria de impresión 3D, similar a la calculadora de Prusa3D. Considera todos los costos importantes para ofrecer cotizaciones precisas y profesionales.

## Secciones de la Calculadora

### 1. Información de la Impresión
- **Nombre del trabajo**: Identificación del proyecto (opcional)
- **Cantidad de piezas**: Número total de objetos a imprimir

### 2. Filamento
- **Material**: Selecciona de tu inventario de materiales
- **Peso total del filamento**: Incluye material de soporte y purgas
- **Factor de desperdicio**: Porcentaje adicional por:
  - Material de purga al cambiar colores
  - Torre de limpieza en impresiones multi-color
  - Posibles fallos de impresión
  - Material de soporte no utilizable
- **Costo por kg**: Se llena automáticamente según el material seleccionado

### 3. Tiempo de Impresión
- **Tiempo de impresión**: Tiempo real que toma la impresión
- **Tiempo de preparación**: Incluye:
  - Preparar archivo G-code
  - Cambiar filamento si es necesario
  - Calibrar impresora
  - Limpiar cama de impresión
- **Tiempo de post-procesamiento**: Incluye:
  - Retirar soportes
  - Lijar superficies
  - Pintar o ensamblar piezas
  - Empaque final
- **Factor de fallos**: Tiempo adicional considerando posibles reimpresos

### 4. Electricidad
- **Potencia de la impresora**: Consumo eléctrico en watts
- **Costo por kWh**: Tarifa eléctrica local

### 5. Costo de Mano de Obra
- **Tarifa por hora**: Tu costo de hora de trabajo
- **Incluir supervisión**: Si cobrar por supervisión durante la impresión

### 6. Costo de Mantenimiento y Máquina
- **Costo de la impresora**: Inversión inicial en el equipo
- **Vida útil estimada**: Horas de operación esperadas
- **Costo mantenimiento por hora**: Incluye:
  - Boquillas de repuesto
  - Correas y poleas
  - Lubricantes
  - Reparaciones generales

### 7. Otros Costos
- **Empaque y envío**: Costos adicionales por cliente
- **Otros gastos operativos**: Incluye:
  - Alquiler del local
  - Internet y software
  - Marketing
  - Seguros

### 8. Precio Final
- **Margen de ganancia**: Porcentaje de utilidad deseada
- **Descuento aplicado**: Descuentos por volumen o clientes especiales

## Cálculo Automático

La calculadora realiza automáticamente:

1. **Costo de Filamento**: Peso × (1 + desperdicio%) × precio/kg
2. **Costo de Electricidad**: Tiempo × (Potencia/1000) × tarifa eléctrica
3. **Depreciación**: (Costo impresora / vida útil) × tiempo de uso
4. **Mano de Obra**: Tiempo total × tarifa horaria
5. **Subtotal**: Suma de todos los costos
6. **Precio Final**: Subtotal × (1 + margen%) × (1 - descuento%)

## Funciones Adicionales

### Guardar como Producto
Crea un producto en tu inventario con los datos calculados.

### Crear Pedido
Genera un pedido directo con la cotización realizada.

### Compartir Cálculo
Comparte la cotización por WhatsApp, email o redes sociales.

### Imprimir Resumen
Genera un PDF profesional con el desglose completo de costos.

## Consejos de Uso

1. **Actualiza regularmente** los costos de electricidad y mantenimiento
2. **Ajusta el factor de desperdicio** según tu experiencia
3. **Considera diferentes márgenes** para diferentes tipos de cliente
4. **Documenta** los tiempos reales para mejorar estimaciones futuras
5. **Guarda cotizaciones frecuentes** como productos para agilizar el proceso

## Valores Recomendados

### Factor de Desperdicio
- PLA/PET-G: 5-10%
- ABS/ASA: 8-12%
- Materiales flexibles: 10-15%
- Primeras pruebas con material nuevo: 15-20%

### Factor de Fallos
- Impresora bien calibrada: 3-5%
- Materiales conocidos: 5-8%
- Materiales nuevos o geometrías complejas: 10-15%

### Tiempo de Preparación Típico
- Impresión simple: 10-15 min
- Cambio de material: 15-30 min
- Calibración completa: 30-60 min

### Tiempo de Post-procesamiento
- Sin soportes: 5-10 min
- Con soportes simples: 15-30 min
- Con soportes complejos: 30-60 min
- Acabado premium: 1-3 horas