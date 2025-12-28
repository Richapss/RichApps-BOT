import moment from "moment-timezone";

const handler = async (m, { text, usedPrefix, command, db }) => {
  if (!text) {
    return m.reply(
      `Gunakan format:\n${usedPrefix + command} @user <durasi>\n\nContoh:\n${usedPrefix + command} @user 30d\n\nDurasi:\nd = hari\nh = jam\nm = menit`
    );
  }

  let who;
  if (m.isGroup) {
    who =
      m.mentionedJid?.[0] ||
      m.quoted?.sender ||
      (text.replace(/[^0-9]/g, "")
        ? text.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
        : null);
  } else {
    who = text.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  }

  if (!who || who === "@s.whatsapp.net") {
    return m.reply("Tag, reply, atau masukkan nomor user yang valid.");
  }

  const durationMatch = text.match(/(\d+)([dhm])/i);
  if (!durationMatch) {
    return m.reply("Format durasi salah.\nContoh: 30d | 12h | 45m");
  }

  const value = parseInt(durationMatch[1]);
  const unit = durationMatch[2].toLowerCase();

  const durationMs =
    value *
    {
      d: 86400000,
      h: 3600000,
      m: 60000,
    }[unit];

  let user = db.get("user", who);
  if (!user) {
    return m.reply("User belum terdaftar di database.");
  }

  user.premium ??= {
    status: false,
    expired: 0,
  };

  const expired = Date.now() + durationMs;
  user.premium.status = true;
  user.premium.expired = expired;

  await db.save();

  m.reply(
    `✅ *PREMIUM AKTIF*\n\n` +
      `👤 User: @${who.split("@")[0]}\n` +
      `⏳ Durasi: ${value}${unit}\n` +
      `📆 Expired: ${moment(expired)
        .tz("Asia/Jakarta")
        .format("DD MMMM YYYY, HH:mm:ss")} WIB`,
    { mentions: [who] }
  );
};

handler.command = ["addprem", "addpremium"];
handler.tags = "owner";
handler.description = "Menambahkan user sebagai premium";
handler.owner = true;

export default handler;
