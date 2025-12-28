import path from 'path';
import fs from 'fs';
import js_beautify from 'js-beautify';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function safeReply(m, text) {
    try {
        if (typeof text !== "string") {
            text = JSON.stringify(text, null, 2);
        }
        return m.reply(text);
    } catch (e) {
        return m.reply("Gagal mengirim reply (error format).");
    }
}

const handler = async (m, { conn, text, args, usedPrefix, command, cmd }) => {
    const listCmd = Object.keys(cmd.plugins).map(
        (p) => path.relative(cmd.directory, p).replace(/\\/g, '/')
    );

    const [option, ...pathParts] = args;
    const fullPathOrIndex = pathParts.join(' ').trim();

    if (!option || !['+', '-', '?'].includes(option[0]) || !fullPathOrIndex) {
        let replyText = `Gunakan format: \`${"." + command} [opsi] [nomor atau path/file]\`\n\n`;
        replyText += `*Opsi:*\n`;
        replyText += `  \`+\` : Tambah/simpan plugin\n`;
        replyText += `  \`-\` : Hapus plugin\n`;
        replyText += `  \`?\` : Ambil kode plugin\n\n`;
        replyText += `*Contoh:*\n`;
        replyText += `\`${"." + command} - 2\` (menghapus plugin nomor 2)\n`;
        replyText += `\`${"." + command} + owner/test.js\` (sambil membalas kode)\n\n`;
        replyText += `*– Daftar Plugin Tersedia:*\n`;
        replyText += listCmd.map((p, i) => `  \`${i + 1}.\` \`${p}\``).join("\n");
        return safeReply(m, replyText);
    }

    const action = option[0];
    let targetPath;
    let relativePath;

    const isIndex = !isNaN(fullPathOrIndex) && parseInt(fullPathOrIndex) > 0;
    if (isIndex && parseInt(fullPathOrIndex) <= listCmd.length) {
        const index = parseInt(fullPathOrIndex) - 1;
        relativePath = listCmd[index];
        targetPath = path.join(cmd.directory, relativePath);
    } else {
        relativePath = fullPathOrIndex;
        targetPath = path.join(cmd.directory, relativePath);
    }

    if (!relativePath) {
        return safeReply(m, "Nomor atau path plugin tidak valid.");
    }

    try {
        switch (action) {
            case '+': {
                if (!m.quoted) {
                    return safeReply(m, "Balas pesan berisi kode atau file .js untuk disimpan.");
                }

                let code = '';

                if (typeof m.quoted.text === 'string') {
                    code = m.quoted.text;
                } else if (m.quoted.isMedia) {
                    try {
                        const buffer = await m.quoted.download();
                        code = buffer.toString('utf-8');
                    } catch {
                        return safeReply(m, "Gagal mengunduh file, pastikan itu file teks.");
                    }
                } else {
                    return safeReply(m, "Pesan yang dibalas tidak berisi teks atau file.");
                }

                if (!code.trim()) {
                    return safeReply(m, "Kode tidak ditemukan dalam pesan yang dibalas.");
                }

                const dir = path.dirname(targetPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                const beautifiedCode = js_beautify(code);
                fs.writeFileSync(targetPath, beautifiedCode);

                return safeReply(m, `Plugin berhasil disimpan ke \`${relativePath}\`.\nHot-reload akan memuatnya otomatis.`);
            }

            case '-': {
                if (!fs.existsSync(targetPath)) {
                    return safeReply(m, `Plugin \`${relativePath}\` tidak ditemukan.`);
                }
                fs.unlinkSync(targetPath);
                return safeReply(m, `Plugin \`${relativePath}\` berhasil dihapus.`);
            }

            case '?': {
                if (!fs.existsSync(targetPath)) {
                    return safeReply(m, `Plugin \`${relativePath}\` tidak ditemukan.`);
                }
                const content = fs.readFileSync(targetPath, 'utf8');
                return safeReply(m, content);
            }
        }
    } catch (e) {
        console.error("Plugin Manager Error:", e);
        return safeReply(m, `Terjadi kesalahan: ${e.message}`);
    }
};

handler.command = ["plugins", "plugin"];
handler.tags = "owner";
handler.description = "Manajemen plugin bot (tambah, hapus, lihat).";
handler.owner = true;

export default handler;