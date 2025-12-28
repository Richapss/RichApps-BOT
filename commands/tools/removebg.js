import fetch from "node-fetch";
import FormData from "form-data";
import {
    fileTypeFromBuffer
} from "file-type";

const fkontak = {
    key: {
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast",
        fromMe: false
    },
    message: {
        conversation: "Remove bg ✨"
    },
};

const API_URL = "https://z7.veloria.my.id/tools/removebg";

async function uploadToCatbox(buffer) {
    const {
        ext
    } = (await fileTypeFromBuffer(buffer)) || {
        ext: "jpg"
    };
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", buffer, `image.${ext}`);

    const res = await fetch("https://catbox.moe/user/api.php", {
        method: "POST",
        body: form,
    });

    if (!res.ok) throw new Error(`❌ Upload gagal ke Catbox: ${res.statusText}`);
    const text = await res.text();
    if (!text.startsWith("https://")) throw new Error("❌ URL Catbox tidak valid.");
    return text.trim();
}

const handler = async (m, {
    conn,
    usedPrefix,
    command
}) => {
    try {
        const q = m.quoted ? m.quoted : m;
        const mime = q.mimetype || q.msg?.mimetype || "";

        if (!/image/.test(mime)) {
            return conn.sendMessage(
                m.chat, {
                    text: `📸 Kirim atau balas *gambar* dengan caption *${usedPrefix + command}*`
                }, {
                    quoted: fkontak
                }
            );
        }

        await conn.sendMessage(m.chat, {
            text: "⏳ Sedang Remove bg..."
        }, {
            quoted: fkontak
        });

        const img = await q.download();
        if (!img) throw new Error("❌ Gagal mengunduh gambar.");

        const uploadedUrl = await uploadToCatbox(img);

        const res = await fetch(`${API_URL}?url=${encodeURIComponent(uploadedUrl)}`);
        if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length < 5000) throw new Error("❌ Gagal memproses hasil gambar.");

        await conn.sendMessage(
            m.chat, {
                image: buffer,
                caption: `🖤 *Hasil Removebg*\n🌐 API: z7.veloria.my.id\n📦 Upload: Catbox\n⏰ ${new Date().toLocaleString("id-ID")}`,
            }, {
                quoted: fkontak
            }
        );
    } catch (err) {
        console.error("Remove bg Error:", err);
        await conn.sendMessage(m.chat, {
            text: `❌ Terjadi kesalahan:\n${err.message}`
        }, {
            quoted: fkontak
        });
    }
};

handler.help = ["removebg"];
handler.tags = ["tools"];
handler.command = ["removebg", "rmbg"];
handler.limit = true
handler.register = true
export default handler;