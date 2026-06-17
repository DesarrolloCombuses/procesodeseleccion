/* ====================================================================
   Hoja de Vida Conductor - COMBUSES (PWA)
   - Autoguardado en localStorage
   - Foto (subir / tomar)
   - Hijos dinámicos
   - Encuesta generada dinámicamente
   - Exportar a PDF / Imprimir
   ==================================================================== */

(function () {
  'use strict';

  const STORAGE_KEY = 'hv_combuses_data_v1';
  const form = document.getElementById('hvForm');
  const saveStatus = document.getElementById('saveStatus');

  /* -------- Preguntas de la encuesta -------- */
  const PREGUNTAS = [
    ['enc_normas', '¿Conoce e identifica las normas de tránsito?'],
    ['enc_sit', '¿Conoce e identifica sistemas inteligentes de transporte?'],
    ['enc_gps', '¿Ha trabajado con sistemas de GPS?'],
    ['enc_publico', '¿Ha trabajado en empresas de transporte público?'],
    ['enc_partes', '¿Conoce e identifica las partes principales del vehículo?'],
    ['enc_docs', '¿Conoce e identifica los documentos del vehículo de servicio público?'],
    ['enc_tecno', '¿Ha trabajado en empresas que tengan sistema tecnológico?']
  ];

  function construirEncuesta() {
    const cont = document.getElementById('encuesta');
    PREGUNTAS.forEach(([name, texto]) => {
      const item = document.createElement('div');
      item.className = 'enc-item';
      item.innerHTML =
        '<span>' + texto + '</span>' +
        '<div class="sino">' +
        '<label><input type="radio" name="' + name + '" value="SI"> SI</label>' +
        '<label><input type="radio" name="' + name + '" value="NO"> NO</label>' +
        '</div>';
      cont.appendChild(item);
    });
  }

  /* -------- Hijos dinámicos -------- */
  const hijosList = document.getElementById('hijosList');

  function crearFilaHijo(nombre, edad) {
    const row = document.createElement('div');
    row.className = 'hijo-row';
    row.innerHTML =
      '<input type="text" class="hijo-nombre" placeholder="Nombre del hijo(a)">' +
      '<input type="number" class="hijo-edad" min="0" placeholder="Edad">' +
      '<button type="button" class="hijo-del no-print" title="Quitar">✕</button>';
    row.querySelector('.hijo-nombre').value = nombre || '';
    row.querySelector('.hijo-edad').value = edad || '';
    row.querySelector('.hijo-del').addEventListener('click', function () {
      row.remove();
      guardar();
    });
    row.querySelectorAll('input').forEach((inp) =>
      inp.addEventListener('input', guardar)
    );
    hijosList.appendChild(row);
    return row;
  }

  document.getElementById('btnAddHijo').addEventListener('click', function () {
    crearFilaHijo('', '');
    guardar();
  });

  // ¿Tiene hijos? NO -> vacía la lista; SI -> deja una fila lista para llenar
  function actualizarHijos() {
    const grupo = form.elements['tiene_hijos'];
    const tiene = grupo && grupo.value === 'SI';
    if (!tiene) {
      hijosList.innerHTML = '';
    } else if (!hijosList.querySelector('.hijo-row')) {
      crearFilaHijo('', '');
    }
  }
  form.querySelectorAll('input[name="tiene_hijos"]').forEach(function (r) {
    r.addEventListener('change', function () { actualizarHijos(); guardar(); });
  });

  function leerHijos() {
    return Array.from(hijosList.querySelectorAll('.hijo-row')).map((r) => ({
      nombre: r.querySelector('.hijo-nombre').value,
      edad: r.querySelector('.hijo-edad').value
    }));
  }

  /* -------- Foto -------- */
  const fotoInput = document.getElementById('fotoInput');
  const fotoPreview = document.getElementById('fotoPreview');
  const fotoPlaceholder = document.getElementById('fotoPlaceholder');
  let fotoData = '';

  function mostrarFoto(dataURL) {
    fotoData = dataURL || '';
    if (fotoData) {
      fotoPreview.src = fotoData;
      fotoPreview.hidden = false;
      fotoPlaceholder.hidden = true;
      const fb = document.getElementById('fotoBox');
      if (fb) fb.classList.remove('campo-error');
    } else {
      fotoPreview.removeAttribute('src');
      fotoPreview.hidden = true;
      fotoPlaceholder.hidden = false;
    }
  }

  fotoInput.addEventListener('change', function () {
    const file = fotoInput.files && fotoInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      // Redimensionar para no llenar el almacenamiento
      const img = new Image();
      img.onload = function () {
        const max = 600;
        let w = img.width, h = img.height;
        if (w > h && w > max) { h = h * max / w; w = max; }
        else if (h > max) { w = w * max / h; h = max; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        mostrarFoto(canvas.toDataURL('image/jpeg', 0.8));
        guardar();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btnFotoDel').addEventListener('click', function () {
    mostrarFoto('');
    fotoInput.value = '';
    guardar();
  });

  /* -------- Cámara en vivo (getUserMedia) -------- */
  const camModal = document.getElementById('camModal');
  const camVideo = document.getElementById('camVideo');
  const camError = document.getElementById('camError');
  const btnFotoCam = document.getElementById('btnFotoCam');
  const camCapture = document.getElementById('camCapture');
  const camSwitch = document.getElementById('camSwitch');
  const camCancel = document.getElementById('camCancel');
  let camStream = null;
  let camFacing = 'user';

  function detenerCamara() {
    if (camStream) {
      camStream.getTracks().forEach(function (t) { t.stop(); });
      camStream = null;
    }
    camVideo.srcObject = null;
  }

  async function iniciarStream() {
    detenerCamara();
    if (camError) camError.hidden = true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      mostrarErrorCam('Este navegador no permite usar la cámara. Usa "Subir" para elegir una imagen.');
      return;
    }
    try {
      camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: camFacing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false
      });
      camVideo.srcObject = camStream;
    } catch (e) {
      let msg = 'No se pudo acceder a la cámara.';
      if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) {
        msg = 'Permiso de cámara denegado. Habilítalo en el navegador (ícono de la barra de direcciones) e inténtalo de nuevo.';
      } else if (e && e.name === 'NotFoundError') {
        msg = 'No se encontró ninguna cámara en este dispositivo.';
      } else if (e && e.name === 'NotReadableError') {
        msg = 'La cámara está siendo usada por otra aplicación. Ciérrala e inténtalo de nuevo.';
      }
      mostrarErrorCam(msg);
    }
  }

  function mostrarErrorCam(msg) {
    if (camError) { camError.textContent = msg; camError.hidden = false; }
  }

  function abrirCamara() {
    camModal.hidden = false;
    iniciarStream();
  }
  function cerrarCamara() {
    detenerCamara();
    camModal.hidden = true;
  }

  if (btnFotoCam) btnFotoCam.addEventListener('click', abrirCamara);
  if (camCancel) camCancel.addEventListener('click', cerrarCamara);
  if (camSwitch) camSwitch.addEventListener('click', function () {
    camFacing = (camFacing === 'user') ? 'environment' : 'user';
    iniciarStream();
  });
  if (camCapture) camCapture.addEventListener('click', function () {
    if (!camVideo.videoWidth) { mostrarErrorCam('Espera a que cargue la cámara…'); return; }
    let w = camVideo.videoWidth, h = camVideo.videoHeight;
    const max = 600;
    if (w > h && w > max) { h = h * max / w; w = max; }
    else if (h > max) { w = w * max / h; h = max; }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(camVideo, 0, 0, w, h);
    mostrarFoto(canvas.toDataURL('image/jpeg', 0.85));
    guardar();
    cerrarCamara();
  });

  /* -------- Paneles de firma (táctil + responsivo) -------- */
  function crearPadFirma(canvas) {
    const ctx = canvas.getContext('2d');
    let dibujando = false;
    let tieneFirma = false;
    let ultimoDataURL = '';   // se conserva para redibujar al reajustar tamaño

    function ajustarTamano() {
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#10233f';
      if (ultimoDataURL) {
        const img = new Image();
        img.onload = function () { ctx.drawImage(img, 0, 0, rect.width, rect.height); };
        img.src = ultimoDataURL;
      }
    }

    function pos(e) {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function iniciar(e) {
      e.preventDefault();
      dibujando = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
    function mover(e) {
      if (!dibujando) return;
      e.preventDefault();
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      tieneFirma = true;
    }
    function terminar() {
      if (!dibujando) return;
      dibujando = false;
      if (tieneFirma) {
        ultimoDataURL = canvas.toDataURL('image/png');
        const wrap = canvas.closest('.firma-canvas-wrap');
        if (wrap) wrap.classList.remove('campo-error');
        guardar();
      }
    }

    canvas.addEventListener('pointerdown', iniciar);
    canvas.addEventListener('pointermove', mover);
    canvas.addEventListener('pointerup', terminar);
    canvas.addEventListener('pointerleave', terminar);
    canvas.addEventListener('pointercancel', terminar);

    let resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(ajustarTamano, 200);
    });

    // API pública del pad
    return {
      ajustar: ajustarTamano,
      limpiar: function () {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        tieneFirma = false;
        ultimoDataURL = '';
      },
      cargar: function (dataURL) {
        ultimoDataURL = dataURL || '';
        tieneFirma = !!dataURL;
        ajustarTamano();
      },
      valor: function () { return tieneFirma ? ultimoDataURL : ''; }
    };
  }

  const padCandidato = crearPadFirma(document.getElementById('firmaCandidato'));
  const padEmpleador = crearPadFirma(document.getElementById('firmaEmpleador'));

  document.querySelectorAll('.firma-clear').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const pad = btn.dataset.pad === 'empleador' ? padEmpleador : padCandidato;
      pad.limpiar();
      guardar();
    });
  });

  /* -------- Listas con opción "Otra" (Seguridad Social) -------- */
  function sincronizarOtra(sel, limpiar) {
    const otra = form.elements[sel.dataset.otra];
    if (!otra) return;
    const esOtra = sel.value === 'Otra';
    otra.hidden = !esOtra;
    if (!esOtra && limpiar) otra.value = '';
    if (!esOtra) otra.classList.remove('campo-error');
  }
  const selectsOtra = form.querySelectorAll('select.con-otra');
  selectsOtra.forEach(function (sel) {
    sel.addEventListener('change', function () {
      sincronizarOtra(sel, true);
      const otra = form.elements[sel.dataset.otra];
      if (sel.value === 'Otra' && otra) otra.focus();
    });
  });
  function actualizarTodasOtra() {
    selectsOtra.forEach(function (sel) { sincronizarOtra(sel, false); });
  }

  /* -------- Campos condicionales (data-show-when="radio:VALOR") --------
     Muestra/oculta un bloque según la respuesta SI/NO de un grupo de radios.
     Al ocultarse limpia su contenido y lo saca de la validación obligatoria. */
  function configurarCondicionales() {
    const refrescadores = [];
    document.querySelectorAll('[data-show-when]').forEach(function (cont) {
      const partes = cont.dataset.showWhen.split(':');
      const nombre = partes[0];
      const valorEsperado = partes[1];

      function actualizar(limpiar) {
        const grupo = form.elements[nombre];
        const activo = grupo && grupo.value === valorEsperado;
        cont.hidden = !activo;
        if (!activo && limpiar) {
          cont.querySelectorAll('input, select, textarea').forEach(function (el) {
            if (el.type === 'radio' || el.type === 'checkbox') el.checked = false;
            else el.value = '';
            el.classList.remove('campo-error');
          });
        }
      }

      form.querySelectorAll('input[name="' + CSS.escape(nombre) + '"]').forEach(function (r) {
        r.addEventListener('change', function () { actualizar(true); guardar(); });
      });
      refrescadores.push(actualizar);
    });
    return function () { refrescadores.forEach(function (fn) { fn(false); }); };
  }
  let refrescarCondicionales = function () {};

  /* -------- Espejos: autocompletar campos repetidos del mismo candidato -------- */
  const elNombres = form.elements['nombres'];
  const elApellidos = form.elements['apellidos'];
  const elIdent = form.elements['identificacion'];
  const espejoFirma = form.elements['constancia_firma'];
  const espejoCedula = form.elements['constancia_cedula'];

  function nombreCompleto() {
    return [elNombres.value.trim(), elApellidos.value.trim()].filter(Boolean).join(' ');
  }

  function sincronizarEspejos() {
    if (espejoFirma.dataset.manual !== '1') espejoFirma.value = nombreCompleto();
    if (espejoCedula.dataset.manual !== '1') espejoCedula.value = elIdent.value.trim();
  }

  // Si el usuario edita a mano un campo espejo, se respeta y deja de autocompletarse
  [espejoFirma, espejoCedula].forEach(function (el) {
    el.addEventListener('input', function () { el.dataset.manual = '1'; });
  });
  [elNombres, elApellidos, elIdent].forEach(function (el) {
    el.addEventListener('input', sincronizarEspejos);
  });

  /* -------- Guardar / Cargar -------- */
  let saveTimer = null;

  function recolectar() {
    const data = {};
    const elementos = form.querySelectorAll('input[name], select[name], textarea[name]');
    elementos.forEach((el) => {
      if (el.type === 'radio') {
        if (el.checked) data[el.name] = el.value;
      } else if (el.type === 'checkbox') {
        data[el.name] = el.checked;
      } else {
        data[el.name] = el.value;
      }
    });
    return {
      campos: data,
      hijos: leerHijos(),
      foto: fotoData,
      firmas: { candidato: padCandidato.valor(), empleador: padEmpleador.valor() },
      manual: {
        constancia_firma: espejoFirma.dataset.manual === '1',
        constancia_cedula: espejoCedula.dataset.manual === '1'
      }
    };
  }

  function guardar() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recolectar()));
        marcarGuardado('Guardado ✓ ' + horaActual());
      } catch (err) {
        marcarGuardado('⚠️ No se pudo guardar (almacenamiento lleno)');
      }
    }, 350);
  }

  function aplicar(state) {
    if (!state) return;
    const data = state.campos || {};
    Object.keys(data).forEach((name) => {
      const els = form.querySelectorAll('[name="' + CSS.escape(name) + '"]');
      els.forEach((el) => {
        if (el.type === 'radio') {
          el.checked = (el.value === data[name]);
        } else if (el.type === 'checkbox') {
          el.checked = !!data[name];
        } else {
          el.value = data[name];
        }
      });
    });
    hijosList.innerHTML = '';
    (state.hijos || []).forEach((h) => crearFilaHijo(h.nombre, h.edad));
    mostrarFoto(state.foto || '');
    const firmas = state.firmas || {};
    padCandidato.cargar(firmas.candidato || '');
    padEmpleador.cargar(firmas.empleador || '');
    const manual = state.manual || {};
    espejoFirma.dataset.manual = manual.constancia_firma ? '1' : '';
    espejoCedula.dataset.manual = manual.constancia_cedula ? '1' : '';
  }

  function cargar() {
    let state = null;
    try {
      state = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) { state = null; }
    aplicar(state);
  }

  function horaActual() {
    const d = new Date();
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  function marcarGuardado(msg) {
    saveStatus.textContent = msg;
  }

  /* -------- Validación: todos los campos obligatorios -------- */
  let toastTimer = null;
  function avisarValidacion(msg) {
    let toast = document.getElementById('toastAviso');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toastAviso';
      toast.className = 'toast-aviso no-print';
      document.body.appendChild(toast);
    }
    toast.textContent = (arguments[1] ? '✅ ' : '⚠️ ') + msg;
    toast.classList.toggle('toast-ok', !!arguments[1]);
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('visible'); }, 5000);
  }

  function limpiarError(el) {
    if (!el) return;
    el.classList.remove('campo-error');
  }
  function marcarError(el) {
    if (!el) return;
    el.classList.add('campo-error');
  }

  function validarCompleto() {
    const faltantes = [];
    // Quita marcas previas
    form.querySelectorAll('.campo-error').forEach((el) => el.classList.remove('campo-error'));

    // 1) Campos de texto, número, fecha, select y textarea
    const radios = {};
    form.querySelectorAll('input[name], select[name], textarea[name]').forEach((el) => {
      // ignora campos no visibles (ej. "Otra" inactivo, o experiencia oculta)
      if (el.offsetParent === null && el.type !== 'hidden') return;
      if (el.type === 'radio') {
        radios[el.name] = radios[el.name] || [];
        radios[el.name].push(el);
        return;
      }
      if (!String(el.value).trim()) {
        marcarError(el);
        faltantes.push(el);
      }
    });

    // 2) Grupos de opciones SI/NO (radios): debe haber uno elegido
    Object.keys(radios).forEach((name) => {
      const grupo = radios[name];
      if (!grupo.some((r) => r.checked)) {
        const cont = grupo[0].closest('.sino') || grupo[0].closest('.field') || grupo[0];
        marcarError(cont);
        faltantes.push(grupo[0]);
      }
    });

    // 3) Filas de hijos que se hayan agregado deben estar completas
    hijosList.querySelectorAll('.hijo-row input').forEach((inp) => {
      if (!inp.value.trim()) { marcarError(inp); faltantes.push(inp); }
    });

    // 4) Foto obligatoria
    if (!fotoData) {
      const fb = document.getElementById('fotoBox');
      marcarError(fb);
      faltantes.push(fb);
    }

    // 5) Firmas obligatorias
    if (!padCandidato.valor()) {
      const w = document.getElementById('firmaCandidato').closest('.firma-canvas-wrap');
      marcarError(w); faltantes.push(w);
    }
    // Firma del empleador: solo se exige si la sección está visible (admin)
    const empWrap = document.getElementById('firmaEmpleador').closest('.firma-canvas-wrap');
    if (empWrap && empWrap.offsetParent !== null && !padEmpleador.valor()) {
      marcarError(empWrap); faltantes.push(empWrap);
    }

    return faltantes;
  }

  // Cuando el usuario corrige un campo, le quita la marca de error
  form.addEventListener('input', function (e) { limpiarError(e.target); });
  form.addEventListener('change', function (e) {
    limpiarError(e.target);
    const cont = e.target.closest && (e.target.closest('.sino') || e.target.closest('.field'));
    if (cont) limpiarError(cont);
  });

  /* -------- Carga completa de un estado (para el panel admin) -------- */
  function aplicarTodo(state) {
    aplicar(state);
    actualizarTodasOtra();
    refrescarCondicionales();
    actualizarHijos();
    sincronizarEspejos();
  }

  // API del formulario, usada por el panel de administrador (admin.js)
  window.hv = {
    recolectar: recolectar,
    aplicar: aplicarTodo,
    validar: validarCompleto,
    avisar: avisarValidacion
  };

  /* -------- Enviar hoja de vida a la nube -------- */
  const btnEnviar = document.getElementById('btnEnviar');
  if (btnEnviar) {
    btnEnviar.addEventListener('click', async function () {
      const faltantes = validarCompleto();
      if (faltantes.length > 0) {
        avisarValidacion('Faltan ' + faltantes.length + ' campo(s) por completar antes de enviar.');
        const p = faltantes[0];
        if (p && p.scrollIntoView) p.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (!window.cloud || !window.cloud.token()) {
        avisarValidacion('Debes iniciar sesión para enviar.');
        return;
      }
      btnEnviar.disabled = true;
      btnEnviar.textContent = 'Enviando…';
      try {
        const state = recolectar();
        const c = state.campos || {};
        const payload = {
          nombres: c.nombres || '',
          apellidos: c.apellidos || '',
          identificacion: c.identificacion || '',
          cargo: c.cargo || '',
          celular: c.celular || '',
          datos: state,
          estado: 'pendiente'
        };
        await window.cloud.guardarHoja(payload);
        avisarValidacion('Hoja de vida enviada para revisión.', true);
      } catch (e) {
        avisarValidacion('No se pudo enviar: ' + (e.message || e));
      } finally {
        btnEnviar.disabled = false;
        btnEnviar.textContent = '📤 Enviar';
      }
    });
  }

  /* -------- Botones -------- */
  document.getElementById('btnPrint').addEventListener('click', function () {
    const faltantes = validarCompleto();
    if (faltantes.length > 0) {
      avisarValidacion(
        'Faltan ' + faltantes.length + ' campo(s) por completar. ' +
        'Están marcados en rojo. Completa todo antes de generar el PDF.'
      );
      const primero = faltantes[0];
      if (primero && primero.scrollIntoView) {
        primero.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (primero.focus) { try { primero.focus({ preventScroll: true }); } catch (e) {} }
      }
      return;
    }
    window.print();
  });

  document.getElementById('btnNew').addEventListener('click', function () {
    if (!confirm('¿Borrar todos los datos y empezar una hoja de vida nueva?')) return;
    localStorage.removeItem(STORAGE_KEY);
    form.reset();
    hijosList.innerHTML = '';
    mostrarFoto('');
    padCandidato.limpiar();
    padEmpleador.limpiar();
    espejoFirma.dataset.manual = '';
    espejoCedula.dataset.manual = '';
    actualizarTodasOtra();
    refrescarCondicionales();
    actualizarHijos();
    marcarGuardado('Formulario nuevo');
  });

  /* -------- Inicio -------- */
  construirEncuesta();
  refrescarCondicionales = configurarCondicionales(); // tras crear la encuesta
  cargar();
  actualizarTodasOtra();  // muestra el campo "Otra" si venía seleccionado
  refrescarCondicionales(); // muestra/oculta bloques según lo guardado
  actualizarHijos();      // prepara la lista de hijos según SI/NO
  sincronizarEspejos();   // completa los campos repetidos al abrir
  // Asegura que los canvas de firma queden con el tamaño correcto al iniciar
  padCandidato.ajustar();
  padEmpleador.ajustar();

  // Guardado automático ante cualquier cambio
  form.addEventListener('input', guardar);
  form.addEventListener('change', guardar);

  /* -------- PWA: instalación -------- */
  let deferredPrompt = null;
  const btnInstall = document.getElementById('btnInstall');
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    btnInstall.hidden = false;
  });
  btnInstall.addEventListener('click', async function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btnInstall.hidden = true;
  });
  window.addEventListener('appinstalled', function () {
    btnInstall.hidden = true;
  });

  /* -------- Versión visible -------- */
  const appVersion = window.APP_VERSION || '—';
  const verEl = document.getElementById('appVersion');
  if (verEl) verEl.textContent = 'v' + appVersion;

  /* -------- PWA: service worker DESACTIVADO temporalmente --------
     Durante el desarrollo desregistramos cualquier service worker y
     borramos sus cachés, para que SIEMPRE se cargue la última versión
     sin necesidad de limpiar caché. Se reactivará al final, ya estable. */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { r.unregister(); });
    }).catch(function () {});
    if (window.caches && caches.keys) {
      caches.keys().then(function (keys) {
        keys.forEach(function (k) { caches.delete(k); });
      }).catch(function () {});
    }
  }
})();
