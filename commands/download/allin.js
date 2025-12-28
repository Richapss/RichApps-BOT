import axios from "axios";

const API_URL = "https://api.botcahx.eu.org/api/download/allin";

const handler = async (m, {
  conn,
  text,
  usedPrefix,
  command
}) => {
  try {
    if (!text) {
      return m.reply(
        `Masukkan URL media!\n\nContoh:\n${usedPrefix + command} https://fb.watch/xxxx`
      );
    }

    if (!global.botcax) {
      return m.reply("❌ API Key belum diset di settings.js");
    }

    if (global.loading) await global.loading(m, conn);

    const start = Date.now();

    const { data } = await axios.get(
      `${API_URL}?url=${encodeURIComponent(text)}&apikey=${global.botcax}`
    );

    const medias = data?.result?.medias || [];
    if (!medias.length) {
      return m.reply("❌ Media tidak ditemukan.");
    }

    const caption = `乂 *ALL IN ONE DOWNLOADER*\n\n` +
      `◦ *📥 Total Media:* ${medias.length}\n` +
      `◦ *⏱ Fetching:* ${Date.now() - start} ms`;

    for (const mds of medias) {
      await conn.sendMessage(
        m.chat,
        {
          video: { url: mds.url },
          caption,
          mimetype: "video/mp4"
        },
        { quoted: m }
      );
    }

  } catch (err) {
    console.error(err);
    m.reply("❌ Terjadi kesalahan saat mengambil media.");
  } finally {
    if (global.loading) await global.loading(m, conn, true);
  }
};

handler.command = /^(dl|alldl|aiodl|aio)$/i;
handler.help = ["alldl <url>"];
handler.tags = ["downloader"];
handler.description = "Download media dari berbagai platform (All-in-One)";
handler.limit = true;
handler.register = true;

export default handler;
