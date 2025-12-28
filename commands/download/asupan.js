const handler = async (m, { conn }) => {
  try {
    if (!global.botcax) {
      return m.reply("❌ API Key belum diset di settings.js");
    }

    const asupan = [
      "rikagusriani",
      "santuy",
      "ukhty",
      "bocil",
      "gheayubi",
      "natajadeh",
      "euni",
      "douyin",
      "cecan",
      "hijaber",
      "asupan",
      "anony"
    ];

    const pick = asupan[Math.floor(Math.random() * asupan.length)];
    const url = `https://api.botcahx.eu.org/api/asupan/${pick}?apikey=${global.botcax}`;

    if (global.loading) await global.loading(m, conn);

    await conn.sendMessage(
      m.chat,
      {
        video: { url },
        mimetype: "video/mp4"
      },
      { quoted: m }
    );

  } catch (err) {
    console.error(err);
    m.reply("❌ Video asupan tidak ditemukan.");
  } finally {
    if (global.loading) await global.loading(m, conn, true);
  }
};

handler.command = /^asupan$/i;
handler.help = ["asupan"];
handler.tags = ["downloader"];
handler.description = "Random video asupan";
handler.limit = true;
handler.register = true;

export default handler;
