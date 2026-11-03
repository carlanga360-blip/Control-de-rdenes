/* Controlador principal: vistas, menú, bandeja, envío y datos de demostración */

const App = (() => {
  const $ = (s) => document.querySelector(s);
  let view = 'form';
  let dirty = false;
  let inboxTab = 'enviado';

  function init() {
    $('#btnClose').innerHTML = ICONS.close;
    $('#btnMenu').innerHTML = ICONS.menu;
    $('#gpsStatus').innerHTML = ICONS.satellite;
    $('#btnSubmit').innerHTML = ICONS.check;

    Form.init($('#view-form'), {
      onDirty: () => {
        dirty = true;
        updateProgress();
      },
    });
    Form.load(null);
    updateProgress();

    GPS.start();
    GPS.onChange((p) => {
      const s = $('#gpsStatus');
      s.classList.toggle('gps-ok', !!p && p.acc <= 15);
      s.classList.toggle('gps-mid', !!p && p.acc > 15);
      s.title = p ? `GPS: ±${p.acc} m` : 'GPS sin señal';
    });

    $('#btnMenu').addEventListener('click', toggleMenu);
    $('#btnClose').addEventListener('click', closeForm);
    $('#btnSubmit').addEventListener('click', submit);
    document.querySelectorAll('#menu [data-action]').forEach((b) =>
      b.addEventListener('click', () => {
        toggleMenu(false);
        actions[b.dataset.action]();
      })
    );
    $('#menuBackdrop').addEventListener('click', () => toggleMenu(false));
    window.addEventListener('beforeunload', (e) => {
      if (dirty && view === 'form') {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  function toggleMenu(force) {
    const open = typeof force === 'boolean' ? force : $('#menu').classList.contains('hidden');
    $('#menu').classList.toggle('hidden', !open);
    $('#menuBackdrop').classList.toggle('hidden', !open);
  }

  function show(v) {
    view = v;
    ['form', 'inbox', 'dash'].forEach((n) => $(`#view-${n}`).classList.toggle('hidden', n !== v));
    $('#formbar').classList.toggle('hidden', v !== 'form');
    $('#appTitle').textContent = { form: 'Infocomunicaciones', inbox: 'Bandeja', dash: 'Tablero de jefaturas' }[v];
    $('#btnClose').title = v === 'form' ? 'Cerrar formulario' : 'Volver al formulario';
    window.scrollTo(0, 0);
    if (v === 'inbox') renderInbox();
    if (v === 'dash') Dashboard.render($('#view-dash'));
  }

  function updateProgress() {
    const { done, total } = Form.progress();
    const pct = total ? Math.round((done / total) * 100) : 0;
    $('#progressFill').style.width = `${pct}%`;
    const st = Form.current();
    $('#progressText').textContent = st && st.editingId ? 'Editando registro' : '';
  }

  function authKeep() {
    const d = Form.current()?.data || {};
    return isAuth(d) ? { usuario: d.usuario, contrasena: d.contrasena } : null;
  }

  function newForm(force) {
    if (!force && dirty && !confirm('¿Descartar los cambios del levantamiento actual?')) return false;
    Form.load(null, authKeep());
    dirty = false;
    updateProgress();
    show('form');
    return true;
  }

  function closeForm() {
    if (view !== 'form') return show('form');
    if (!dirty) return toggleMenu(true);
    const choice = confirm('¿Desea guardar el levantamiento actual como borrador antes de cerrarlo?\n\nAceptar = Guardar borrador   ·   Cancelar = Descartar');
    if (choice) saveDraft();
    else newForm(true);
  }

  async function submit() {
    if (!Form.validate()) return;
    const st = Form.current();
    const rec = {
      id: st.editingId || crypto.randomUUID?.() || `r${Date.now()}${Math.random().toString(16).slice(2)}`,
      status: 'enviado',
      created: st.created || new Date().toISOString(),
      updated: new Date().toISOString(),
      data: Form.cleanData(),
    };
    try {
      await DB.put(rec);
    } catch (e) {
      toast('No se pudo guardar el registro: ' + (e?.message || e), 'error', 4000);
      return;
    }
    toast(rec.data.levantable === 'No' ? 'Poste pendiente registrado ✓' : 'Levantamiento enviado ✓', 'ok');
    dirty = false;
    Form.load(null, authKeep());
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveDraft() {
    const st = Form.current();
    const data = JSON.parse(JSON.stringify(st.data));
    delete data.contrasena;
    const rec = {
      id: st.editingId || crypto.randomUUID?.() || `r${Date.now()}`,
      status: 'borrador',
      created: st.created || new Date().toISOString(),
      updated: new Date().toISOString(),
      data,
    };
    await DB.put(rec);
    toast('Borrador guardado en la bandeja', 'ok');
    dirty = false;
    Form.load(null, authKeep());
    updateProgress();
  }

  /* ---------- Bandeja ---------- */
  async function renderInbox() {
    const c = $('#view-inbox');
    const all = (await DB.all()).sort((a, b) => (b.data.fecha || '').localeCompare(a.data.fecha || ''));
    const list = all.filter((r) => r.status === inboxTab);
    c.innerHTML = '';
    c.append(
      el(
        'div',
        { class: 'tabs' },
        [
          ['enviado', 'Enviados'],
          ['borrador', 'Borradores'],
        ].map(([k, l]) =>
          el(
            'button',
            {
              class: `tab ${inboxTab === k ? 'on' : ''}`,
              onclick: () => {
                inboxTab = k;
                renderInbox();
              },
            },
            `${l} (${all.filter((r) => r.status === k).length})`
          )
        )
      )
    );
    if (!list.length) {
      c.append(el('div', { class: 'card empty muted' }, inboxTab === 'enviado' ? 'No hay levantamientos enviados.' : 'No hay borradores guardados.'));
      return;
    }
    const ul = el('div', { class: 'inbox-list' });
    list.forEach((r) => {
      const d = r.data;
      const est = LISTS.estado.find((e) => e.value === d.estado_poste);
      const color = d.levantable === 'No' ? '#7a7a7a' : est ? est.color : '#bbb';
      const title =
        d.levantable === 'No' ? 'Poste no levantado' : d.placa ? `Placa ${d.placa}` : 'Levantamiento sin placa';
      const sub =
        d.levantable === 'No'
          ? d.motivo || ''
          : [d.uso_poste, d.material, d.altura, `${(d.cableras || []).length} cablera(s)`].filter(Boolean).join(' · ');
      ul.append(
        el(
          'div',
          { class: 'inbox-item', onclick: () => openRecord(r) },
          el('span', { class: 'inbox-dot', style: `background:${color}` }),
          el(
            'div',
            { class: 'inbox-main' },
            el('div', { class: 'inbox-title' }, title),
            el('div', { class: 'inbox-sub' }, sub),
            el('div', { class: 'inbox-meta' }, `${d.usuario || 'Sin usuario'} · ${d.fecha ? fmtDateTime(d.fecha) : ''}`)
          ),
          el('button', {
            class: 'icon-btn dark',
            title: 'Eliminar',
            html: ICONS.trash,
            onclick: async (e) => {
              e.stopPropagation();
              if (!confirm('¿Eliminar este registro definitivamente?')) return;
              await DB.remove(r.id);
              renderInbox();
            },
          })
        )
      );
    });
    c.append(ul);
  }

  function openRecord(r) {
    if (r.status === 'borrador') {
      if (dirty && !confirm('¿Descartar los cambios del levantamiento actual?')) return;
      Form.load(r, authKeep());
      dirty = false;
      updateProgress();
      show('form');
      toast('Borrador abierto en el formulario', 'info');
      return;
    }
    showDetail(r);
  }

  function showDetail(r) {
    const d = r.data;
    const rows = [];
    const add = (label, value) => {
      if (value == null || value === '') return;
      rows.push(el('div', { class: 'det-row' }, el('div', { class: 'det-k' }, label), el('div', { class: 'det-v' }, value)));
    };
    const photo = (label, src) =>
      src && rows.push(el('div', { class: 'det-row' }, el('div', { class: 'det-k' }, label), el('img', { class: 'det-img', src, onclick: () => showImage(src) })));
    const estado = LISTS.estado.find((e) => e.value === d.estado_poste);

    add('Fecha y hora', fmtDateTime(d.fecha));
    add('Usuario', d.usuario);
    add('¿Se puede levantar?', d.levantable);
    add('Motivo', d.motivo);
    photo('Foto', d.foto_no_levantado);
    add('Observaciones', d.observaciones);
    if (estado) add('Estado del poste', el('span', {}, el('span', { class: 'dot', style: `background:${estado.color}` }), ' ', estado.label));
    add('Uso del poste', d.uso_poste);
    add('Material', d.material);
    add('Altura', d.altura);
    add('Tiene #activo', d.tiene_activo);
    add('Activo (viejo)', d.activo);
    add('# Localización', d.localizacion);
    add('Número de placa', d.placa);
    photo('Fotografía de la placa', d.foto_placa);
    if (d.ubicacion)
      add('Ubicación', `${d.ubicacion.lat.toFixed(6)}, ${d.ubicacion.lon.toFixed(6)}${d.ubicacion.acc ? ` (±${d.ubicacion.acc} m)` : ' (mapa)'}`);
    add('Requiere anclaje', d.anclaje);
    add('Tipo de vano', d.tipo_vano);
    add('Elementos en el poste', d.elementos);
    (d.cableras || []).forEach((c, i) => {
      rows.push(el('div', { class: 'det-sub' }, `Cablera ${i + 1} de ${d.cableras.length}`));
      add('Empresa', c.empresa);
      add('Posición', c.posicion);
      add('Espacios ocupados', c.espacios);
      add('Tipo cable', c.tipo_cable);
      add('Vestidura', c.vestidura);
      add('Estado', c.estado_red);
      add('Altura de vano', c.altura_vano);
      add('Cable etiquetado', c.etiquetado);
      add('Existencia de cierre', c.cierre);
      add('Requiere reubicación', c.reubicacion);
    });
    photo('Fotografía cablera', d.foto_cablera);
    photo('Fotografía poste', d.foto_poste);

    const close = () => ov.remove();
    const ov = el(
      'div',
      { class: 'modal', onclick: close },
      el(
        'div',
        { class: 'sheet tall', onclick: (e) => e.stopPropagation() },
        el('div', { class: 'sheet-head' }, d.levantable === 'No' ? 'Poste no levantado' : `Placa ${d.placa || '—'}`),
        el('div', { class: 'det' }, rows),
        el(
          'div',
          { class: 'sheet-actions' },
          el(
            'button',
            {
              class: 'btn',
              onclick: () => {
                if (dirty && !confirm('¿Descartar los cambios del levantamiento actual?')) return;
                close();
                Form.load(r, authKeep());
                dirty = false;
                updateProgress();
                show('form');
                toast('Editando registro enviado', 'info');
              },
            },
            'Editar'
          ),
          el('button', { class: 'btn btn-primary', onclick: close }, 'Cerrar')
        )
      )
    );
    document.body.append(ov);
  }

  /* ---------- Datos de demostración ---------- */
  function demoPhoto(text, hue) {
    const c = document.createElement('canvas');
    c.width = 320;
    c.height = 240;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, 240);
    grd.addColorStop(0, `hsl(${hue},45%,70%)`);
    grd.addColorStop(1, `hsl(${hue},35%,35%)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, 320, 240);
    g.fillStyle = '#555';
    g.fillRect(150, 30, 20, 210);
    g.strokeStyle = '#222';
    g.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(0, 80 + i * 18);
      g.quadraticCurveTo(160, 100 + i * 18, 320, 80 + i * 18);
      g.stroke();
    }
    g.fillStyle = '#fff';
    g.font = 'bold 18px sans-serif';
    g.fillText(text, 12, 228);
    return c.toDataURL('image/jpeg', 0.6);
  }

  async function loadDemo() {
    if (!confirm('Se agregarán 40 levantamientos de demostración a la bandeja. ¿Continuar?')) return;
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const wpick = (pairs) => {
      const t = pairs.reduce((s, [, w]) => s + w, 0);
      let r = Math.random() * t;
      for (const [v, w] of pairs) if ((r -= w) < 0) return v;
      return pairs[0][0];
    };
    const centers = [
      [10.2617, -85.5847], // Santa Cruz
      [10.1483, -85.4520], // Nicoya
      [10.0333, -85.7000], // Sámara aprox.
      [10.4380, -85.4250], // Filadelfia aprox.
    ];
    const photos = {
      placa: demoPhoto('DEMO · Placa', 120),
      cablera: demoPhoto('DEMO · Cablera', 200),
      poste: demoPhoto('DEMO · Poste', 30),
    };
    const recs = [];
    const now = Date.now();
    for (let i = 0; i < 40; i++) {
      const [clat, clon] = pick(centers);
      const fecha = new Date(now - Math.random() * 14 * 864e5).toISOString();
      const ubic = {
        lat: +(clat + (Math.random() - 0.5) * 0.02).toFixed(6),
        lon: +(clon + (Math.random() - 0.5) * 0.02).toFixed(6),
        acc: 3 + Math.floor(Math.random() * 8),
        src: 'gps',
      };
      const usuario = pick(LISTS.cuadrillas);
      let data;
      if (Math.random() < 0.15) {
        data = { fecha, usuario, levantable: 'No', motivo: pick(LISTS.motivo), ubicacion: ubic };
        if (Math.random() < 0.4) data.observaciones = 'Portón con candado, se coordina con propietario.';
      } else {
        const material = wpick([['Concreto', 6], ['Madera', 3], ['Metálico', 1], ['Fibra de vidrio', 0.5]]);
        const tieneActivo = Math.random() < 0.6 ? 'Si' : 'No';
        const nCab = wpick([[0, 1], [1, 3], [2, 4], [3, 3], [4, 1]]);
        const empresas = [...LISTS.empresa].sort(() => Math.random() - 0.5).slice(0, nCab);
        data = {
          fecha,
          usuario,
          levantable: 'Si',
          estado_poste: wpick([['1', 6], ['2', 3], ['3', 1]]),
          uso_poste: wpick([['Eléctrico', 2], ['Eléctrico-TELE', 6], ['Telecom', 1]]),
          material,
          altura: pick(LISTS.altura[material]),
          tiene_activo: tieneActivo,
          placa: `CG-${String(100000 + Math.floor(Math.random() * 899999))}`,
          foto_placa: photos.placa,
          ubicacion: ubic,
          anclaje: Math.random() < 0.25 ? 'Si' : 'No',
          tipo_vano: pick(LISTS.vano),
          elementos: Math.random() < 0.5 ? 'Si' : 'No',
          cableras: empresas.map((empresa, idx) => ({
            empresa,
            posicion: String(idx + 1),
            espacios: wpick([['1', 6], ['2', 3], ['3', 1]]),
            tipo_cable: wpick([['Fibra', 6], ['Cobre', 3]]),
            vestidura: pick(LISTS.vestidura),
            estado_red: wpick([['En uso', 8], ['Desuso', 2]]),
            altura_vano: wpick([['Cumple', 8], ['No cumple', 2]]),
            etiquetado: wpick([['Si', 6], ['No', 4]]),
            cierre: wpick([['Si', 3], ['No', 7]]),
            reubicacion: wpick([['Si', 2], ['No', 8]]),
          })),
          foto_cablera: Math.random() < 0.9 ? photos.cablera : undefined,
          foto_poste: Math.random() < 0.95 ? photos.poste : undefined,
        };
        if (tieneActivo === 'Si') {
          data.activo = String(20000 + Math.floor(Math.random() * 70000));
          data.localizacion = `L-${Math.floor(Math.random() * 9000) + 1000}`;
        }
        Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
      }
      recs.push({ id: `demo-${now}-${i}`, status: 'enviado', created: fecha, updated: fecha, demo: true, data });
    }
    await DB.putMany(recs);
    toast('Datos de demostración cargados', 'ok');
    show('dash');
  }

  async function clearDemo() {
    const demo = (await DB.all()).filter((r) => r.demo);
    if (!demo.length) return toast('No hay datos de demostración', 'info');
    if (!confirm(`¿Eliminar ${demo.length} registros de demostración?`)) return;
    await Promise.all(demo.map((r) => DB.remove(r.id)));
    toast('Datos de demostración eliminados', 'ok');
    refresh();
  }

  function refresh() {
    if (view === 'inbox') renderInbox();
    if (view === 'dash') Dashboard.render($('#view-dash'));
  }

  function about() {
    const close = () => ov.remove();
    const ov = el(
      'div',
      { class: 'modal', onclick: close },
      el(
        'div',
        { class: 'sheet', onclick: (e) => e.stopPropagation() },
        el('div', { class: 'sheet-head' }, 'Acerca de'),
        el(
          'div',
          { class: 'pad' },
          el('p', {}, el('b', {}, 'Infocomunicaciones'), ' — Levantamiento de Infraestructuras e Inventario de Cableras.'),
          el('p', { class: 'muted' }, 'Emulación web del formulario Survey123. Los registros se guardan en este dispositivo (sin servidor) y pueden exportarse a CSV, GeoJSON o respaldo JSON.'),
          el('p', { class: 'muted' }, 'Contraseñas de prueba: Cuadrilla 1 = 1111, Cuadrilla 2 = 2222, … Cuadrilla 6 = 6666 (configurables en js/config.js).')
        ),
        el('div', { class: 'sheet-actions' }, el('button', { class: 'btn btn-primary', onclick: close }, 'Cerrar'))
      )
    );
    document.body.append(ov);
  }

  const actions = {
    nuevo: () => newForm(),
    borrador: () => (view === 'form' ? saveDraft() : toast('Abra el formulario para guardar un borrador', 'info')),
    bandeja: () => show('inbox'),
    tablero: () => show('dash'),
    csv: () => Dashboard.exportCsv(),
    geojson: () => Dashboard.exportGeoJson(),
    respaldo: () => Dashboard.exportBackup(),
    importar: () => Dashboard.importBackup(),
    demo: loadDemo,
    limpiarDemo: clearDemo,
    acerca: about,
  };

  return { init, refresh };
})();

document.addEventListener('DOMContentLoaded', App.init);
