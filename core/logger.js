import chalk from "chalk";
import moment from "moment-timezone";

/**
 * Menampilkan log pesan ke konsol dengan format cantik.
 * @param {object} m - Objek pesan yang sudah diserialisasi.
 */
export default async (m) => {
  const gradient = (await import("gradient-string")).default;
  const { vice } = gradient;

  const theme = {
    title: chalk.bold.cyanBright,
    label: chalk.hex("#FFD700").bold,
    value: chalk.whiteBright,
    command: chalk.greenBright,
    msg: chalk.hex("#00FFFF"),
    warn: chalk.redBright,
  };

  // ==== Data log ====
  const pengirim = m.sender || m.jid || "Tidak diketahui";
  const nama = m.name || "Tidak diketahui";
  const tujuan = m.isGroup
    ? "Grup"
    : m.isNewsletter
    ? "Newsletter"
    : "Private";
  const subjek = m.metadata?.subject || "-";
  const id = m.id || "N/A";
  const waktu = moment()
    .tz("Asia/Jakarta")
    .format("D/M/YYYY, HH.mm.ss [WIB]");
  const tipe = m.type || "Unknown";
  const ukuran = `${(m.text || "").length} Karakter`;
  const sumber = m.isBot ? "🤖 Bot" : "👤 User";
  const botStatus = m.isBot ? chalk.greenBright("✓") : chalk.redBright("✗");
  const command = m.command ? m.command : "Tidak ada command";
  const pesan = m.text || "Tidak ada isi pesan";

  // ==== Cetak ke konsol ====
  console.log(vice("──────────────────────────────────────────────"));
  console.log(theme.title("📜 LOG PESAN"));
  console.log(vice("──────────────────────────────────────────────"));

  console.log(`${theme.label("📨 Pengirim:")} ${theme.value(pengirim)}`);
  console.log(`${theme.label("📛 Nama:")} ${theme.value(nama)}`);
  console.log(`${theme.label("🎯 Tujuan:")} ${theme.value(tujuan)}`);
  console.log(`${theme.label("📌 Subjek:")} ${theme.value(subjek)}`);
  console.log(`${theme.label("🆔 ID:")} ${theme.value(id)}`);
  console.log(`${theme.label("🕒 Waktu:")} ${theme.value(waktu)}`);
  console.log(`${theme.label("💬 Tipe:")} ${theme.value(tipe)}`);
  console.log(`${theme.label("📏 Ukuran:")} ${theme.value(ukuran)}`);
  console.log(`${theme.label("🧍 Sumber:")} ${theme.value(sumber)}`);
  console.log(`${theme.label("🤖 Bot:")} ${botStatus}`);
  console.log(`${theme.label("⚙️ Command:")} ${theme.command(command)}`);

  console.log(vice("──────────────────────────────────────────────"));
  console.log(theme.msg(chalk.bold("✉️ Pesan")));
  console.log(theme.msg(pesan));
  console.log(vice("──────────────────────────────────────────────\n"));
};