const handler = async (m, { text, usedPrefix, command, db }) => {
  if (!text && !m.quoted) {
    return m.reply(`Gunakan format:\n${usedPrefix + command} @user\n${usedPrefix + command} 628xxx`);
  }

  let who =
    m.mentionedJid?.[0] ||
    m.quoted?.sender ||
    (text.replace(/[^0-9]/g, "")
      ? text.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
      : null);

  if (!who || who === "@s.whatsapp.net") {
    return m.reply("Tag, reply, atau masukkan nomor user yang valid.");
  }

  const user = db.get("user", who);
  if (!user) {
    return m.reply("User tidak ditemukan di database.");
  }

  if (!user.premium || !user.premium.status) {
    return m.reply(
      `User @${who.split("@")[0]} bukan pengguna premium.`,
      { mentions: [who] }
    );
  }

  user.premium.status = false;
  user.premium.expired = 0;

  await db.save();

  m.reply(
    `✅ Status premium @${who.split("@")[0]} berhasil dihapus.`,
    { mentions: [who] }
  );
};

handler.command = ["delprem", "delpremium"];
handler.tags = "owner";
handler.description = "Menghapus status premium dari user.";
handler.owner = true;

export default handler;