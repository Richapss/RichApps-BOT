const handler = async (m, { text, group }) => {
  if (!text) {
    const status = group.welcome ? 'AKTIF' : 'NONAKTIF';
    return m.reply(`Status welcome saat ini: *${status}*.\nGunakan .welcome on/off`);
  }

  const action = text.toLowerCase();
  if (!['on', 'off'].includes(action)) {
    return m.reply("Gunakan 'on' untuk mengaktifkan atau 'off' untuk menonaktifkan.");
  }

  const isEnabled = action === 'on';
  group.welcome = isEnabled;
  await global.db.save();

  m.reply(`✔ Fitur welcome/goodbye telah *${isEnabled ? 'diaktifkan' : 'dinonaktifkan'}*.`);
};

handler.command = ["welcome"];
handler.tags = "group";
handler.description = "Mengaktifkan/menonaktifkan sapaan anggota baru/keluar.";
handler.group = true;
handler.owner = true;

export default handler;
