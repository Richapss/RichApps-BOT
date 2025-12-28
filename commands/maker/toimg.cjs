const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

let handler = async (m, {
    conn,
    usedPrefix,
    command
}) => {
    let notMakerMessage = `Reply maker dengan command *${usedPrefix + command}*`;
    let q = m.quoted || m;

    const isMaker =
        q?.mtype === 'stickerMessage' ||
        q?.type === 'stickerMessage' ||
        q?.message?.stickerMessage;

    if (!isMaker) return m.reply(notMakerMessage);

    await global.loading(m, conn);

    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const input = path.join(tmpDir, `${Date.now()}.webp`);
    const output = path.join(tmpDir, `${Date.now()}.jpg`);

    try {
        const media = await q.download();
        fs.writeFileSync(input, media);

        // Convert WEBP → JPG pakai sharp
        await sharp(input)
            .jpeg({
                quality: 90
            })
            .toFile(output);

        const img = fs.readFileSync(output);
        await conn.sendFile(m.chat, img, 'toimg.jpg', '', m);

    } catch (e) {
        console.error('ERROR TOIMG:', e);
        m.reply('Gagal convert sticker ke image');
    } finally {
        if (fs.existsSync(input)) fs.unlinkSync(input);
        if (fs.existsSync(output)) fs.unlinkSync(output);
        await global.loading(m, conn, true);
    }
};

handler.help = ['toimg'];
handler.tags = ['maker'];
handler.command = ['toimg', 'toimage'];

module.exports = handler;