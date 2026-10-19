// Stažení souboru (export CSV, QR štítky) běžným způsobem prohlížeče.

export function createDownloads() {
  return {
    async save({ filename, data }: { filename: string; data: Blob }) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Adresu uvolníme až po chvíli, aby prohlížeč stihl stahování spustit.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    },
  };
}
