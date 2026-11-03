/* Tablero de seguimiento para jefaturas (sección 8 de la guía) y exportaciones */

const Dashboard = (() => {
  let map = null;
  let layer = null;

  function countBy(arr, fn) {
    const m = new Map();
    arr.forEach((x) => {
      const k = fn(x);
      if (k == null || k === '') return;
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  }

  function barList(title, entries, opts = {}) {
    const total = opts.total ?? entries.reduce((a, [, v]) => a + v, 0);
    const max = Math.max(1, ...entries.map(([, v]) => v));
    return el(
      'div',
      { class: 'card' },
      el('h3', {}, title),
      entries.length
        ? el(
            'div',
            { class: 'bars' },
            entries.map(([k, v]) =>
              el(
                'div',
                { class: 'bar-row' },
                el('div', { class: 'bar-label' }, opts.labelFn ? opts.labelFn(k) : k),
                el(
                  'div',
                  { class: 'bar-track' },
                  el('div', {
                    class: 'bar-fill',
                    style: `width:${(v / max) * 100}%;${opts.colorFn ? `background:${opts.colorFn(k)}` : ''}`,
                  })
                ),
                el('div', { class: 'bar-val' }, `${v}`, total ? el('span', { class: 'muted' }, ` ${Math.round((v / total) * 100)}%`) : null)
              )
            )
          )
        : el('div', { class: 'muted' }, 'Sin datos')
    );
  }

  const sorted = (m, order) =>
    order
      ? order.filter((k) => m.has(k)).map((k) => [k, m.get(k)]).concat([...m].filter(([k]) => !order.includes(k)))
      : [...m].sort((a, b) => b[1] - a[1]);

  function kpi(label, value, sub, tone) {
    return el(
      'div',
      { class: `kpi ${tone ? `kpi-${tone}` : ''}` },
      el('div', { class: 'kpi-val' }, String(value)),
      el('div', { class: 'kpi-label' }, label),
      sub ? el('div', { class: 'kpi-sub' }, sub) : null
    );
  }

  async function render(container) {
    const all = (await DB.all()).filter((r) => r.status === 'enviado');
    const fCuad = container.querySelector('#f-cuadrilla')?.value || '';
    const fDesde = container.querySelector('#f-desde')?.value || '';
    const fHasta = container.querySelector('#f-hasta')?.value || '';
    const recs = all.filter((r) => {
      const d = r.data;
      if (fCuad && d.usuario !== fCuad) return false;
      const day = (d.fecha || '').slice(0, 10);
      if (fDesde && day < fDesde) return false;
      if (fHasta && day > fHasta) return false;
      return true;
    });

    container.innerHTML = '';
    const filters = el(
      'div',
      { class: 'filters' },
      el(
        'label',
        {},
        'Cuadrilla',
        el(
          'select',
          { id: 'f-cuadrilla', class: 'input', onchange: () => render(container) },
          el('option', { value: '' }, 'Todas'),
          LISTS.cuadrillas.map((c) => el('option', { value: c, selected: c === fCuad }, c))
        )
      ),
      el('label', {}, 'Desde', el('input', { id: 'f-desde', type: 'date', class: 'input', value: fDesde, onchange: () => render(container) })),
      el('label', {}, 'Hasta', el('input', { id: 'f-hasta', type: 'date', class: 'input', value: fHasta, onchange: () => render(container) }))
    );
    container.append(el('h2', { class: 'view-title' }, 'Tablero de seguimiento'), filters);

    if (!recs.length) {
      container.append(
        el(
          'div',
          { class: 'card empty' },
          el('p', {}, 'Aún no hay levantamientos enviados para estos filtros.'),
          el('p', { class: 'muted' }, 'Complete formularios o cargue datos de demostración desde el menú ☰.')
        )
      );
      return;
    }

    const lev = recs.filter((r) => r.data.levantable === 'Si');
    const noLev = recs.filter((r) => r.data.levantable === 'No');
    const cabs = lev.flatMap((r) => (r.data.cableras || []).map((c) => ({ ...c, _poste: r })));
    const conActivo = lev.filter((r) => r.data.tiene_activo === 'Si' && r.data.activo).length;
    const conPlaca = lev.filter((r) => r.data.placa).length;
    const conPlacaFoto = lev.filter((r) => r.data.placa && r.data.foto_placa).length;
    const fotosCompletas = lev.filter((r) => r.data.foto_placa && r.data.foto_cablera && r.data.foto_poste).length;

    container.append(
      el(
        'div',
        { class: 'kpis' },
        kpi('Registros totales', recs.length),
        kpi('Postes levantados', lev.length, `${Math.round((lev.length / recs.length) * 100)}% del total`, 'ok'),
        kpi('Pendientes (no levantados)', noLev.length, null, noLev.length ? 'warn' : null),
        kpi('Cableras inventariadas', cabs.length, lev.length ? `${(cabs.length / lev.length).toFixed(1)} por poste` : null),
        kpi('Nueva placa instalada', conPlaca, `${conPlacaFoto} con fotografía`),
        kpi('Con activo anterior', conActivo),
        kpi('Requieren cambio inmediato', lev.filter((r) => r.data.estado_poste === '3').length, null, 'bad'),
        kpi('Fotografías completas', `${lev.length ? Math.round((fotosCompletas / lev.length) * 100) : 0}%`, `${fotosCompletas} de ${lev.length} postes`)
      )
    );

    // Mapa de cobertura
    const mapCard = el('div', { class: 'card' }, el('h3', {}, 'Cobertura geográfica del levantamiento'));
    const mapDiv = el('div', { class: 'dash-map' });
    const legend = el(
      'div',
      { class: 'legend' },
      LISTS.estado.map((e) => el('span', {}, el('i', { style: `background:${e.color}` }), e.label)),
      el('span', {}, el('i', { style: 'background:#7a7a7a' }), 'Pendiente (no levantado)')
    );
    mapCard.append(mapDiv, legend);
    container.append(mapCard);
    drawMap(mapDiv, recs);

    const estadoColor = (k) => (LISTS.estado.find((e) => e.value === k) || {}).color;
    const estadoLabel = (k) => (LISTS.estado.find((e) => e.value === k) || {}).label || k;

    // Espacios ocupados por empresa
    const espaciosEmp = new Map();
    cabs.forEach((c) => c.empresa && espaciosEmp.set(c.empresa, (espaciosEmp.get(c.empresa) || 0) + (+c.espacios || 0)));
    const postesEmp = new Map();
    lev.forEach((r) => {
      new Set((r.data.cableras || []).map((c) => c.empresa)).forEach((e) => e && postesEmp.set(e, (postesEmp.get(e) || 0) + 1));
    });

    const grid = el('div', { class: 'grid' });
    grid.append(
      barList('Postes pendientes por motivo', sorted(countBy(noLev, (r) => r.data.motivo), LISTS.motivo)),
      barList('Postes por estado', sorted(countBy(lev, (r) => r.data.estado_poste), ['1', '2', '3']), {
        colorFn: estadoColor,
        labelFn: estadoLabel,
      }),
      barList('Postes por uso', sorted(countBy(lev, (r) => r.data.uso_poste), LISTS.uso)),
      barList('Postes por material', sorted(countBy(lev, (r) => r.data.material), LISTS.material)),
      barList('Postes por altura', [...countBy(lev, (r) => r.data.altura)].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))),
      barList('Postes por empresa', sorted(postesEmp), { total: lev.length }),
      barList('Espacios ocupados por empresa', sorted(espaciosEmp)),
      barList('Cableras por tipo de cable', sorted(countBy(cabs, (c) => c.tipo_cable), LISTS.tipoCable)),
      barList('Cableras por vestidura', sorted(countBy(cabs, (c) => c.vestidura || 'Sin indicar'), [...LISTS.vestidura, 'Sin indicar'])),
      barList('Cableras por estado de uso', sorted(countBy(cabs, (c) => c.estado_red), LISTS.estadoRed), {
        colorFn: (k) => (k === 'Desuso' ? '#e53935' : '#2e8b3a'),
      })
    );
    container.append(grid);

    // Alertas técnicas
    const sinEtiq = cabs.filter((c) => c.etiquetado === 'No');
    const noCumple = cabs.filter((c) => c.altura_vano === 'No cumple');
    const reubic = cabs.filter((c) => c.reubicacion === 'Si');
    const desuso = cabs.filter((c) => c.estado_red === 'Desuso');
    const anclaje = lev.filter((r) => r.data.anclaje === 'Si');
    container.append(
      el(
        'div',
        { class: 'kpis' },
        kpi('Cableras sin etiquetar', sinEtiq.length, null, sinEtiq.length ? 'warn' : null),
        kpi('Vanos que no cumplen altura', noCumple.length, null, noCumple.length ? 'bad' : null),
        kpi('Redes que requieren reubicación', reubic.length, null, reubic.length ? 'warn' : null),
        kpi('Redes en desuso', desuso.length, null, desuso.length ? 'warn' : null),
        kpi('Postes que requieren anclaje', anclaje.length)
      )
    );

    // Detalle de cableras con observaciones técnicas
    const flagged = cabs.filter((c) => c.etiquetado === 'No' || c.altura_vano === 'No cumple' || c.reubicacion === 'Si' || c.estado_red === 'Desuso');
    const table = el(
      'div',
      { class: 'card' },
      el('h3', {}, `Cableras que requieren revisión (${flagged.length})`),
      flagged.length
        ? el(
            'div',
            { class: 'table-wrap' },
            el(
              'table',
              { class: 'table' },
              el('thead', {}, el('tr', {}, ['Placa', 'Empresa', 'Pos.', 'Tipo', 'Estado', 'Etiquetado', 'Altura vano', 'Reubicación', 'Cuadrilla'].map((h) => el('th', {}, h)))),
              el(
                'tbody',
                {},
                flagged.map((c) =>
                  el(
                    'tr',
                    {},
                    el('td', {}, c._poste.data.placa || '—'),
                    el('td', {}, c.empresa || '—'),
                    el('td', {}, c.posicion || '—'),
                    el('td', {}, c.tipo_cable || '—'),
                    el('td', { class: c.estado_red === 'Desuso' ? 'flag' : '' }, c.estado_red || '—'),
                    el('td', { class: c.etiquetado === 'No' ? 'flag' : '' }, c.etiquetado || '—'),
                    el('td', { class: c.altura_vano === 'No cumple' ? 'flag' : '' }, c.altura_vano || '—'),
                    el('td', { class: c.reubicacion === 'Si' ? 'flag' : '' }, c.reubicacion || '—'),
                    el('td', {}, c._poste.data.usuario || '—')
                  )
                )
              )
            )
          )
        : el('div', { class: 'muted' }, 'Sin hallazgos')
    );
    container.append(table);

    // Avance por cuadrilla
    container.append(
      barList('Levantamientos por cuadrilla', sorted(countBy(recs, (r) => r.data.usuario), LISTS.cuadrillas))
    );
  }

  function drawMap(div, recs) {
    if (!window.L) {
      div.classList.add('map-offline');
      div.textContent = 'Mapa no disponible sin conexión.';
      return;
    }
    if (map) {
      map.remove();
      map = null;
    }
    map = L.map(div);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      maxNativeZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);
    layer = L.featureGroup().addTo(map);
    recs.forEach((r) => {
      const d = r.data;
      if (!d.ubicacion) return;
      const color =
        d.levantable === 'No' ? '#7a7a7a' : (LISTS.estado.find((e) => e.value === d.estado_poste) || {}).color || '#2e8b3a';
      const popup =
        d.levantable === 'No'
          ? `<b>Poste no levantado</b><br>${escapeHtml(d.motivo || '')}<br><small>${escapeHtml(d.usuario)} · ${fmtDateTime(d.fecha)}</small>`
          : `<b>Placa ${escapeHtml(d.placa || '—')}</b><br>${escapeHtml(d.uso_poste || '')} · ${escapeHtml(d.material || '')} ${escapeHtml(d.altura || '')}<br>Cableras: ${escapeHtml(
              (d.cableras || []).map((c) => c.empresa).join(', ') || '—'
            )}<br><small>${escapeHtml(d.usuario)} · ${fmtDateTime(d.fecha)}</small>`;
      L.circleMarker([d.ubicacion.lat, d.ubicacion.lon], {
        radius: 7,
        color: '#fff',
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.95,
      })
        .bindPopup(popup)
        .addTo(layer);
    });
    setTimeout(() => {
      map.invalidateSize();
      if (layer.getLayers().length) map.fitBounds(layer.getBounds().pad(0.15), { maxZoom: 17 });
      else map.setView(DEFAULT_CENTER, 10);
    }, 50);
  }

  /* ---------- Exportaciones ---------- */
  function download(name, content, type) {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const a = el('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  }

  const csvCell = (v) => {
    const s = v == null ? '' : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const toCsv = (rows) => '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

  async function exportCsv() {
    const recs = (await DB.all()).filter((r) => r.status === 'enviado');
    if (!recs.length) return toast('No hay registros enviados para exportar', 'error');
    const postes = [
      ['id_registro', 'fecha_hora', 'usuario', 'se_puede_levantar', 'motivo', 'observaciones', 'estado_poste', 'uso_poste', 'material', 'altura', 'tiene_activo', 'activo', 'localizacion', 'placa', 'latitud', 'longitud', 'precision_m', 'fuente_ubicacion', 'requiere_anclaje', 'tipo_vano', 'elementos_poste', 'cantidad_cableras', 'foto_placa', 'foto_cablera', 'foto_poste', 'foto_no_levantado'],
    ];
    const cableras = [
      ['id_registro', 'placa', 'posicion', 'empresa', 'espacios_ocupados', 'tipo_cable', 'vestidura', 'estado', 'altura_vano', 'cable_etiquetado', 'existencia_cierre', 'requiere_reubicacion'],
    ];
    const yn = (v) => (v ? 'Si' : 'No');
    recs.forEach((r) => {
      const d = r.data;
      postes.push([
        r.id, d.fecha, d.usuario, d.levantable, d.motivo, d.observaciones, d.estado_poste, d.uso_poste, d.material, d.altura, d.tiene_activo, d.activo, d.localizacion, d.placa,
        d.ubicacion?.lat, d.ubicacion?.lon, d.ubicacion?.acc, d.ubicacion?.src, d.anclaje, d.tipo_vano, d.elementos, (d.cableras || []).length,
        yn(d.foto_placa), yn(d.foto_cablera), yn(d.foto_poste), yn(d.foto_no_levantado),
      ]);
      (d.cableras || []).forEach((c) =>
        cableras.push([r.id, d.placa, c.posicion, c.empresa, c.espacios, c.tipo_cable, c.vestidura, c.estado_red, c.altura_vano, c.etiquetado, c.cierre, c.reubicacion])
      );
    });
    download(`postes_${stamp()}.csv`, toCsv(postes), 'text/csv;charset=utf-8');
    setTimeout(() => download(`cableras_${stamp()}.csv`, toCsv(cableras), 'text/csv;charset=utf-8'), 400);
    toast('Se exportaron postes y cableras (CSV)', 'ok');
  }

  async function exportGeoJson() {
    const recs = (await DB.all()).filter((r) => r.status === 'enviado' && r.data.ubicacion);
    if (!recs.length) return toast('No hay registros con ubicación', 'error');
    const fc = {
      type: 'FeatureCollection',
      features: recs.map((r) => {
        const { ubicacion, cableras, foto_placa, foto_cablera, foto_poste, foto_no_levantado, ...props } = r.data;
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [ubicacion.lon, ubicacion.lat] },
          properties: {
            id_registro: r.id,
            ...props,
            precision_m: ubicacion.acc,
            empresas: (cableras || []).map((c) => c.empresa).join(', '),
            cantidad_cableras: (cableras || []).length,
            cableras_detalle: JSON.stringify(cableras || []),
          },
        };
      }),
    };
    download(`levantamiento_postes_${stamp()}.geojson`, JSON.stringify(fc, null, 1), 'application/geo+json');
  }

  async function exportBackup() {
    const recs = await DB.all();
    download(`respaldo_infocom_${stamp()}.json`, JSON.stringify({ app: 'infocom-cableras', version: 1, registros: recs }), 'application/json');
  }

  async function importBackup() {
    const input = el('input', { type: 'file', accept: '.json,application/json' });
    input.addEventListener('change', async () => {
      const f = input.files[0];
      if (!f) return;
      try {
        const json = JSON.parse(await f.text());
        const recs = Array.isArray(json) ? json : json.registros;
        if (!Array.isArray(recs)) throw new Error('formato');
        await DB.putMany(recs.filter((r) => r && r.id && r.data));
        toast(`Se importaron ${recs.length} registros`, 'ok');
        App.refresh();
      } catch {
        toast('Archivo de respaldo no válido', 'error');
      }
    });
    input.click();
  }

  return { render, exportCsv, exportGeoJson, exportBackup, importBackup };
})();
