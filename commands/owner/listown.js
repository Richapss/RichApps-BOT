const handler = async (m, {
    conn,
    db
}) => {

    const list = db.list();
    const dbOwners = list.owner || [];
    const globalOwners = (global.owner || []).map((o) => `${o}@s.whatsapp.net`);

    // Gabungkan dan hilangkan duplikat
    const allOwners = [...new Set([...globalOwners, ...dbOwners])];

    if (allOwners.length === 0) {
        return m.reply("❌ Tidak ada Owner yang terdaftar di sistem.");
    }

    // Buat daftar teks
    let caption = `👑 *Daftar Owner Bot*\n\n`;
    caption += allOwners
        .map((jid, i) => `*${i + 1}.* @${jid.split("@")[0]}`)
        .join("\n");

    caption += `\n\nTotal: *${allOwners.length} Owner*`;

    await conn.sendMessage(m.chat, {
        text: caption,
        mentions: allOwners,
    });
};

handler.command = ["listowner", "listown"];
handler.tags = "owner";
handler.description = "Menampilkan daftar semua Owner bot.";
handler.owner = true;

export default handler;