import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);
const handler = {};

// Fungsi utama: menangani pesan masuk
handler.onMessage = async (m, { conn, text, isOwner, db, Func, store, cmd }) => {
  if (!isOwner) return;

  // Evaluasi kode Javascript (prefix > atau =>)
  if (m.text.startsWith(">") || m.text.startsWith("=>")) {
    const code = m.text.slice(m.text.startsWith("=>") ? 2 : 1).trim();
    let evalCmd;

    try {
      evalCmd = /await/i.test(code)
        ? await eval(`(async () => { 
              try { 
                  return await ${code} 
              } catch(e) { 
                  return e 
              } 
          })()`)
        : eval(code);
    } catch (e) {
      evalCmd = e;
    }

    try {
      const result = util.format(evalCmd);
      await m.reply(result);
    } catch (e) {
      await m.reply(util.format(e));
    }
  }

};

handler.category = "owner";
export default handler;
