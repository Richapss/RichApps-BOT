import { URL } from "url";

const detectAnyLink = (text = "") => {
  const urls = text.match(/https?:\/\/[^\s]+/gi);
  if (!urls) return false;

  for (const raw of urls) {
    try {
      new URL(raw);
      return true;
    } catch {
      continue;
    }
  }
  return false;
};

const handler = async (m, { text, group, db }) => {
  group ||= {};

  if (!text) {
    const status = group.antilink ? "AKTIF" : "NONAKTIF";
    return m.reply(
      `Status antilink saat ini: *${status}*\nGunakan: .antilink on / off`
    );
  }

  const action = text.toLowerCase().trim();
  if (!["on", "off"].includes(action)) {
    return m.reply("Gunakan: .antilink on / off");
  }

  group.antilink = action === "on";

  if (!group.antilink) {
    group.warnings = {};
  }

  await db.save();

  m.reply(
    `✔ Antilink telah *${group.antilink ? "diaktifkan" : "dinonaktifkan"}*`
  );
};

handler.command = ["antilink"];
handler.tags = "group";
handler.description = "Anti semua link dengan sistem peringatan";
handler.group = true;
handler.admin = true;

handler.onMessage = async (m, { conn, group, isAdmin, isBotAdmin, db }) => {
  if (!m.isGroup) return;
  if (!group?.antilink) return;
  if (m.fromMe) return;
  if (isAdmin) return;

  const text = String(
    m.text ||
    m.caption ||
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    ""
  ).trim();

  if (!text) return;
  if (!detectAnyLink(text)) return;

  group.warnings ||= {};

  const sender = m.sender;
  group.warnings[sender] = (group.warnings[sender] || 0) + 1;
  const warn = group.warnings[sender];

  await db.save();

  if (isBotAdmin) {
    await conn.sendMessage(m.from, { delete: m.key }).catch(() => {});
  }

  if (warn >= 3) {
    delete group.warnings[sender];
    await db.save();

    if (!isBotAdmin) {
      return m.reply("⚠️ Bot bukan admin, tidak bisa mengeluarkan pengguna.");
    }

    await conn
      .groupParticipantsUpdate(m.from, [sender], "remove")
      .catch(() => {});

    return m.reply(
      `🚫 @${sender.split("@")[0]} dikeluarkan karena mengirim link.`,
      { mentions: [sender] }
    );
  }

  return m.reply(
    `⚠️ *PERINGATAN ${warn}/3*\n@${sender.split("@")[0]} dilarang mengirim link apa pun.`,
    { mentions: [sender] }
  );
};

export default handler;