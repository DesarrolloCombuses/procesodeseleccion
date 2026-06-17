/* ============================================================
   FUENTE ÚNICA DE LA VERSIÓN DE LA APP
   ------------------------------------------------------------
   Para publicar una versión nueva: sube SOLO este número.
   Lo usan a la vez la app (index.html) y el service worker (sw.js),
   por lo que la caché y el aviso de actualización quedan sincronizados.
   Usa formato semántico:  MAYOR.MENOR.PARCHE
     - PARCHE  -> correcciones pequeñas        (1.0.0 -> 1.0.1)
     - MENOR   -> funciones nuevas             (1.0.1 -> 1.1.0)
     - MAYOR   -> cambios grandes/incompatibles(1.1.0 -> 2.0.0)
   ============================================================ */
self.APP_VERSION = '1.10.1';
