const handler = async (m, {
    conn,
    text,
    args,
    usedPrefix,
    command,
    db
}) => {

    if (!text && !m.quoted && !(m.mentionedJid && m.mentionedJid[0])) {
        return m.reply(
            `Gunakan format:\n${usedPrefix + command} @user atau reply pesan user\n\nContoh:\n${usedPrefix + command} 6281234567890`
        );
    }

    let who;
    if (m.isGroup) {
        who = m.mentionedJid?.[0]
            ? m.mentionedJid[0]
            : m.quoted
                ? m.quoted.sender
                : text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    } else {
        who = m.quoted
            ? m.quoted.sender
            : text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    }

    if (!who || who.trim() === '@s.whatsapp.net') {
        return m.reply('❌ Tag, reply, atau masukkan nomor target yang valid.');
    }

    if (!db || typeof db.list !== 'function' || typeof db.get !== 'function' || typeof db.save !== 'function') {
        return m.reply('⚠️ Database tidak ditemukan atau belum dimuat.');
    }

    const list = db.list();

    if (!Array.isArray(list.owner)) list.owner = [];

    if (list.owner.includes(who)) {
        return m.reply(`👑 @${who.split('@')[0]} sudah menjadi Owner.`, {
            mentions: [who]
        });
    }

    list.owner.push(who);

    if (!db.data) db.data = {};
    if (!db.data.user) db.data.user = {};

    let user = db.get('user', who);

    if (!user) {
        user = {
            name: who.split('@')[0],
            owner: true
        };
    } else {
        user.owner = true;
    }

    db.data.user[who] = user;

    await db.save();

    m.reply(`✅ @${who.split('@')[0]} telah berhasil diangkat menjadi *Owner bot*.`, {
        mentions: [who]
    });
};

handler.command = ['addowner', 'addown'];
handler.tags = 'owner';
handler.description = 'Menambahkan user sebagai Owner bot.';
handler.owner = true;

export default handler;