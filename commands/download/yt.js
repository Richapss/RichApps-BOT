import axios from "axios";

const API_BASE = "https://ytdlpyton.nvlgroup.my.id";

const handler = async (m, {
    conn,
    text,
    usedPrefix,
    command
}) => {
    try {
        if (!global.nauval) {
            return m.reply("❌ API Key belum diset di global.nauval");
        }

        if (!text) {
            return m.reply(
                `Masukkan URL YouTube!\n\nContoh:\n${usedPrefix + command} https://youtu.be/xxxx`
            );
        }

        const isAudio = /mp3|a(udio)?$/i.test(command);
        const encodedUrl = encodeURIComponent(text);
        const API_KEY = global.nauval;

        await m.reply(`⏳ *Memproses ${isAudio ? "AUDIO (MP3)" : "VIDEO (MP4)"}...*`);

        const apiUrl = isAudio ?
            `${API_BASE}/download/audio?url=${encodedUrl}&mode=url&bitrate=128k` :
            `${API_BASE}/download/?url=${encodedUrl}&resolution=1040&mode=url`;

        const {
            data
        } = await axios.get(apiUrl, {
            headers: {
                accept: "application/json",
                "X-API-Key": API_KEY
            }
        });

        if (!data?.download_url) {
            return m.reply("❌ Gagal mendapatkan link download.");
        }

        const caption = `
┌─⊷ *YOUTUBE ${isAudio ? "MP3" : "MP4"}*
▢ *Title:* ${data.title}
▢ *Durasi:* ${data.duration || data.duration_sec || "-"} detik
└────────────
        `.trim();

        if (isAudio) {
            await conn.sendMessage(
                m.chat, {
                    audio: {
                        url: data.download_url
                    },
                    mimetype: "audio/mpeg",
                    fileName: `${data.title}.mp3`
                }, {
                    quoted: m
                }
            );

            await conn.sendMessage(
                m.chat, {
                    text: caption
                }, {
                    quoted: m
                }
            );
        } else {
            await conn.sendMessage(
                m.chat, {
                    video: {
                        url: data.download_url
                    },
                    caption,
                    mimetype: "video/mp4",
                    fileName: `${data.title}.mp4`
                }, {
                    quoted: m
                }
            );
        }

    } catch (err) {
        console.error(err);
        m.reply(`❌ Error: ${err.response?.data?.message || err.message}`);
    }
};

handler.command = /^(yt|youtube)(mp3|a|audio|mp4|v|video)$/i;
handler.help = ["ytmp3 <url>", "ytmp4 <url>"];
handler.tags = ["downloader"];
handler.description = "Download YouTube MP3 / MP4 via API";
handler.register = true
handler.limit = true
export default handler;