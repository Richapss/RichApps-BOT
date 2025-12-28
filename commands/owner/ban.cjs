const handler = async (m, {
    text,
    db,
    isOwner
}) => {
    if (!isOwner) return m.reply("⚠️ Hanya owner yang bisa mengubah mode banchat!");
    if (!text) return m.reply("Contoh: .banchat on / .banchat off");

    const value = text.toLowerCase();
    if (!["on", "off"].includes(value)) return m.reply("Gunakan on atau off!");

    const isBanchat = value === "on";
    await db.setBanchat(m.from, isBanchat);

    m.reply(`✅ Mode banchat telah *${isBanchat ? "AKTIF" : "NONAKTIF"}* untuk grup ini!`);
};

handler.command = ["banchat", "ban"];
handler.tags = "owner";
handler.description = "Mengaktifkan/menonaktifkan mode banchat per grup (hanya owner).";
handler.owner = true;

module.exports = handler;