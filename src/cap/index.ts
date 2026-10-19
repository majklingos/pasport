// Náhrada schopností, které prototyp dostával od claude.ai (window.claude.use).
// Aplikace volá jen tyto objekty, takže úložiště lze vyměnit bez zásahu do zbytku kódu.

import { createMemoryDb } from "./memory-db";
import { createMemoryAssets } from "./assets";
import { createDownloads } from "./downloads";

export function createCap() {
  return {
    db: createMemoryDb(),
    assets: createMemoryAssets(),
    // AI čtení štítků a názvů místností je ve V0 vypnuté (doplní se ve V1 přes server).
    sample: null,
    downloads: createDownloads(),
  };
}
