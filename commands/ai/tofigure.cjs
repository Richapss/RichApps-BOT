const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

/**
 * Upload file ke Catbox (binary)
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function uploadCatbox(filePath) {
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", fs.createReadStream(filePath));

    const res = await axios.post("https://catbox.moe/user/api.php", form, {
        headers: form.getHeaders(),
    });

    if (!res.data.startsWith("https://"))
        throw new Error("Gagal upload ke Catbox");

    return res.data;
}

/**
 * Endpoint efek Figura
 */
const allEndpoints = {
    '1': {
        url: 'https://api-faa.my.id/faa/tofigura?url=',
        name: 'Figura Style V1',
        description: 'Efek figura versi 1 - Classic Style'
    },
    '2': {
        url: 'https://api-faa.my.id/faa/tofigurav2?url=',
        name: 'Figura Style V2',
        description: 'Efek figura versi 2 - Enhanced Style'
    },
    '3': {
        url: 'https://api-faa.my.id/faa/tofigurav3?url=',
        name: 'Figura Style V3',
        description: 'Efek figura versi 3 - Premium Style'
    }
};

/**
 * Handler hanya untuk gambar
 */
let handler = async (m, { conn, usedPrefix, command, text }) => {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || q.mediaType || '';

    // ❌ Tolak selain gambar
    if (!/image\/(jpeg|jpg|png)/i.test(mime)) {
        return m.reply(`⚠ Reply ke *foto saja* dengan command *${usedPrefix + command}*`);
    }

    await m.react('⏳');

    try {
        // Pilih versi efek (default 1)
        let version = text?.trim() || '1';
        if (!allEndpoints[version]) version = '1';
        const apiInfo = allEndpoints[version];

        // Download gambar
        const media = await q.download();
        if (!media) throw new Error('Gagal mendownload gambar');

        // Paksa jadi JPG
        const temp = `./temp_upload.jpg`;
        fs.writeFileSync(temp, media);

        // Upload ke Catbox
        const catboxUrl = await uploadCatbox(temp);

        // API output JPG
        const apiUrl = `${apiInfo.url}${encodeURIComponent(catboxUrl)}`;

        const result = await axios.get(apiUrl, {
            responseType: "arraybuffer",
        });

        // Kirim JPG ori langsung
        await conn.sendMessage(m.chat, {
            image: result.data,
            mimetype: "image/jpeg",
            caption: `Hasil ${apiInfo.name}`
        }, { quoted: m });

        fs.unlinkSync(temp);
        await m.react('✅');

    } catch (err) {
        console.error(err);
        await m.react('❌');
        m.reply(`Terjadi error: ${err.message}`);
    }
};

handler.command = /^(tofigure)$/i;
handler.help = ['tofigure (reply foto) [1-3]'];
handler.tags = ['ai'];
handler.description = 'Proses foto via API FAA Figura Style V1-V3 (JPG output only)';
handler.limit = true;

module.exports = handler;