const handler = async (m, { text, command, user, db }) => {
    const database = db || global.db;
    if (!database) {
        return m.reply('⚠️ Database tidak ditemukan.');
    }

    let userData = user || database.get('user', m.sender);
    if (!userData || !userData.register) {
        return m.reply('_Anda belum terdaftar._');
    }

    const inputSN = text?.trim()?.toUpperCase();
    if (!inputSN) {
        return m.reply(
            `_Masukkan Serial Number (SN)._ \nContoh:\n*.${command} ${userData.sn}*`
        );
    }

    if (inputSN !== userData.sn) {
        return m.reply('❌ *Serial Number tidak valid!*');
    }

    userData.name = '';
    userData.age = 0;
    userData.register = false;
    userData.regTime = 0;
    userData.sn = '';
    userData.limit = Math.max((userData.limit || 0) - 50, 0);

    await database.save();

    const msg = `
❌ *UNREGISTER BERHASIL*

Akun Anda telah dihapus dari data pendaftaran.

📌 Anda tidak lagi terdaftar sebagai user
Ketik *.daftar nama* untuk mendaftar kembali.
`.trim();

    await m.reply(msg);
};

handler.command = ['unreg', 'unregister'];
handler.tags = 'main';
handler.description = 'Unregister akun menggunakan Serial Number';
handler.limit = false;

export default handler;