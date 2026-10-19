// Databáze v paměti se stejným rozhraním, jaké prototyp používal na claude.ai
// (collection(...).doc(...).set/update/delete a onSnapshot).
// Data se ztratí po zavření stránky – v kroku 2 ji nahradí IndexedDB.

export type DocData = Record<string, unknown>;

export interface DocSnapshot {
  id: string;
  data(): DocData;
}

export interface QuerySnapshot {
  docs: DocSnapshot[];
}

type Listener = (snap: QuerySnapshot) => void;

export function createMemoryDb() {
  const collections = new Map<string, Map<string, DocData>>();
  const listeners = new Map<string, Set<Listener>>();

  const docsOf = (name: string) => {
    let docs = collections.get(name);
    if (!docs) collections.set(name, (docs = new Map()));
    return docs;
  };

  // Snímek kolekce; kopie, aby aplikace nemohla data v databázi měnit „bokem“.
  const snapshot = (name: string): QuerySnapshot => ({
    docs: [...docsOf(name)].map(([id, d]) => ({ id, data: () => structuredClone(d) })),
  });

  // Upozorní posluchače asynchronně, stejně jako skutečná databáze.
  const notify = (name: string) => {
    queueMicrotask(() => {
      const snap = snapshot(name);
      listeners.get(name)?.forEach((fn) => fn(snap));
    });
  };

  return {
    /** Příznak pro aplikaci: data se zatím neukládají trvale. */
    temporary: true,

    collection(name: string) {
      const docs = docsOf(name);
      return {
        doc(id: string) {
          return {
            async set(data: DocData) {
              docs.set(id, structuredClone(data));
              notify(name);
            },
            async update(patch: DocData) {
              const old = docs.get(id);
              if (!old) throw new Error(`Záznam ${name}/${id} neexistuje.`);
              docs.set(id, { ...old, ...structuredClone(patch) });
              notify(name);
            },
            async delete() {
              docs.delete(id);
              notify(name);
            },
          };
        },

        /** Zavolá `onData` hned a pak po každé změně kolekce. Vrací funkci pro odhlášení. */
        onSnapshot(onData: Listener, _onError?: (e: Error) => void) {
          let set = listeners.get(name);
          if (!set) listeners.set(name, (set = new Set()));
          set.add(onData);
          queueMicrotask(() => onData(snapshot(name)));
          return () => set.delete(onData);
        },
      };
    },
  };
}
