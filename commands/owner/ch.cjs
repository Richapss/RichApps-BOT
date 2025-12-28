const handler = async (m, { conn, text }) => {
    if (!text) return m.reply("❌ Format salah. Contoh: .delch idchannel,idpesan");

    const args = text.split(',');
    if (args.length < 2) return m.reply("❌ Format salah. Contoh: .delch idchannel,idpesan");

    const idch = args[0].trim();
    const idpesan = args[1].trim();

    if (idch !== global.idch) return m.reply('❌ ID channel tidak terdaftar.');

    const formatOwner = (jid) => {
        if (!jid.includes('@')) return jid + '@s.whatsapp.net';
        return jid;
    }

    const owners = Array.isArray(global.owner)
        ? global.owner.map(formatOwner)
        : [formatOwner(global.owner)];

    if (!owners.includes(m.sender)) 
        return m.reply('❌ Kamu bukan owner channel ini.');

    try {
        await conn.sendMessage(idch, {
            delete: {
                remoteJid: idch,
                fromMe: true,
                id: idpesan
            }
        });
        m.reply('✅ Pesan berhasil dihapus!');
    } catch (e) {
        console.error(e);
        m.reply('❌ Gagal menghapus pesan.');
    }
};

handler.command = ["delch"];
handler.tags = "owner";
handler.description = "Hapus pesan channel berdasarkan ID channel dan ID pesan";
handler.owner = true;
module.exports = handler;