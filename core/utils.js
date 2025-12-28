import fetch from "node-fetch";

/**

 * Mengambil data dari URL dan mengubahnya menjadi Buffer.

 * @param {string} url - URL file yang akan diambil.

 * @returns {Promise<Buffer>}

 */

export async function getBuffer(url) {

  const res = await fetch(url);

  if (!res.ok) throw new Error(`Gagal ambil data dari ${url} (${res.status})`);

  return Buffer.from(await res.arrayBuffer());

}

/**

 * Menghitung ukuran buffer dalam format yang mudah dibaca (B, KB, MB, GB).

 * @param {Buffer} buffer - Buffer dari file.

 * @returns {Promise<string>} Ukuran file.

 */

export async function getSizeMedia(buffer) {

  const bytes = buffer.length;

  if (bytes < 1024) return `${bytes} B`;

  const kb = bytes / 1024;

  if (kb < 1024) return `${kb.toFixed(2)} KB`;

  const mb = kb / 1024;

  if (mb < 1024) return `${mb.toFixed(2)} MB`;

  const gb = mb / 1024;

  return `${gb.toFixed(2)} GB`;

}