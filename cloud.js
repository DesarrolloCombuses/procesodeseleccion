/* ============================================================
   cloud.js - Autenticación con Supabase (login de COMBUSES)
   Usa conexión directa (fetch) al endpoint de autenticación,
   método ya verificado que funciona. Maneja la sesión en el
   dispositivo y la deja disponible para guardar datos/PDF.
   ============================================================ */
(function () {
  'use strict';

  function dbg(msg) { try { console.log('[cloud]', msg); } catch (e) {} }

  const cfg = window.SUPABASE_CONFIG || {};
  const SKEY = 'sb_session_combuses';

  const loginScreen = document.getElementById('loginScreen');
  const loginForm = document.getElementById('loginForm');
  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');
  const loginError = document.getElementById('loginError');
  const btnLogin = document.getElementById('btnLogin');
  const togglePass = document.getElementById('togglePass');
  const btnLogout = document.getElementById('btnLogout');
  const userEmailEl = document.getElementById('userEmail');

  function mostrarError(msg) {
    if (!loginError) { alert(msg); return; }
    loginError.textContent = msg;
    loginError.hidden = false;
  }
  function limpiarError() { if (loginError) loginError.hidden = true; }

  /* ---- Manejo de sesión en el dispositivo ---- */
  function leerSesion() {
    try { return JSON.parse(localStorage.getItem(SKEY)); } catch (e) { return null; }
  }
  function guardarSesion(s) {
    if (s) localStorage.setItem(SKEY, JSON.stringify(s));
    else localStorage.removeItem(SKEY);
  }

  /* ---- Helpers de base de datos (REST con la sesión del usuario) ---- */
  function headersDB(extra) {
    const s = leerSesion();
    return Object.assign({
      apikey: cfg.key,
      Authorization: 'Bearer ' + (s && s.access_token ? s.access_token : cfg.key),
      'Content-Type': 'application/json'
    }, extra || {});
  }
  async function dbSelect(query) {
    const res = await fetch(cfg.url + '/rest/v1/' + query, { headers: headersDB() });
    if (!res.ok) throw new Error('DB ' + res.status + ': ' + (await res.text()));
    return res.json();
  }
  async function dbInsert(tabla, obj) {
    const res = await fetch(cfg.url + '/rest/v1/' + tabla, {
      method: 'POST', headers: headersDB({ Prefer: 'return=representation' }), body: JSON.stringify(obj)
    });
    if (!res.ok) throw new Error('DB ' + res.status + ': ' + (await res.text()));
    return res.json();
  }
  async function dbUpdate(tabla, id, cambios) {
    const res = await fetch(cfg.url + '/rest/v1/' + tabla + '?id=eq.' + id, {
      method: 'PATCH', headers: headersDB({ Prefer: 'return=representation' }), body: JSON.stringify(cambios)
    });
    if (!res.ok) throw new Error('DB ' + res.status + ': ' + (await res.text()));
    return res.json();
  }
  async function cargarRol() {
    const s = leerSesion();
    if (!s || !s.user) return 'usuario';
    const app = cfg.app || 'procesodeseleccion';
    try {
      const arr = await dbSelect('roles_app?select=rol&user_id=eq.' + s.user.id + '&app=eq.' + app);
      return (arr[0] && arr[0].rol) || 'usuario';
    } catch (e) { dbg('rol error: ' + e.message); return 'usuario'; }
  }

  // API disponible para el resto de la app (formulario / panel admin)
  window.cloud = {
    cfg: cfg,
    sesion: leerSesion,
    token: function () { const s = leerSesion(); return s ? s.access_token : null; },
    rol: 'usuario',
    esAdmin: false,
    select: dbSelect,
    insert: dbInsert,
    update: dbUpdate,
    guardarHoja: function (payload) { return dbInsert('hojas_vida', payload); }
  };

  async function aplicarRol() {
    const rol = await cargarRol();
    window.cloud.rol = rol;
    window.cloud.esAdmin = (rol === 'admin');
    document.body.classList.toggle('rol-admin', rol === 'admin');
    const badge = document.getElementById('rolBadge');
    if (badge) {
      badge.textContent = (rol === 'admin') ? '🛡️ Administrador' : '👤 Personal';
      badge.hidden = false;
    }
    dbg('rol del usuario: ' + rol);
    document.dispatchEvent(new CustomEvent('sesion-rol', { detail: { rol: rol, esAdmin: rol === 'admin' } }));
  }

  function mostrarApp(usuario) {
    loginScreen.hidden = true;
    if (userEmailEl) {
      userEmailEl.textContent = '👤 ' + (usuario && usuario.email ? usuario.email : '');
      userEmailEl.hidden = false;
    }
    if (btnLogout) btnLogout.hidden = false;
    aplicarRol();
  }
  function mostrarLogin() {
    loginScreen.hidden = false;
    if (userEmailEl) userEmailEl.hidden = true;
    if (btnLogout) btnLogout.hidden = true;
    document.body.classList.remove('rol-admin');
    const badge = document.getElementById('rolBadge');
    if (badge) badge.hidden = true;
  }

  /* ---- Llamadas de autenticación (fetch directo) ---- */
  async function iniciarSesion(email, password) {
    const res = await fetch(cfg.url + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: cfg.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.error_description || data.msg || data.error || 'Error de autenticación';
      throw new Error(msg);
    }
    guardarSesion(data);
    return data;
  }

  async function refrescarSesion() {
    const s = leerSesion();
    if (!s || !s.refresh_token) return null;
    try {
      const res = await fetch(cfg.url + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { apikey: cfg.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: s.refresh_token })
      });
      const data = await res.json();
      if (!res.ok) { guardarSesion(null); return null; }
      guardarSesion(data);
      return data;
    } catch (e) { return null; }
  }

  /* ---- Mostrar/ocultar contraseña ---- */
  if (togglePass) {
    togglePass.addEventListener('click', function () {
      passInput.type = passInput.type === 'password' ? 'text' : 'password';
    });
  }

  /* ---- Enviar el formulario de login ---- */
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    dbg('▶ click Ingresar (submit capturado)');
    limpiarError();
    if (!cfg.url || !cfg.key) { mostrarError('Falta la configuración de conexión.'); return; }

    btnLogin.disabled = true;
    btnLogin.textContent = 'Ingresando…';
    try {
      dbg('→ enviando credenciales a Supabase…');
      const data = await iniciarSesion(emailInput.value.trim(), passInput.value);
      dbg('✓ LOGIN OK: ' + (data.user && data.user.email));
      passInput.value = '';
      mostrarApp(data.user);
    } catch (err) {
      dbg('✗ fallo login: ' + (err.message || err));
      const m = String(err.message || err);
      if (/invalid login credentials/i.test(m)) mostrarError('Correo o contraseña incorrectos.');
      else if (/email not confirmed/i.test(m)) mostrarError('El usuario no está confirmado en Supabase (actívalo en Authentication → Users).');
      else if (/failed to fetch/i.test(m)) mostrarError('Sin conexión a internet. Revisa tu red e inténtalo de nuevo.');
      else mostrarError('No se pudo ingresar: ' + m);
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = 'Ingresar';
    }
  });

  /* ---- Cerrar sesión ---- */
  if (btnLogout) {
    btnLogout.addEventListener('click', function () {
      if (!confirm('¿Cerrar sesión?')) return;
      const s = leerSesion();
      if (s && s.access_token) {
        fetch(cfg.url + '/auth/v1/logout', {
          method: 'POST',
          headers: { apikey: cfg.key, Authorization: 'Bearer ' + s.access_token }
        }).catch(function () {});
      }
      guardarSesion(null);
      mostrarLogin();
    });
  }

  /* ---- Arranque: ¿ya hay sesión guardada? ---- */
  (function arranque() {
    const s = leerSesion();
    if (s && s.user) {
      const venceMs = (s.expires_at ? s.expires_at * 1000 : 0);
      if (venceMs && venceMs < Date.now()) {
        refrescarSesion().then(function (r) {
          if (r && r.user) mostrarApp(r.user); else mostrarLogin();
        });
      } else {
        mostrarApp(s.user);
      }
    } else {
      mostrarLogin();
    }
  })();
})();
