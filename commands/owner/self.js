const handler = async (m, { text, db }) => {
    if (!text) return m.reply("Contoh: .self on / .self off");

    const value = text.toLowerCase();
    if (!["on", "off"].includes(value)) return m.reply("Gunakan on atau off!");

    const isSelf = value === 'on';
    db.list().settings.self = isSelf;
    await db.save();

    m.reply(`✅ Mode self telah *${isSelf ? "AKTIF" : "NONAKTIF"}*!`);
};

handler.command = ["self"];
handler.tags = "owner";
handler.description = "Mengaktifkan/menonaktifkan mode self (hanya owner).";
handler.owner = true;

export default handler;
