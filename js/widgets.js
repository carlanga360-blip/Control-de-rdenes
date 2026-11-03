/* Utilidades de interfaz: íconos, fotos, GPS, lector QR, mapa, avisos */

const ICONS = {
  close:
    '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>',
  menu:
    '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>',
  satellite:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M13 5l6 6-3 3-6-6z"/><path d="M8.5 9.5l-3 3 6 6 3-3"/><path d="M4 16c0 2.2 1.8 4 4 4"/><path d="M4 12c0 4.4 3.6 8 8 8" opacity=".6"/></svg>',
  camera:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 8h4l2-2.5h6L17 8h4v11H3z"/><circle cx="12" cy="13.5" r="3.6"/></svg>',
  folder:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 6h6l2 2h10v11H3z"/><path d="M3 10h18"/></svg>',
  crosshair:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>',
  map:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="4" y="4" width="16" height="16"/><path d="M8 20c0-5 3-6 6-8s4-4 4-8"/><circle cx="15" cy="15" r="1.4" fill="currentColor"/></svg>',
  barcode:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3"/><path d="M8 8v8M10.5 8v8M13 8v8M16 8v8" stroke-width="1.4"/></svg>',
  trash:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14M10 10v7M14 10v7"/></svg>',
  plus:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 5v14M5 12h14"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  calendar:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3.5" y="5" width="17" height="15"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>',
  clear:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/></svg>',
  chevDown:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 9l6 6 6-6"/></svg>',
  chevLeft:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15 6l-6 6 6 6"/></svg>',
  chevRight:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 6l6 6-6 6"/></svg>',
  tower:
    '<svg viewBox="0 0 80 110" width="70" height="96" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"><path d="M40 30L22 106M40 30l18 76M40 30v76"/><path d="M33 52h14M29 70h22M25 88h30M33 52l18 18M47 52L29 70M29 70l26 18M51 70L25 88M25 88l15 18M55 88l-15 18"/><circle cx="40" cy="24" r="3.5" fill="#fff"/><path d="M30 16a14 14 0 0 1 20 0M25 10a21 21 0 0 1 30 0M20 4a28 28 0 0 1 40 0"/></svg>',
};

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    e.append(c instanceof Node ? c : document.createTextNode(c));
  }
  return e;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('es-CR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

/* ---------- Avisos ---------- */
function toast(msg, type = 'info', ms = 2600) {
  const t = el('div', { class: `toast toast-${type}` }, msg);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, ms);
}

/* ---------- Fotografías: compresión ---------- */
function compressImage(file, maxSide = 1280, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function pickImage(capture) {
  return new Promise((resolve) => {
    const input = el('input', { type: 'file', accept: 'image/*' });
    if (capture) input.setAttribute('capture', 'environment');
    input.addEventListener('change', async () => {
      const f = input.files && input.files[0];
      if (!f) return resolve(null);
      try {
        resolve(await compressImage(f));
      } catch {
        toast('No se pudo leer la imagen', 'error');
        resolve(null);
      }
    });
    input.click();
  });
}

function showImage(src) {
  const ov = el(
    'div',
    { class: 'modal', onclick: () => ov.remove() },
    el('img', { src, class: 'lightbox-img', alt: 'Fotografía' })
  );
  document.body.append(ov);
}

/* ---------- GPS ---------- */
const GPS = (() => {
  let last = null;
  let watchId = null;
  const listeners = new Set();
  function start() {
    if (!('geolocation' in navigator) || watchId != null) return;
    watchId = navigator.geolocation.watchPosition(
      (p) => {
        last = {
          lat: +p.coords.latitude.toFixed(7),
          lon: +p.coords.longitude.toFixed(7),
          acc: Math.round(p.coords.accuracy),
          alt: p.coords.altitude != null ? Math.round(p.coords.altitude) : null,
          t: Date.now(),
        };
        listeners.forEach((fn) => fn(last));
      },
      () => listeners.forEach((fn) => fn(null)),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  }
  function current() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) return reject(new Error('GPS no disponible'));
      if (last && Date.now() - last.t < 10000) return resolve({ ...last, src: 'gps' });
      navigator.geolocation.getCurrentPosition(
        (p) =>
          resolve({
            lat: +p.coords.latitude.toFixed(7),
            lon: +p.coords.longitude.toFixed(7),
            acc: Math.round(p.coords.accuracy),
            src: 'gps',
          }),
        (e) => reject(e),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });
  }
  return { start, current, last: () => last, onChange: (fn) => listeners.add(fn) };
})();

