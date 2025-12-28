const handler = async (m, { text, group }) => {
  if (!text) {
    const status = group.detect ? 'AKTIF' : 'NONAKTIF';
    return m.reply(`Status deteksi promote/demote saat ini: *${status}*.\nGunakan .detect on/off`);
  }

  const action = text.toLowerCase();
  if (!['on', 'off'].includes(action)) {
    return m.reply("Gunakan 'on' untuk mengaktifkan atau 'off' untuk menonaktifkan.");
  }

  const isEnabled = action === 'on';
  group.detect = isEnabled;
  await global.db.save();

  m.reply(`✔ Fitur deteksi admin telah *${isEnabled ? 'diaktifkan' : 'dinonaktifkan'}*.`);
};

handler.command = ["detect"];
handler.category = "group";
handler.description = "Mengaktifkan/menonaktifkan notifikasi promote/demote.";
handler.group = true;
handler.admin = true;

export default handler;
