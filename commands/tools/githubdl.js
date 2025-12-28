const handler = async (m, {
    conn,
    args,
    usedPrefix,
    command
}) => {
    try {
        if (!args[0]) {
            return m.reply(`❌ Username GitHub belum diisi\n\nContoh:\n${usedPrefix + command} username repo branch`);
        }
        if (!args[1]) {
            return m.reply(`❌ Nama repository belum diisi\n\nContoh:\n${usedPrefix + command} username repo branch`);
        }
        if (!args[2]) {
            return m.reply(`❌ Nama branch belum diisi\n\nContoh:\n${usedPrefix + command} username repo branch`);
        }

        const username = args[0];
        const repo = args[1];
        const branch = args[2];

        const url = `https://github.com/${username}/${repo}/archive/refs/heads/${branch}.zip`;

        // react loading
        if (global.loading) await global.loading(m, conn);

        await m.reply("📦 *Mengompres repository ke file ZIP...*");

        await conn.sendMessage(
            m.chat, {
                document: {
                    url
                },
                fileName: `${repo}-${branch}.zip`,
                mimetype: "application/zip"
            }, {
                quoted: m
            }
        );

    } catch (err) {
        console.error(err);
        m.reply("❌ Gagal mengambil repository GitHub.");
    } finally {
        // clear react
        if (global.loading) await global.loading(m, conn, true);
    }
};

handler.command = /^(githubdl|gitdl|ghdl)$/i;
handler.help = ["githubdl <username> <repo> <branch>"];
handler.tags = ["tools"];
handler.description = "Download repository GitHub sebagai file ZIP";
handler.limit = true;
handler.register = true;

export default handler;
