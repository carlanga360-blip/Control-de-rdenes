/* Almacenamiento local (IndexedDB) de los levantamientos */
const DB = (() => {
  const NAME = 'infocom-cableras';
  const STORE = 'levantamientos';
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const s = db.createObjectStore(STORE, { keyPath: 'id' });
          s.createIndex('status', 'status');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }

  async function tx(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      let result;
      Promise.resolve(fn(store)).then((r) => (result = r));
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }

  const reqP = (req) =>
    new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });

  return {
    put: (rec) => tx('readwrite', (s) => reqP(s.put(rec))),
    putMany: (recs) => tx('readwrite', (s) => Promise.all(recs.map((r) => reqP(s.put(r))))),
    get: (id) => tx('readonly', (s) => reqP(s.get(id))),
    remove: (id) => tx('readwrite', (s) => reqP(s.delete(id))),
    all: () => tx('readonly', (s) => reqP(s.getAll())),
    clear: () => tx('readwrite', (s) => reqP(s.clear())),
  };
})();
