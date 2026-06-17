# Proceso de Selección — Hoja de Vida Conductor (COMBUSES)

Aplicación web (PWA) para diligenciar la hoja de vida de conductores según el
formato **FO-GTH-08** de COMBUSES.

## Características
- Formulario completo con secciones condicionales (SI/NO que muestran/ocultan campos).
- Foto del conductor (subir o tomar).
- Firmas táctiles (candidato y empleador) dibujadas en pantalla.
- Listas desplegables de EPS, fondos de cesantías y pensiones.
- Validación: todos los campos obligatorios antes de generar el PDF.
- Inicio de sesión para personal de COMBUSES (Supabase Auth).
- Guardado automático en el dispositivo.

## Estructura
- `index.html` — formulario y pantalla de login.
- `styles.css` — estilos (incluye impresión/PDF).
- `app.js` — lógica del formulario.
- `cloud.js` — autenticación con Supabase.
- `supabase-config.js` — configuración de conexión (llave pública, segura).
- `lib/`, `icons/` — librerías y recursos.
- `manifest.json`, `sw.js`, `version.js` — soporte PWA y versionado.

## Notas
- La base de datos y el bucket de Supabase se configuran aparte (no incluidos en este repositorio).
- La llave de Supabase incluida es la **publishable** (pública); la seguridad real la dan las políticas RLS.
