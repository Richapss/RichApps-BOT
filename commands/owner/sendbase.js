import fs from "fs";
import {
    execSync
} from "child_process";

let handler = async (m, {
    conn,
    args
}) => {
    try {
        let chatId = m.chat;

        // Grup khusus
        if (chatId !== "120363405144552749@g.us") {
            return m.reply("❌ Perintah ini hanya bisa digunakan di grup khusus.");
        }

        // Target default = pengirim
        let target = m.sender;
        if (args[0]) {
            target = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        }

        // Folder temp
        const tempDir = "./tmp";
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, {
            recursive: true
        });

        // Bersihkan tmp
        for (let file of fs.readdirSync(tempDir)) {
            fs.unlinkSync(`${tempDir}/${file}`);
        }

        await m.reply("📦 *Menyiapkan backup source bot...*");

        const backupName = "base";
        const backupPath = `${tempDir}/${backupName}.zip`;

        // List file & folder yang diikutkan
        const ls = execSync("ls")
            .toString()
            .split("\n")
            .filter(
                (f) =>
                ![
                    "node_modules",
                    "sessions",
                    "tmp",
                    ".env",
                    "session.db",
                    "package-lock.json",
                    "yarn.lock",
                    "pnpm-lock.yaml",
                    "",
                ].includes(f)
            );

        // Zip via shell
        execSync(`zip -r ${backupPath} ${ls.join(" ")}`);

        // Kirim file
        await conn.sendMessage(
            chatId, {
                document: fs.readFileSync(backupPath),
                fileName: `${backupName}.zip`,
                mimetype: "application/zip",
            }, {
                quoted: m
            }
        );

        fs.unlinkSync(backupPath);
    } catch (e) {
        console.error(e);
        m.reply("❌ Gagal membuat atau mengirim backup script.");
    }
};

handler.help = ["sendbase"];
handler.tags = ["owner"];
handler.command = /^(sendbase)$/i;
handler.group = true;
handler.owner = true;

export default handler;