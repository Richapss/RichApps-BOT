const {
    jidDecode
} = require("baileys");

const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        const decode = jidDecode(jid) || {};
        return decode.user && decode.server ?
            decode.user + "@" + decode.server :
            jid;
    }
    return jid;
};

const handler = async (m, {
    conn
}) => {
    try {
        const owners = (global.owner || [])
            .map(j => decodeJid(j))
            .concat(global.db?.list()?.owner?.map(j => decodeJid(j)) || [])
            .map(o => o.replace(/[^0-9]/g, ""));

        if (!owners.length) return m.reply("❌ Tidak ada data owner di settings.js");

        for (const number of owners) {
            const vcard = `
BEGIN:VCARD
VERSION:3.0
FN:${global.ownername || "Owner Bot"}
ORG:${global.botname || "Bot"}
TEL;type=CELL;waid=${number}:${number}
X-WA-BIZ-NAME:${global.ownername || "Owner Bot"}
X-WA-BIZ-DESCRIPTION:Owner of ${global.botname || "Bot"}
X-WA-BIZ-HOURS:Mo-Su 00:00-23:59
END:VCARD`.trim();

            const q = {
                key: {
                    fromMe: false,
                    participant: "0@s.whatsapp.net",
                    remoteJid: "status@broadcast",
                },
                message: {
                    contactMessage: {
                        displayName: global.ownername || "Owner Bot",
                        vcard,
                    },
                },
            };

            await conn.sendMessage(
                m.chat, {
                    contacts: {
                        displayName: global.ownername || "Owner Bot",
                        contacts: [{
                            vcard
                        }],
                    },
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: global.idch || "0@newsletter",
                            newsletterName: "Owner Contact",
                        },
                        externalAdReply: {
                            title: `© 2025–2026 ${global.botname || "Bot"}`,
                            body: "Contact the Owner via WhatsApp",
                            thumbnailUrl: global.thumb || "https://files.catbox.moe/8tw69l.jpeg",
                            mediaType: 1,
                            renderLargerThumbnail: true,
                        },
                    },
                }, {
                    quoted: q
                }
            );
        }

    } catch (e) {
        console.error(e);
        m.reply(`❌ Terjadi kesalahan: ${e.message}`);
    }
};

handler.help = ["owner"];
handler.tags = ["info"];
handler.command = /^(owner|creator)$/i;

module.exports = handler;