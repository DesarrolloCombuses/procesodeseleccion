/* ============================================================
   Configuración de conexión a Supabase
   ------------------------------------------------------------
   La llave "publishable" es SEGURA para usar en la app:
   la protección real la dan las reglas RLS de la base de datos.
   NUNCA pongas aquí la llave "service_role" / "secret".
   ============================================================ */
window.SUPABASE_CONFIG = {
  url: 'https://cbplebkmxrkaafqdhiyi.supabase.co',
  key: 'sb_publishable_DZCceNTENY4ViP17-eZrGg_bdMElZ9X',
  bucket: 'hojas-vida',
  tabla: 'hojas_vida',
  app: 'procesodeseleccion'
};
