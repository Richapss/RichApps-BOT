import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fetch from "node-fetch";
import {
    fileURLToPath
} from "url";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let handler = async (m, {
    text,
    usedPrefix,
    command,
    conn
}) => {
    try {
        if (!text)
            return m.reply(`Example:\n*${usedPrefix + command}* jalan kenangan`);

        await conn.sendMessage(m.chat, {
            react: {
                text: "⏳",
                key: m.key
            }
        });

        // Ambil data dari API Z7
        const apiRes = await fetch(`https://z7.veloria.my.id/download/play?q=${encodeURIComponent(text)}`);
        const apiJson = await apiRes.json();

        if (!apiJson.status || !apiJson.result) {
            await conn.sendMessage(m.chat, {
                react: {
                    text: "❌",
                    key: m.key
                }
            });
            return m.reply("❌ Lagu tidak ditemukan.");
        }

        const result = apiJson.result;

        // Setup folder tmp
        const tmpDir = path.join(__dirname, "tmp");
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, {
            recursive: true
        });

        const tmpInput = path.join(tmpDir, "api_temp_input.mp3");
        const tmpOutput = path.join(tmpDir, "api_temp_output.ogg");

        // Download MP3
        const res = await fetch(result.download_url);
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(tmpInput, buffer);

        // Convert ke OGG Opus
        await new Promise((resolve, reject) => {
            ffmpeg(tmpInput)
                .toFormat("ogg")
                .audioCodec("libopus")
                .on("end", resolve)
                .on("error", reject)
                .save(tmpOutput);
        });

        const converted = fs.readFileSync(tmpOutput);

        // Kirim audio ke channel dari global.idch
        await conn.sendMessage(
            global.idch, {
                audio: converted,
                mimetype: "audio/ogg; codecs=opus",
                ptt: true,
                contextInfo: {
                    externalAdReply: {
                        title: result.title,
                        body: `Creator: ${result.channel} | Duration: ${result.duration}`,
                        thumbnailUrl: result.thumbnail,
                        sourceUrl: result.url,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                    },
                },
            }, {
                quoted: m
            }
        );

        await conn.sendMessage(m.chat, {
            react: {
                text: "✅",
                key: m.key
            }
        });

        // Bersihkan file sementara
        fs.unlinkSync(tmpInput);
        fs.unlinkSync(tmpOutput);
    } catch (e) {
        console.error(e);
        await conn.sendMessage(m.chat, {
            react: {
                text: "❌",
                key: m.key
            }
        });
        await m.reply("❌ Error.");
    }
};

handler.help = ["playch", "songch"];
handler.tags = ["music"];
handler.command = /^(playch|songch)$/i;

export default handler;