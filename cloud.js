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

  // Disponible para la siguiente fase (guardar datos y PDF firmado)
  window.cloud = {
    cfg: cfg,
    sesion: leerSesion,
    token: function () { const s = leerSesion(); return s ? s.access_token : null; }
  };

  function mostrarApp(usuario) {
    loginScreen.hidden = true;
    if (userEmailEl) {
      userEmailEl.textContent = '👤 ' + (usuario && usuario.email ? usuario.email : '');
      userEmailEl.hidden = false;
    }
    if (btnLogout) btnLogout.hidden = false;
  }
  function mostrarLogin() {
    loginScreen.hidden = false;
    if (userEmailEl) userEmailEl.hidden = true;
    if (btnLogout) btnLogout.hidden = true;
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
