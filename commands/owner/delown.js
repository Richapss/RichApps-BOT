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
        if (m.mentionedJid && m.mentionedJid.length > 0) {
            who = m.mentionedJid[0];
        } else if (m.quoted) {
            who = m.quoted.sender;
        } else {
            const nomor = text.replace(/[^0-9]/g, '');
            if (!nomor) return m.reply('❌ Nomor tidak valid.');
            who = nomor + '@s.whatsapp.net';
        }
    } else {
        if (m.quoted) {
            who = m.quoted.sender;
        } else {
            const nomor = text.replace(/[^0-9]/g, '');
            if (!nomor) return m.reply('❌ Nomor tidak valid.');
            who = nomor + '@s.whatsapp.net';
        }
    }

    if (!who || who.trim() === '@s.whatsapp.net') {
        return m.reply('❌ Tag, reply, atau masukkan nomor target yang valid.');
    }

    const list = db.list();
    if (!list.owner) list.owner = [];
    let ownerList = list.owner;

    const index = ownerList.indexOf(who);
    if (index === -1) {
        return m.reply(`❌ @${who.split('@')[0]} bukan seorang Owner.`, {
            mentions: [who]
        });
    }

    ownerList.splice(index, 1);
    db.list().owner = ownerList;

    if (!db.data) db.data = {};
    if (!db.data.user) db.data.user = {};

    const user = db.get('user', who);
    if (user) {
        user.owner = false;
        db.data.user[who] = user;
    }

    await db.save();

    m.reply(`✅ Status Owner untuk @${who.split('@')[0]} telah dicabut.`, {
        mentions: [who]
    });
};

handler.command = ['delowner', 'delown'];
handler.tags = 'owner';
handler.description = 'Mencabut status Owner dari user.';
handler.owner = true;

export default handler;