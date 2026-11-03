/* Motor del formulario: render, relevancia, validación y recolección de datos */

const Form = (() => {
  let state = null; // { data, repIndex, editingId }
  let registry = []; // { def, wrap, scope, refresh, errEl }
  let host = null;
  let onDirty = () => {};
  let uid = 0;

  const isEmpty = (v) =>
    v == null || v === '' || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);

  function choicesOf(def, data) {
    if (def.choices) return def.choices(data).map((c) => (typeof c === 'string' ? { value: c, label: c } : c));
    return (LISTS[def.list] || []).map((c) => (typeof c === 'string' ? { value: c, label: c } : c));
  }

  /* ---------- API pública ---------- */
  function init(container, opts = {}) {
    host = container;
    onDirty = opts.onDirty || onDirty;
  }

  function load(record, keepAuthFrom) {
    const data = record
      ? JSON.parse(JSON.stringify(record.data))
      : { fecha: new Date().toISOString(), cableras: [] };
    if (keepAuthFrom && (!record || data.usuario === keepAuthFrom.usuario)) {
      data.usuario = keepAuthFrom.usuario;
      data.contrasena = keepAuthFrom.contrasena;
    }
    if (!Array.isArray(data.cableras)) data.cableras = [];
    state = { data, repIndex: 0, editingId: record ? record.id : null, created: record ? record.created : null };
    render();
  }

  function current() {
    return state;
  }

  /* ---------- Render ---------- */
  function render() {
    registry = [];
    host.innerHTML = '';
    host.append(
      el(
        'div',
        { class: 'banner' },
        el('div', { class: 'banner-icon', html: ICONS.tower }),
        el(
          'div',
          {},
          el('div', { class: 'banner-title' }, 'INFOCOMUNICACIONES'),
          el('div', { class: 'banner-sub' }, 'Levantamiento Externo  ·  Cableras')
        )
      )
    );
    const body = el('div', { class: 'form-body' });
    SCHEMA.forEach((def) => body.append(renderDef(def, 'root')));
    host.append(body);
    update();
  }

  function renderDef(def, scope) {
    if (def.type === 'group') return renderGroup(def, scope);
    if (def.type === 'repeat') return renderRepeat(def);
    return renderQuestion(def, scope);
  }

  function renderGroup(def, scope) {
    const body = el('div', { class: 'group-body' });
    const head = el(
      'button',
      {
        type: 'button',
        class: 'group-head',
        onclick: () => wrap.classList.toggle('collapsed'),
      },
      el('span', { class: 'caret' }, '▾'),
      def.label
    );
    const wrap = el('section', { class: 'group' }, head, body);
    def.children.forEach((c) => body.append(renderDef(c, scope)));
    registry.push({ def, wrap, scope });
    return wrap;
  }

  function renderRepeat(def) {
    const body = el('div', { class: 'group-body' });
    const head = el(
      'button',
      { type: 'button', class: 'group-head', onclick: () => wrap.classList.toggle('collapsed') },
      el('span', { class: 'caret' }, '▾'),
      def.label
    );
    const wrap = el('section', { class: 'group repeat' }, head, body);
    const entry = { def, wrap, scope: 'root', refresh: () => drawRepeat() };
    registry.push(entry);

    function drawRepeat() {
      registry = registry.filter((r) => r.scope !== 'repeat');
      body.innerHTML = '';
      const items = state.data[def.name];
      if (!items.length) {
        body.append(
          el(
            'div',
            { class: 'repeat-empty' },
            el('button', { type: 'button', class: 'round-btn', title: 'Agregar cablera', html: ICONS.plus, onclick: add })
          )
        );
        return;
      }
      if (state.repIndex >= items.length) state.repIndex = items.length - 1;
      def.children.forEach((c) => body.append(renderQuestion(c, 'repeat')));
      const idx = state.repIndex;
      body.append(
        el(
          'div',
          { class: 'repeat-bar' },
          el('button', { type: 'button', class: 'round-btn', title: 'Eliminar este registro', html: ICONS.trash, onclick: removeCurrent }),
          el('button', { type: 'button', class: 'nav-btn', disabled: idx === 0, html: ICONS.chevLeft, onclick: () => go(idx - 1) }),
          el('span', { class: 'repeat-count' }, `${idx + 1} de ${items.length}`),
          el('button', { type: 'button', class: 'nav-btn', disabled: idx === items.length - 1, html: ICONS.chevRight, onclick: () => go(idx + 1) }),
          el('button', { type: 'button', class: 'round-btn', title: 'Agregar cablera', html: ICONS.plus, onclick: add })
        )
      );
      updateRelevance();
    }
    function go(i) {
      state.repIndex = i;
      drawRepeat();
    }
    function add() {
      state.data[def.name].push({});
      state.repIndex = state.data[def.name].length - 1;
      drawRepeat();
      onDirty();
      body.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function removeCurrent() {
      if (!confirm('¿Eliminar este registro de cablera?')) return;
      state.data[def.name].splice(state.repIndex, 1);
      state.repIndex = Math.max(0, state.repIndex - 1);
      drawRepeat();
      onDirty();
    }
    entry.go = go;
    drawRepeat();
    return wrap;
  }

  function scopeObj(scope) {
    if (scope === 'repeat') {
      const item = state.data.cableras[state.repIndex];
      return item;
    }
    return state.data;
  }

  function renderQuestion(def, scope) {
    const id = `q${++uid}`;
    const obj = scopeObj(scope);
    if (def.calculate && scope === 'repeat') obj[def.name] = def.calculate(obj, state.repIndex);
    const get = () => scopeObj(scope)[def.name];
    const set = (v) => {
      const o = scopeObj(scope);
      if (isEmpty(v)) delete o[def.name];
      else o[def.name] = v;
      entry.errEl.textContent = '';
      wrap.classList.remove('has-error');
      if (['likert', 'image', 'geopoint'].includes(def.type) || def.appearance === 'search') draw();
      update();
      onDirty();
    };

    const wrap = el('div', { class: `q q-${def.type}` });
    const entry = { def, wrap, scope, errEl: el('div', { class: 'q-error' }) };

    if (def.type === 'note') {
      wrap.classList.add('note');
      if (def.className) wrap.classList.add(def.className);
      wrap.innerHTML = def.label;
      registry.push(entry);
      return wrap;
    }

    wrap.append(
      el(
        'label',
        { class: 'q-label', for: id },
        def.label,
        def.required ? el('span', { class: 'req' }, ' *') : null
      )
    );
    if (def.hint) wrap.append(el('div', { class: 'q-hint' }, def.hint));

    const control = el('div', { class: 'q-control' });
    wrap.append(control, entry.errEl);

    const draw = () => {
      control.innerHTML = '';
      control.append(buildControl(def, id, get, set, entry));
    };
    let choicesKey = def.choices ? JSON.stringify(choicesOf(def, state.data)) : '';
    entry.refresh = () => {
      if (!def.choices) return;
      const ch = choicesOf(def, state.data);
      const key = JSON.stringify(ch);
      if (key === choicesKey) return;
      choicesKey = key;
      if (get() && !ch.some((c) => c.value === get())) delete scopeObj(scope)[def.name];
      draw();
    };
    draw();
    registry.push(entry);
    return wrap;
  }

  function buildControl(def, id, get, set, entry) {
    const v = get();
    switch (def.type) {
      case 'datetime': {
        const iso = state.data.fecha;
        return el(
          'div',
          { class: 'readonly-stack' },
          el('div', { class: 'ro-box' }, el('span', { html: ICONS.calendar }), fmtDate(iso)),
          el('div', { class: 'ro-box' }, el('span', { html: ICONS.clock }), fmtTime(iso))
        );
      }
      case 'select_one': {
        const choices = choicesOf(def, state.data);
        if (def.readonly) {
          return el(
            'div',
            { class: 'choices' },
            el('label', { class: 'choice' }, el('input', { type: 'radio', checked: true, disabled: true }), el('span', {}, v))
          );
        }
        if (def.appearance === 'dropdown') {
          const s = el(
            'select',
            { id, class: 'input', onchange: (e) => set(e.target.value) },
            el('option', { value: '' }, ''),
            choices.map((c) => el('option', { value: c.value, selected: c.value === v }, c.label))
          );
          return el('div', { class: 'select-wrap' }, s, el('span', { class: 'select-caret', html: ICONS.chevDown }));
        }
        if (def.appearance === 'search') return searchSelect(def, id, choices, v, set);
        const cols = def.appearance === 'columns-3' ? 'cols-3' : def.appearance === 'columns-2' ? 'cols-2' : '';
        const name = `${id}-r`;
        return el(
          'div',
          { class: `choices ${cols}`, role: 'radiogroup' },
          choices.map((c) =>
            el(
              'label',
              { class: 'choice' },
              el('input', {
                type: 'radio',
                name,
                value: c.value,
                checked: c.value === v,
                onclick: (e) => {
                  // Permite deseleccionar al tocar de nuevo (como Survey123)
                  if (get() === c.value) {
                    e.target.checked = false;
                    set(undefined);
                  } else set(c.value);
                },
              }),
              el('span', {}, c.label)
            )
          )
        );
      }
      case 'likert': {
        const choices = choicesOf(def, state.data);
        const stops = el('div', { class: 'likert-track' });
        choices.forEach((c) =>
          stops.append(
            el('button', {
              type: 'button',
              class: `likert-stop ${c.value === v ? 'on' : ''}`,
              style: c.value === v ? `background:${c.color};border-color:${c.color}` : '',
              title: c.label,
              onclick: () => set(c.value === get() ? undefined : c.value),
            })
          )
        );
        const labels = el(
          'div',
          { class: 'likert-labels' },
          choices.map((c) =>
            el(
              'button',
              { type: 'button', class: 'likert-label', onclick: () => set(c.value) },
              el('span', { class: 'dot', style: `background:${c.color}` }),
              el('span', {}, c.label)
            )
          )
        );
        return el('div', { class: 'likert' }, stops, labels);
      }
      case 'text': {
        if (def.appearance === 'multiline') {
          return el('textarea', { id, class: 'input', rows: 3, oninput: (e) => set(e.target.value) }, v || '');
        }
        return el('input', { id, class: 'input', type: 'text', value: v || '', oninput: (e) => set(e.target.value.trim()) });
      }
      case 'password': {
        const input = el('input', {
          id,
          class: 'input',
          type: 'text',
          inputmode: 'numeric',
          autocomplete: 'off',
          value: v || '',
          oninput: (e) => set(e.target.value.trim()),
          onblur: () => {
            if (get() && def.constraint && !def.constraint(get(), state.data)) {
              entry.errEl.textContent = def.constraintMessage;
              entry.wrap.classList.add('has-error');
            }
          },
        });
        return el(
          'div',
          { class: 'input-row' },
          input,
          el('button', {
            type: 'button',
            class: 'icon-in',
            title: 'Limpiar',
            html: ICONS.clear,
            onclick: () => {
              input.value = '';
              set(undefined);
              input.focus();
            },
          })
        );
      }
      case 'barcode': {
        const input = el('input', {
          id,
          class: 'input',
          type: 'text',
          value: v || '',
          placeholder: '',
          oninput: (e) => set(e.target.value.trim()),
        });
        return el(
          'div',
          { class: 'input-row' },
          el('button', {
            type: 'button',
            class: 'icon-in left',
            title: 'Leer código QR',
            html: ICONS.barcode,
            onclick: () =>
              Scanner.open((code) => {
                input.value = code;
                set(code);
                toast(`Placa leída: ${code}`, 'ok');
              }),
          }),
          input
        );
      }
      case 'image': {
        const box = el('div', { class: 'image-q' });
        const pill = el(
          'div',
          { class: 'pill' },
          el('button', { type: 'button', title: 'Tomar fotografía', html: ICONS.camera, onclick: async () => { const d = await pickImage(true); if (d) set(d); } }),
          el('button', { type: 'button', title: 'Seleccionar archivo', html: ICONS.folder, onclick: async () => { const d = await pickImage(false); if (d) set(d); } })
        );
        if (v) {
          box.append(
            el(
              'div',
              { class: 'thumb' },
              el('img', { src: v, alt: def.label, onclick: () => showImage(v) }),
              el('button', { type: 'button', class: 'thumb-del', title: 'Quitar fotografía', html: ICONS.trash, onclick: () => set(undefined) })
            )
          );
        }
        box.append(pill);
        return box;
      }
      case 'geopoint': {
        const box = el('div', { class: 'geo-q' });
        const pill = el(
          'div',
          { class: 'pill' },
          el('button', {
            type: 'button',
            title: 'Capturar posición GPS',
            html: ICONS.crosshair,
            onclick: async (e) => {
              const b = e.currentTarget;
              b.classList.add('busy');
              try {
                const p = await GPS.current();
                set(p);
                toast(`Posición capturada (±${p.acc} m)`, 'ok');
              } catch {
                toast('No fue posible obtener la posición. Use el mapa.', 'error');
              } finally {
                b.classList.remove('busy');
              }
            },
          }),
          el('button', { type: 'button', title: 'Ubicar en el mapa', html: ICONS.map, onclick: () => MapPicker.open(get(), (p) => set(p)) })
        );
        box.append(pill);
        if (v) {
          box.append(
            el(
              'div',
              { class: 'geo-val' },
              el('div', {}, `Lat: ${v.lat.toFixed(6)}   Lon: ${v.lon.toFixed(6)}`),
              el(
                'div',
                { class: 'muted' },
                v.src === 'mapa' ? 'Ubicado manualmente en el mapa' : `Precisión: ±${v.acc ?? '—'} m (GPS)`
              ),
              el('button', { type: 'button', class: 'link', onclick: () => set(undefined) }, 'Borrar ubicación')
            )
          );
        }
        return box;
      }
      default:
        return el('div', {}, `Tipo no soportado: ${def.type}`);
    }
  }

  function searchSelect(def, id, choices, v, set) {
    const list = el('div', { class: 'search-list hidden', role: 'listbox' });
    const input = el('input', {
      id,
      class: 'input search-input',
      type: 'text',
      value: v || '',
      autocomplete: 'off',
      onfocus: () => {
        input.select();
        open();
      },
      oninput: () => draw(input.value),
    });
    const wrapper = el(
      'div',
      { class: 'search-select' },
      el(
        'div',
        { class: 'input-row' },
        el('span', { class: 'icon-in left static', html: ICONS.search }),
        input,
        el('button', { type: 'button', class: 'icon-in', html: ICONS.chevDown, onclick: () => (list.classList.contains('hidden') ? (input.focus()) : close()) })
      ),
      list
    );
    function draw(filter = '') {
      list.innerHTML = '';
      const f = filter.toLowerCase();
      const shown = choices.filter((c) => !f || c.label.toLowerCase().includes(f) || c.value === v);
      if (!shown.length) list.append(el('div', { class: 'muted pad' }, 'Sin coincidencias'));
      shown.forEach((c) =>
        list.append(
          el(
            'label',
            { class: 'choice' },
            el('input', {
              type: 'radio',
              name: `${id}-s`,
              checked: c.value === v,
              onchange: () => {
                close();
                set(c.value);
              },
            }),
            el('span', {}, c.label)
          )
        )
      );
    }
    function open() {
      draw(input.value === v ? '' : input.value);
      list.classList.remove('hidden');
      setTimeout(() => document.addEventListener('pointerdown', outside), 0);
    }
    function close() {
      list.classList.add('hidden');
      document.removeEventListener('pointerdown', outside);
      input.value = v || '';
    }
    function outside(e) {
      if (!wrapper.contains(e.target)) close();
    }
    return wrapper;
  }

  /* ---------- Relevancia ---------- */
  function relevantDef(def, data) {
    return !def.relevant || def.relevant(data);
  }

  function update() {
    registry.forEach((r) => r.refresh && r.def.choices && r.refresh());
    updateRelevance();
  }

  function updateRelevance() {
    registry.forEach((r) => {
      const on = relevantDef(r.def, state.data);
      r.wrap.classList.toggle('hidden', !on);
    });
  }

  /* ---------- Validación ---------- */
  function checkValue(def, value, data) {
    if (def.required && isEmpty(value)) return 'Este campo es obligatorio';
    if (!isEmpty(value) && def.constraint && !def.constraint(value, data)) return def.constraintMessage || 'Valor no válido';
    return null;
  }

  function validate() {
    registry.forEach((r) => {
      if (r.errEl) r.errEl.textContent = '';
      r.wrap.classList.remove('has-error');
    });
    const data = state.data;
    const errors = [];
    const walk = (defs) => {
      for (const def of defs) {
        if (!relevantDef(def, data)) continue;
        if (def.type === 'group') walk(def.children);
        else if (def.type === 'repeat') {
          data[def.name].forEach((item, idx) => {
            def.children.forEach((c) => {
              const v = c.calculate ? c.calculate(item, idx) : item[c.name];
              const msg = checkValue(c, v, data);
              if (msg) errors.push({ def: c, msg, repeat: def, idx });
            });
          });
        } else if (def.type !== 'note' && def.type !== 'datetime') {
          const msg = checkValue(def, data[def.name], data);
          if (msg) errors.push({ def, msg });
        }
      }
    };
    walk(SCHEMA);
    if (!errors.length) return true;

    const first = errors[0];
    if (first.repeat) {
      const rep = registry.find((r) => r.def === first.repeat);
      rep.go(first.idx);
    }
    // Marcar errores visibles
    errors.forEach((e) => {
      if (e.repeat && e.idx !== state.repIndex) return;
      const r = registry.find((x) => x.def === e.def);
      if (r && r.errEl) {
        r.errEl.textContent = e.msg;
        r.wrap.classList.add('has-error');
      }
    });
    const target = registry.find((x) => x.def === first.def);
    if (target) {
      target.wrap.closest('.group')?.classList.remove('collapsed');
      target.wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const extra = first.repeat ? ` (Cablera ${first.idx + 1})` : '';
    toast(`${stripHtml(first.def.label)}${extra}: ${first.msg}`, 'error', 3500);
    return false;
  }

  const stripHtml = (s) => s.replace(/<[^>]+>/g, '');

  /* ---------- Datos limpios (solo preguntas relevantes) ---------- */
  function cleanData(data = state.data) {
    const out = {};
    const walk = (defs) => {
      for (const def of defs) {
        if (!relevantDef(def, data)) continue;
        if (def.type === 'group') walk(def.children);
        else if (def.type === 'repeat') {
          out[def.name] = data[def.name].map((item, idx) => {
            const o = {};
            def.children.forEach((c) => {
              const v = c.calculate ? c.calculate(item, idx) : item[c.name];
              if (!isEmpty(v)) o[c.name] = v;
            });
            return o;
          });
        } else if (def.type === 'datetime') out[def.name] = data[def.name];
        else if (def.type !== 'note' && !isEmpty(data[def.name])) out[def.name] = data[def.name];
      }
    };
    walk(SCHEMA);
    delete out.contrasena; // la contraseña no se almacena en el registro enviado
    return out;
  }

  /* Progreso: preguntas obligatorias relevantes respondidas */
  function progress() {
    if (!state) return { done: 0, total: 0 };
    const data = state.data;
    let done = 0,
      total = 0;
    const walk = (defs) => {
      for (const def of defs) {
        if (!relevantDef(def, data)) continue;
        if (def.type === 'group') walk(def.children);
        else if (def.type === 'repeat')
          data[def.name].forEach((item, idx) =>
            def.children.forEach((c) => {
              if (!c.required) return;
              total++;
              if (!isEmpty(c.calculate ? c.calculate(item, idx) : item[c.name])) done++;
            })
          );
        else if (def.required) {
          total++;
          if (!checkValue(def, data[def.name], data)) done++;
        }
      }
    };
    walk(SCHEMA);
    return { done, total };
  }

  return { init, load, current, validate, cleanData, progress, choicesOf };
})();
