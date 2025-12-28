import fs from "fs";
import { fileURLToPath } from 'url';
import CaseManager from "./core/case.js";
import util from "util";
import "./settings.js";
import fetch from "node-fetch";
import { generateWAMessageFromContent,proto } from 'baileys'
const Case = new CaseManager("./case.js");

const file = fileURLToPath(import.meta.url);
fs.watchFile(file, () => {
 fs.unwatchFile(file);
 console.log(`Pembaruan terdeteksi di ${file}`);

});

export default async (m, { conn, isOwner, prefix, command, text, user, db, Func, cmd, args, isPremium, isAdmin,isBotAdmin, }) => {
 if (!prefix) return;

 try {
 switch (command) {
//ai
case "muslimai": {
    if (!args[0]) {
        return m.reply(
            `❌ Masukkan pertanyaan.\n\nContoh:\n${usedPrefix + command} hi`
        );
    }

    await m.react("⏳");

    try {
        const query = args.join(" ");
        const apikey = global.z7;

        if (!apikey) {
            await m.react("❌");
            return m.reply("API Key belum diatur di global.z7");
        }

        const url = `https://z7.tokodex.biz.id/theresa/muslimai?apikey=${apikey}&query=${encodeURIComponent(query)}`;

        const res = await fetch(url);
        const json = await res.json();

        if (!json.status) {
            await m.react("❌");
            return m.reply("Gagal mendapatkan jawaban dari Muslim AI.");
        }

        const replyText = `
🕌 *Muslim AI*

📌 *Pertanyaan:*
${json.query}

📖 *Jawaban:*
${json.result}
        `.trim();

        await m.react("✅");
        return m.reply(replyText);

    } catch (err) {
        console.error(err);
        await m.react("❌");
        return m.reply(`Terjadi kesalahan:\n${err.message}`);
    }
}
break;
//owner
case "resetdb": {
    if (!isOwner) return m.reply("⚠️ Hanya owner yang bisa reset database!");

    await m.react('⏳');

    try {
        await db.reset(); 

        await m.react('✅');
        return m.reply("Database berhasil di-reset!");
    } catch (err) {
        console.error(err);
        return m.reply(`Terjadi kesalahan saat reset DB: ${err.message}`);
    }
}
break;
 case "cases": {
 if (!isOwner) return m.reply("Perintah ini khusus Owner.");
 if (!text) {
 return m.reply(`*Manajemen Case*\n\nGunakan format: \`${prefix + command} [opsi] [nama_case/kode]\`\n\n*Opsi:*\n \`--add\` : Tambah case baru (reply kode)\n \`--get\` : Ambil kode case\n \`--delete\` : Hapus case\n\n*– Daftar Case Tersedia:*\n${Case.list().map((a, i) => ` ◦ ${a}`).join("\n")}`);
 }
 
 if (text.includes("--add")) {
 let input = m.quoted ? m.quoted.text : text.replace("--add", "").trim();
 if (!input) return m.reply("Reply kode untuk ditambahkan ke case.");
 if (Case.add(input)) {
 m.reply("Berhasil menambahkan case. Mohon restart bot untuk menerapkan perubahan.");
 } else {
 m.reply("Gagal menambahkan case.");
 }
 } else if (text.includes("--get")) {
 let input = text.replace("--get", "").trim();
 if (!input) return m.reply("Masukkan nama case yang ingin diambil.");
 let content = await Case.get(input.toLowerCase());
 if (content) {
 m.reply(util.format(content));
 } else {
 m.reply(`Case '${input}' tidak ditemukan.`);
 }
 } else if (text.includes("--delete")) {
 let input = text.replace("--delete", "").trim();
 if (!input) return m.reply("Masukkan nama case yang ingin dihapus.");
 if (Case.delete(input.toLowerCase())) {
 m.reply("Berhasil menghapus case. Mohon restart bot untuk menerapkan perubahan.");
 } else {
 m.reply(`Case '${input}' tidak ditemukan.`);
 }
 }
 }
 break;
 //tools
case 'cloudku':
case 'shortcloud': {
  if (!text) return m.reply(`Masukkan URL!\nContoh: ${prefix + command} https://example.com [custom]`);

  const [link, customCode] = text.trim().split(' ');

  const timestamp = Math.floor(Date.now() / 1000);
  const custom = customCode || Math.floor(100000 + Math.random() * 900000).toString();

  const payload = { url: link, custom, timestamp };

  const headers = {
    'Content-Type': 'application/json',
    'Origin': 'https://cloudku.click',
    'Referer': 'https://cloudku.click/',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
  };

  try {
    const res = await fetch('https://cloudku.click/api/link.php', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!json.success || !json.data?.shortUrl) return m.reply("❌ Gagal membuat short URL.");

    const { shortUrl, originalUrl, created, key } = json.data;

    const caption = `
🔗 *Short URL Created!*
━━━━━━━━━━━━━━━
🌐 *Original:* ${originalUrl}
📎 *Shortened:* ${shortUrl}
🗝️ *Custom:* ${key}
🕒 *Created:* ${created}
`.trim();

    const interactive = await generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: { text: caption },
              footer: { text: "📎 cloudku.click link shortener" },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                      display_text: "📋 Salin Link",
                      copy_code: shortUrl
                    })
                  }
                ]
              }
            })
          }
        }
      },
      { quoted: m }
    );

    await conn.relayMessage(m.chat, interactive.message, { messageId: interactive.key.id });

  } catch (err) {
    console.error('[SHORT ERROR]', err);
    m.reply("❌ Gagal memendekkan link.");
  }
}
break;
 
 }
 } catch (e) {
 console.error("Case Handler Error:", e);
 m.reply(`Terjadi error di case handler: ${e.message}`);
 }
};
