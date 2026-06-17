/* ============================================================
   admin.js - Panel de administrador
   Lista las hojas de vida, permite abrirlas, revisarlas,
   marcar APTO, firmar como empleador y aprobar/rechazar.
   Requiere: window.cloud (cloud.js) y window.hv (app.js)
   ============================================================ */
(function () {
  'use strict';

  const btnAdmin = document.getElementById('btnAdmin');
  const adminModal = document.getElementById('adminModal');
  const adminClose = document.getElementById('adminClose');
  const adminLista = document.getElementById('adminLista');
  const tabs = document.querySelectorAll('.admin-tab');

  const adminAcciones = document.getElementById('adminAcciones');
  const adminRevInfo = document.getElementById('adminRevInfo');
  const btnAprobar = document.getElementById('btnAprobar');
  const btnRechazar = document.getElementById('btnRechazar');
  const btnCancelRev = document.getElementById('btnCancelRev');

  let estadoActual = 'pendiente';
  let revisandoId = null;

  function avisar(msg, ok) {
    if (window.hv && window.hv.avisar) window.hv.avisar(msg, ok);
    else alert(msg);
  }

  function fmtFecha(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO') + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  const ETIQUETA = { pendiente: 'Pendiente', aprobado: 'Aprobada', rechazado: 'Rechazada' };

  async function cargarLista() {
    adminLista.innerHTML = '<p class="admin-cargando">Cargando…</p>';
    try {
      const q = 'hojas_vida?select=id,nombres,apellidos,identificacion,cargo,estado,created_at,revisado_at'
        + '&estado=eq.' + estadoActual + '&order=created_at.desc';
      const filas = await window.cloud.select(q);
      if (!filas.length) {
        adminLista.innerHTML = '<p class="admin-vacio">No hay hojas en estado "' + ETIQUETA[estadoActual] + '".</p>';
        return;
      }
      adminLista.innerHTML = '';
      filas.forEach(function (f) {
        const item = document.createElement('div');
        item.className = 'admin-item';
        const nombre = ((f.nombres || '') + ' ' + (f.apellidos || '')).trim() || '(sin nombre)';
        item.innerHTML =
          '<div class="admin-item-info">' +
          '<div class="admin-item-nombre">' + nombre + '</div>' +
          '<div class="admin-item-sub">C.C. ' + (f.identificacion || '—') +
          ' · ' + (f.cargo || 'Sin cargo') + ' · Enviada: ' + fmtFecha(f.created_at) + '</div>' +
          '</div>' +
          '<button type="button" class="btn btn-primary btn-sm">Revisar</button>';
        item.querySelector('button').addEventListener('click', function () { abrirHoja(f.id); });
        adminLista.appendChild(item);
      });
    } catch (e) {
      adminLista.innerHTML = '<p class="admin-vacio">Error al cargar: ' + (e.message || e) + '</p>';
    }
  }

  async function abrirHoja(id) {
    try {
      const filas = await window.cloud.select('hojas_vida?select=*&id=eq.' + id);
      const fila = filas[0];
      if (!fila) { avisar('No se encontró la hoja.'); return; }
      window.hv.aplicar(fila.datos || {});
      revisandoId = id;
      cerrarModal();
      // Muestra la barra de acciones del admin
      const nombre = ((fila.nombres || '') + ' ' + (fila.apellidos || '')).trim();
      adminRevInfo.textContent = 'Revisando: ' + (nombre || 'hoja de vida') + ' (C.C. ' + (fila.identificacion || '—') + ')';
      adminAcciones.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      avisar('Hoja cargada. Revisa, marca APTO y firma como empleador.', true);
    } catch (e) {
      avisar('No se pudo abrir: ' + (e.message || e));
    }
  }

  function terminarRevision() {
    revisandoId = null;
    adminAcciones.hidden = true;
  }

  async function aprobar() {
    if (!revisandoId) return;
    const faltantes = window.hv.validar();
    if (faltantes.length > 0) {
      avisar('Faltan ' + faltantes.length + ' campo(s) (incluye APTO y firma del empleador).');
      const p = faltantes[0];
      if (p && p.scrollIntoView) p.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const state = window.hv.recolectar();
    const apto = state.campos && state.campos.apto === 'SI';
    btnAprobar.disabled = true;
    btnAprobar.textContent = 'Guardando…';
    try {
      await window.cloud.update('hojas_vida', revisandoId, {
        datos: state,
        apto: apto,
        observaciones: (state.campos && state.campos.apto_obs) || null,
        estado: 'aprobado',
        revisado_at: new Date().toISOString()
      });
      avisar('Hoja aprobada y firmada correctamente.', true);
      terminarRevision();
    } catch (e) {
      avisar('No se pudo aprobar: ' + (e.message || e));
    } finally {
      btnAprobar.disabled = false;
      btnAprobar.textContent = '✅ Aprobar y firmar';
    }
  }

  async function rechazar() {
    if (!revisandoId) return;
    if (!confirm('¿Rechazar esta hoja de vida?')) return;
    const state = window.hv.recolectar();
    try {
      await window.cloud.update('hojas_vida', revisandoId, {
        datos: state,
        apto: false,
        observaciones: (state.campos && state.campos.apto_obs) || null,
        estado: 'rechazado',
        revisado_at: new Date().toISOString()
      });
      avisar('Hoja marcada como rechazada.', true);
      terminarRevision();
    } catch (e) {
      avisar('No se pudo rechazar: ' + (e.message || e));
    }
  }

  function abrirModal() {
    adminModal.hidden = false;
    cargarLista();
  }
  function cerrarModal() { adminModal.hidden = true; }

  if (btnAdmin) btnAdmin.addEventListener('click', abrirModal);
  if (adminClose) adminClose.addEventListener('click', cerrarModal);
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { x.classList.remove('activo'); });
      t.classList.add('activo');
      estadoActual = t.dataset.estado;
      cargarLista();
    });
  });
  if (btnAprobar) btnAprobar.addEventListener('click', aprobar);
  if (btnRechazar) btnRechazar.addEventListener('click', rechazar);
  if (btnCancelRev) btnCancelRev.addEventListener('click', terminarRevision);
})();
