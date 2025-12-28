import {
  jidDecode
} from "baileys";
import "./settings.js";
import util from "util";
import Func from "./core/function.js";
import caseHandler from "./case.js";

const decodeJid = (jid) => {
  if (!jid) return jid;
  try {
    const decode = jidDecode(jid);
    return decode?.user && decode?.server ? decode.user + "@" + decode.server : jid;
  } catch {
    return jid;
  }
};


const normalize = jid => (decodeJid(jid) || "").split("@")[0];

// Escape
function escapeRegExp(string) {
  return string.replace(/[.*=+:\-?^${}()|[\]\\]|\s/g, "\\$&");
}

export default async (m, conn, store, db, cmd) => {

  await db.main(m);
  m.chat = m.chat || m.key?.remoteJid || m.from;

  m.reply = async function(teks) {
    const ppUrl = await conn.profilePictureUrl(m.sender, 'image').catch(_ => global.thumbreply);
    return conn.sendMessage(m.chat, {
      text: teks,
      contextInfo: {
        mentionedJid: [m.sender],
        externalAdReply: {
          title: `© ${global.botname}`,
          body: `${global.footer}`,
          thumbnailUrl: ppUrl,
          sourceUrl: `${global.website}`,
          renderLargerThumbnail: false,
        }
      }
    }, { quoted: m });
  };

  const user = db.get("user", m.jid) || {};
  const group = db.get("group", m.from) || {};
  const settings = db.list().settings || {};

const fixJid = (jid) => {
  if (!jid) return jid;

  if (jid.includes("@")) return jid;

  jid = jid.replace(/[^0-9]/g, "");
  return jid + "@s.whatsapp.net";
};

const sender = fixJid(decodeJid(m.sender || m.jid));

const ownerLocal = (global.owner || [])
  .map(j => fixJid(decodeJid(j)));

const ownerDB = (db.list().owner || [])
  .map(j => fixJid(decodeJid(j)));

const botJid = fixJid(decodeJid(conn.user.id));

const isOwner = [...ownerLocal, ...ownerDB, botJid].includes(sender);

  // Premium
  const isPremium = user.premium?.status || isOwner;
const groupMetadata = m.isGroup && m.metadata ? m.metadata : {};

const normalizeJid = (jid) => {
  if (!jid) return null;
  try {
    return decodeJid(jid).split("@")[0];
  } catch {
    return String(jid).split("@")[0];
  }
};

const senderNorm = normalizeJid(sender);
const botNorm = normalizeJid(botJid);

const isAdmin =
  m.isGroup && Array.isArray(groupMetadata.participants)
    ? groupMetadata.participants.some(p => {
        const pid = normalizeJid(p.jid || p.id || p.lid);
        return (
          pid === senderNorm &&
          (p.admin === "admin" || p.admin === "superadmin")
        );
      })
    : false;


let isBotAdmin = false;

if (m.isGroup && Array.isArray(groupMetadata.participants)) {
  
  if (typeof m.isBotAdmin === "boolean") {
    isBotAdmin = m.isBotAdmin;
  }

  if (!isBotAdmin) {
    const owners = [
      groupMetadata.owner,
      groupMetadata.subjectOwner,
      groupMetadata.ownerPn
    ]
      .filter(Boolean)
      .map(normalizeJid);

    if (owners.includes(botNorm)) {
      isBotAdmin = true;
    }
  }

  if (!isBotAdmin) {
    isBotAdmin = groupMetadata.participants.some(p => {
      const pid = normalizeJid(p.jid || p.id || p.lid);
      return (
        pid === botNorm &&
        (p.admin === "admin" || p.admin === "superadmin")
      );
    });
  }
}


  const prefix = /^[°•π÷×¶∆£¢€¥®™+✓=|/~!?@#%^&.©^]/.test(m.text) ?
    m.text.match(/^[°•π÷×¶∆£¢€¥®™+✓=|/~!?@#%^&.©^]/gi)[0] :
    "";

  const command = m.text && prefix ?
    m.text.replace(prefix, "").trim().split(/ +/).shift().toLowerCase() :
    "";

  const text = m.text && prefix ?
    m.text.replace(new RegExp("^" + escapeRegExp(prefix + command), "i"), "").trim() :
    "";

  const args = text.split(/ +/).filter(a => a);

  // SELF MODE
  if (settings.self && !isOwner) return;
  
if (m.isGroup && db.getBanchat(m.from) && !isOwner) return;
  // AUTO READ
  if (settings.online) {
    conn.readMessages([m.key]);
  }

  // Interactive reply system
  if (m.quoted && m.sender) {
    const sessionKey = `${m.from}:${m.sender}`;
    const session = global.interactiveSessions.get(sessionKey);

    if (session && session.messageId === m.quoted.id) {
      try {
        await session.callback(m);
        global.interactiveSessions.delete(sessionKey);
      } catch (e) {
        m.reply("Terjadi kesalahan saat memproses balasan Anda.");
        console.error("Interactive Session Error:", e);
      }
      return;
    }
  }

  // Case handler (event listener)
  await caseHandler(m, {
    conn,
    isOwner,
    isPremium,
    isAdmin,
    isBotAdmin,
    prefix,
    args,
    command,
    text,
    user,
    db,
    Func,
    cmd
  });

  // Tanpa prefix = bukan command
  if (!command) return;

  // --- LOOP PLUGIN ---
  for (let handler of Object.values(cmd.plugins)) {
    if (typeof handler !== 'function' && typeof handler !== 'object') continue;

    // ONMESSAGE HOOK
    if (typeof handler.onMessage === 'function') {
      await handler.onMessage(m, {
        conn,
        text,
        args,
        isOwner,
        isPremium,
        isAdmin,
        isBotAdmin,
        user,
        group,
        settings,
        db,
        Func
      });
    }

    let isCmd = false;

    if (handler.command) {

      if (handler.command instanceof RegExp) {
        isCmd = handler.command.test(command);

      } else if (Array.isArray(handler.command)) {
        for (let c of handler.command) {
          if (c instanceof RegExp && c.test(command)) {
            isCmd = true;
            break;
          }
          if (typeof c === "string" && c.toLowerCase() === command.toLowerCase()) {
            isCmd = true;
            break;
          }
        }

        // string normal
      } else if (typeof handler.command === "string") {
        isCmd = handler.command.toLowerCase() === command.toLowerCase();
      }
    }

    if (!isCmd) continue;

    // --- VALIDATOR ---
    try {
      if (handler.owner && !isOwner) {
        m.reply("Perintah ini hanya untuk Owner Bot.");
        continue;
      }
      if (handler.premium && !isPremium) {
        m.reply("Perintah ini hanya untuk pengguna Premium.");
        continue;
      }
      if (handler.group && !m.isGroup) {
        m.reply("Perintah ini hanya untuk di grup.");
        continue;
      }
      if (handler.admin && !isAdmin) {
        m.reply("Perintah ini hanya untuk admin grup.");
        continue;
      }
      if (handler.botAdmin && !isBotAdmin) {
        m.reply("Bot harus admin untuk menjalankan perintah ini.");
        continue;
      }
      if (handler.register && !user.register) {
        m.reply("Anda harus daftar dulu.\nKetik: .daftar");
        continue;
      }

      // Limit
      if (handler.limit && !isOwner && !isPremium) {
  const limitAmount = typeof handler.limit === 'number' ? handler.limit : 1;
  const limit = Func.useLimit(user, limitAmount);

  if (!limit.success) {
    m.reply(`Limit Anda tidak cukup.\nSisa limit: ${limit.remaining}`);
    continue;
  }
}

      // --- EXEC ----
      await handler(m, {
        conn,
        text,
        args,
        isOwner,
        isPremium,
        isAdmin,
        isBotAdmin,
        user,
        group,
        settings,
        db,
        Func,
        store,
        cmd,
        usedPrefix: prefix,
        command
      });

      break;

    } catch (e) {
      console.error(`Error pada command '${command}':`, e);

      const errorMessage = `*[ ERROR REPORT ]*\n\n*Command:* ${command}\n*User:* ${m.name} (${m.sender})\n*Error:* \n\`\`\`${util.format(e)}\`\`\``;

      for (let ownerJid of [...ownerLocal, ...ownerDB]) {
        conn.sendMessage(ownerJid, {
          text: errorMessage
        });
      }

      m.reply("Kesalahan terjadi. Laporan dikirim ke owner.");
    }
  }
};