/* ---------- Selector de ubicación en mapa ---------- */
const MapPicker = {
  open(initial, onAccept) {
    const start = initial || GPS.last() || { lat: DEFAULT_CENTER[0], lon: DEFAULT_CENTER[1] };
    let pos = { lat: start.lat, lon: start.lon };
    const coords = el('div', { class: 'map-coords' });
    const setCoords = () =>
      (coords.textContent = `Lat ${pos.lat.toFixed(6)}  ·  Lon ${pos.lon.toFixed(6)}`);
    const mapDiv = el('div', { class: 'map-pick' });
    const close = () => ov.remove();
    const ov = el(
      'div',
      { class: 'modal' },
      el(
        'div',
        { class: 'sheet', onclick: (e) => e.stopPropagation() },
        el('div', { class: 'sheet-head' }, 'Ubicación del punto', el('span', { class: 'muted' }, ' — toque o arrastre el marcador')),
        mapDiv,
        coords,
        el(
          'div',
          { class: 'sheet-actions' },
          el('button', { class: 'btn', onclick: close }, 'Cancelar'),
          el(
            'button',
            {
              class: 'btn',
              onclick: async () => {
                try {
                  const p = await GPS.current();
                  pos = { lat: p.lat, lon: p.lon };
                  if (window.L) {
                    marker.setLatLng([pos.lat, pos.lon]);
                    map.setView([pos.lat, pos.lon], 18);
                  }
                  setCoords();
                } catch {
                  toast('No fue posible obtener la posición GPS', 'error');
                }
              },
            },
            'Mi posición'
          ),
          el(
            'button',
            {
              class: 'btn btn-primary',
              onclick: () => {
                close();
                onAccept({ lat: +pos.lat.toFixed(7), lon: +pos.lon.toFixed(7), acc: null, src: 'mapa' });
              },
            },
            'Aceptar'
          )
        )
      )
    );
    document.body.append(ov);
    setCoords();
    let map, marker;
    if (window.L) {
      map = L.map(mapDiv).setView([pos.lat, pos.lon], initial || GPS.last() ? 18 : 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 20,
        maxNativeZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(map);
      marker = L.marker([pos.lat, pos.lon], { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const ll = marker.getLatLng();
        pos = { lat: ll.lat, lon: ll.lng };
        setCoords();
      });
      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        pos = { lat: e.latlng.lat, lon: e.latlng.lng };
        setCoords();
      });
      setTimeout(() => map.invalidateSize(), 50);
    } else {
      // Sin conexión al servicio de mapas: ingreso manual
      const lat = el('input', { type: 'number', step: 'any', value: pos.lat });
      const lon = el('input', { type: 'number', step: 'any', value: pos.lon });
      const upd = () => {
        pos = { lat: +lat.value, lon: +lon.value };
        setCoords();
      };
      lat.addEventListener('input', upd);
      lon.addEventListener('input', upd);
      mapDiv.classList.add('map-offline');
      mapDiv.append(
        el('p', {}, 'Mapa no disponible sin conexión. Ingrese las coordenadas manualmente:'),
        el('label', {}, 'Latitud ', lat),
        el('label', {}, 'Longitud ', lon)
      );
    }
  },
};

/* ---------- Lector de código QR / barras ---------- */
const Scanner = {
  async open(onResult) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast('La cámara no está disponible. Digite el número manualmente.', 'error');
      return;
    }
    const video = el('video', { class: 'scan-video', playsinline: true, muted: true });
    const status = el('div', { class: 'muted center' }, 'Apunte la cámara al código QR de la placa');
    let stream = null;
    let running = true;
    const close = () => {
      running = false;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      ov.remove();
    };
    const ov = el(
      'div',
      { class: 'modal' },
      el(
        'div',
        { class: 'sheet' },
        el('div', { class: 'sheet-head' }, 'Leer placa'),
        el('div', { class: 'scan-box' }, video, el('div', { class: 'scan-frame' })),
        status,
        el('div', { class: 'sheet-actions' }, el('button', { class: 'btn', onclick: close }, 'Cancelar'))
      )
    );
    document.body.append(ov);
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
    } catch {
      status.textContent = 'No se otorgó permiso para usar la cámara.';
      return;
    }
    video.srcObject = stream;
    await video.play().catch(() => {});

    let detector = null;
    if ('BarcodeDetector' in window) {
      try {
        detector = new BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix'],
        });
      } catch {
        detector = null;
      }
    }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tick = async () => {
      if (!running) return;
      if (video.readyState >= 2) {
        let value = null;
        try {
          if (detector) {
            const codes = await detector.detect(video);
            if (codes.length) value = codes[0].rawValue;
          } else if (window.jsQR) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height);
            if (code) value = code.data;
          } else {
            status.textContent = 'Lector no disponible en este navegador. Digite el número manualmente.';
          }
        } catch {
          /* continuar */
        }
        if (value) {
          if (navigator.vibrate) navigator.vibrate(80);
          close();
          onResult(value.trim());
          return;
        }
      }
      setTimeout(() => requestAnimationFrame(tick), 180);
    };
    tick();
  },
};
