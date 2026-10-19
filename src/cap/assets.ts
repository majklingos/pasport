// Úložiště obrázků (fotky, výkresy) v paměti prohlížeče.
// Každý soubor dostane id a dočasnou adresu (blob: URL), kterou lze zobrazit v <img>.
// V kroku 3 se obrázky přesunou do IndexedDB.

import { newId } from "./uuid";

export function createMemoryAssets() {
  const urls = new Map<string, string>();

  return {
    async upload(blob: Blob) {
      const id = newId();
      const url = URL.createObjectURL(blob);
      urls.set(id, url);
      return { id, url };
    },

    async delete(id: string) {
      const url = urls.get(id);
      if (url) URL.revokeObjectURL(url);
      urls.delete(id);
    },
  };
}
