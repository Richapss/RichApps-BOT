let handler = async (m, { db }) => {
    const user = db.get("user", m.sender);

    if (!user || !user.register) {
        return m.reply("❌ Kamu belum terdaftar.\nSilakan daftar dengan mengetik: *.daftar*");
    }

    const teks = `
🔐 *CEK SERIAL NUMBER (SN)*

• Nama : ${user.name}
• Umur : ${user.age || "-"}
• Limit : ${user.limit}
• Premium : ${user.premium?.status ? "Ya" : "Tidak"}
• SN : *${user.sn}*

Registrasi pada: ${new Date(user.regTime).toLocaleString()}
    `.trim();

    m.reply(teks);
};

handler.command = ["ceksn"];
handler.register = true;   // WAJIB SUDAH TERDAFTAR
handler.tags = ["main"]
module.exports = handler;