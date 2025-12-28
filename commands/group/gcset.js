const handler = async (m, { conn, command }) => {
  const isClose = command === 'close' || command === 'tutup';
  const groupStatus = isClose ? "announcement" : "not_announcement";
  const actionText = isClose ? "ditutup" : "dibuka";

  try {
    await conn.groupSettingUpdate(m.from, groupStatus);
    m.reply(`✔ Grup berhasil di-${actionText} untuk semua anggota.`);
  } catch (e) {
    console.error(e);
    m.reply("Gagal mengubah pengaturan grup. Pastikan bot adalah admin.");
  }
};

handler.command = ["open", "buka", "close", "tutup"];
handler.tags = "group";
handler.description = "Membuka atau menutup grup untuk semua anggota.";
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
