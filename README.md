# Control-de-rdenes
Ordenes de trabajo TC Costa Rica

## Infocomunicaciones · Inventario de Cableras (emulación Survey123)

Aplicación web que emula el formulario Survey123 **"Infocomunicaciones"** descrito en la
*Guía de uso — Levantamiento de Infraestructuras e Inventario de Cableras*.
No requiere servidor ni compilación: es HTML/CSS/JS puro y guarda los datos en el dispositivo (IndexedDB).

### Cómo usarla

```bash
python3 -m http.server 8080
# abrir http://localhost:8080
```

Para usar GPS y cámara desde un celular debe servirse por **HTTPS** (por ejemplo, GitHub Pages).
Se puede instalar como app (PWA) y funciona sin conexión en campo (el mapa base requiere internet).

Contraseñas de prueba: Cuadrilla 1 = `1111`, Cuadrilla 2 = `2222` … Cuadrilla 6 = `6666`
(se configuran en `js/config.js`).

### Flujo del formulario (igual que la guía)

1. **Datos generales**: fecha y hora automática (no editable), cuadrilla + contraseña
   ("Acceso correcto, continúe el levantamiento") y *¿Se puede levantar la información del poste?*
2. **Poste no levantado** (si responde *No*): motivo, foto opcional, observaciones y ubicación aproximada.
3. **Estado y uso**: escala 1-Buen estado / 2-Regular / 3-Requiere cambio inmediato (con colores) y uso
   Eléctrico / Eléctrico-TELE / Telecom.
4. **Identificación**: material, altura (filtrada según material), #activo anterior y # localización,
   número de placa nueva (lectura de **código QR** con la cámara o digitado) y foto de la placa.
5. **GPS y complementarias**: captura GPS o ubicación en mapa, anclaje, tipo de vano y elementos en el poste.
6. **Inventario de cableras** (repetible con `+`, navegación "1 de N" y papelera): empresa con búsqueda,
   posición automática, espacios ocupados, tipo de cable, vestidura, estado, altura de vano,
   etiquetado, cierre y reubicación.
7. **Fotografías** de cablera y poste y envío con ✓ (valida todos los campos obligatorios).

### Para jefaturas (sección 8)

Menú ☰ → **Tablero de seguimiento**: postes levantados y pendientes por motivo, distribución por estado,
uso, material y altura, mapa de cobertura, postes y espacios ocupados por empresa, tipo de cable,
vestidura, estado de uso, cableras sin etiquetar, vanos que no cumplen, redes a reubicar y
completitud de fotografías. Filtros por cuadrilla y fechas.

Exportaciones: **CSV** (postes y cableras), **GeoJSON** para GIS y **respaldo JSON** con fotos (importable).
También hay *datos de demostración* para probar el tablero.

### Archivos

| Archivo | Contenido |
|---|---|
| `js/config.js` | Esquema del formulario (preguntas, listas, relevancias), cuadrillas y contraseñas |
| `js/form.js` | Motor del formulario: render, relevancia, validación |
| `js/widgets.js` | Fotos, GPS, mapa, lector QR, avisos |
| `js/dashboard.js` | Tablero de jefaturas y exportaciones |
| `js/app.js` | Menú, bandeja (enviados / borradores), envío, datos demo |
| `sw.js`, `manifest.webmanifest` | Funcionamiento sin conexión / instalación |
