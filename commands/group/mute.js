const handler = async (m, { text, group }) => {
  // Jika tanpa argumen → tampilkan status
  if (!text) {
    const status = group.mute ? 'AKTIF' : 'NONAKTIF';
    return m.reply(`Status mute grup saat ini: *${status}*.\nGunakan .mute on/off`);
  }

  const action = text.toLowerCase();
  if (!['on', 'off'].includes(action)) {
    return m.reply("Gunakan 'on' untuk mengaktifkan atau 'off' untuk menonaktifkan.");
  }

  const isEnabled = action === 'on';

  // Set mute grup
  group.mute = isEnabled;
  await global.db.save();

  m.reply(`🔇 Mode mute grup telah *${isEnabled ? 'AKTIF' : 'NONAKTIF'}*!`);
};

handler.command = ["mute"];
handler.tags = "group";
handler.description = "Mengaktifkan/menonaktifkan mute grup.";
handler.group = true;
handler.admin = true; // khusus admin grup

export default handler;