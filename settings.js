import fs from 'fs';
import chalk from 'chalk';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname } from 'path';

global.owner = ['6282277253795'];
global.botname = "RICH BOT";
global.website = "https://richapps.web.id";
global.ownername = "Richad";
global.footer = `♡₊˚ Hii Saya Rich ˚₊♡`;
global.defaultLimit = 100;
global.idch = "120363404306016820@newsletter"
global.botnumber = "62882016901033"
global.nauval = "Theresa"
global.botcax = "RichadNiBoss"
global.tokengh = "isi token gituhub kamu"

global.googleAiApiKey = "AIzaSyCDzhosCdX1F3PgwJW3jzubU37DX5xD2lU"
global.thumb = "https://raw.githubusercontent.com/belluptaka/dat3/main/uploads/38a0cd-1764738729608.jpg";
global.linkch = "https://whatsapp.com/channel/0029VbBwjazFMqrUybpLSI11"
global.loading = (m, conn, back = false) => {
    if (!back) {
        return conn.sendReact(m.chat, "🕒", m.key)
    } else {
        return conn.sendReact(m.chat, "", m.key)
    }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

fs.watchFile(__filename, async () => {
  fs.unwatchFile(__filename);
  console.log(chalk.greenBright(`🔄 File "${__filename}" telah diperbarui!`));
  try {
    await import(`${pathToFileURL(__filename).href}?update=${Date.now()}`);
    console.log(chalk.blueBright('✅ settings.js berhasil di-reload dan diterapkan ke seluruh bot!'));
  } catch (err) {
    console.error(chalk.redBright('❌ Gagal me-reload settings.js:'), err);
  }
});