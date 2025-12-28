import fs from 'fs';
import path from 'path';

const handler = async (m, { conn }) => {
    const pluginFolder = './commands';

    let esmCount = 0;  // file .js
    let cjsCount = 0;  // file .cjs

    const countPluginsRecursive = (dir) => {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            const p = path.join(dir, item.name);
            if (item.isDirectory()) {
                countPluginsRecursive(p);
            } else if (item.isFile()) {
                if (p.endsWith(".js")) esmCount++;
                else if (p.endsWith(".cjs")) cjsCount++;
            }
        }
    };

    if (fs.existsSync(pluginFolder)) {
        try {
            countPluginsRecursive(pluginFolder);
        } catch (e) {
            console.error(`Gagal membaca direktori plugins: ${e.message}`);
        }
    }

    // Hitung legacy commands dari case.js (CJS)
    let totalLegacyCommands = 0;
    try {
        const caseFilePath = path.resolve("./case.js");
        if (fs.existsSync(caseFilePath)) {
            const caseFileContent = fs.readFileSync(caseFilePath, "utf-8");
            const matches = caseFileContent.match(/case ['"](.*?)['"]\s*:/g);
            if (matches) totalLegacyCommands = matches.length;
        }
    } catch (e) {
        console.error("Gagal membaca case.js:", e.message);
    }

    const totalFeatures = esmCount + cjsCount + totalLegacyCommands;

    // Gunakan backtick untuk template literal
    let replyText = `📊 Total Fitur Bot Saat Ini: *${totalFeatures}*\n\nRincian:`;
    if (esmCount > 0) replyText += `\n- *${esmCount}* Fitur ESM`;
    if (cjsCount > 0) replyText += `\n- *${cjsCount}* Fitur COMMONJS`;
    if (totalLegacyCommands > 0) replyText += `\n- *${totalLegacyCommands}* Fitur CASE`;

    await m.reply(replyText.trim());
};

handler.command = ['totalfitur', 'features', 'fitur'];
handler.tags = ['info'];
handler.description = 'Menampilkan jumlah total fitur yang ada pada bot, dipisahkan ESM dan CJS.';

export default handler;