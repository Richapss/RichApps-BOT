import fs from "fs";
import {
  makeWASocket,
  useMultiFileAuthState,
  Browsers,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  generateWAMessageFromContent,
  DisconnectReason
} from "baileys";
import readline from "node:readline";
import pino from "pino";
import chalk from "chalk"
import moment from "moment-timezone";
import os from "os";
import crypto from "crypto";
import "./settings.js";
import PluginsLoad from "./core/loadPlugins.js";
import Database from "./core/database.js";
import serialize from "./core/serialize.js";
import logger from "./core/logger.js";
import handler from "./handler.js";
import { fileTypeFromBuffer } from 'file-type';
import { getBuffer, getSizeMedia } from "./core/utils.js";
const Plugins = new PluginsLoad("./commands");
const db = new Database("./database.json");
await db.init();
global.db = db;
global.interactiveSessions = new Map(); // Untuk fitur pesan interaktif
global.displayedBanner = false;

const question = (text) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(text, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

const formatUptime = (seconds) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor(seconds % (3600 * 24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
};

const toSHA256 = (data) => {
  return crypto.createHash('sha256').update(String(data)).digest('hex');
};

const displayBanner = (conn) => {
  if (global.displayedBanner) return;
  global.displayedBanner = true;

  const botMode = db.list().settings.self ? "Self Mode" : "Public Mode";
  console.log(chalk.yellow(`
# Time WIB: ${chalk.green(moment().tz("Asia/Jakarta").format("HH:mm:ss DD/MM/YYYY"))}
# Platform: ${chalk.green(os.platform())} (${os.arch()})
# Memory: ${chalk.green(((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2))}% used
# Uptime: ${chalk.green(formatUptime(os.uptime()))}
# Node.js: ${chalk.green(process.version)}
# Mode: ${chalk.green(botMode)}
# Creator: ${chalk.green(`${global.ownername}`)}
`));
};

const setupDailyTasks = () => {
  setInterval(async () => {
    const today = new Date().toISOString().split('T')[0];
    const settings = db.list().settings;

    // 1. Reset Limit Harian
    if (settings.lastReset !== today) {
      console.log(chalk.blue("[TASK] Mereset limit harian untuk semua user..."));
      const users = db.list().user;
      for (let jid in users) {
        users[jid].limit = global.defaultLimit;
      }
      settings.lastReset = today;
      await db.save();
      console.log(chalk.green("[TASK] Reset limit harian selesai."));
    }

    // 2. Cek User Premium Kadaluarsa
    const users = db.list().user;
    const now = Date.now();
    for (let jid in users) {
      const user = users[jid];
      if (user.premium && user.premium.status && user.premium.expired < now) {
        user.premium.status = false;
        user.premium.expired = 0;
        console.log(chalk.yellow(`[TASK] Premium user ${jid} telah kadaluarsa.`));
        // Kirim notifikasi ke user (opsional)
        // await conn.sendMessage(jid, { text: "Masa premium Anda telah berakhir." });
      }
    }
    await db.save();

  }, 5 * 60 * 1000);
};

async function waSocket() {
  displayBanner();
  const {
    state,
    saveCreds
  } = await useMultiFileAuthState("sessions");
  const {
    version
  } = await fetchLatestBaileysVersion();

  let useQR = !fs.existsSync("./sessions/creds.json");
  let pairing = false;
  if (!useQR) {
    console.log(chalk.green("[AUTH] File sesi ditemukan, login otomatis..."));
  } else {
    const authChoice = await question(chalk.cyan("[?] Pilih metode autentikasi:\n[1] Pairing Code\n[2] QR Code\n> Masukkan pilihan (1/2): "));
    if (authChoice === "1") {
      pairing = true;
      useQR = false;
    } else {
      useQR = true;
    }
  }

  const conn = makeWASocket({
    logger: pino({
      level: "silent"
    }),
    printQRInTerminal: useQR,
    version,
    auth: state,
    browser: Browsers.ubuntu("Chrome"),
    syncFullHistory: false,
    getMessage: async (key) => {
      return undefined;
    }
  });

  Object.defineProperties(conn, {
    // --- chatRead ---
    ...(typeof conn.chatRead !== 'function' ? {
      chatRead: {
        /**
         * Read message
         * @param {String} jid 
         * @param {String|undefined|null} participant 
         * @param {String} messageID 
         */
        value(jid, participant = conn.user.jid, messageID) {
          return conn.sendReadReceipt(jid, participant, [messageID]);
        },
        enumerable: true
      }
    } : {}),

    // --- setStatus ---
    ...(typeof conn.setStatus !== 'function' ? {
      setStatus: {
        /**
         * Set status bot
         * @param {String} status 
         */
        value(status) {
          return conn.query({
            tag: 'iq',
            attrs: {
              to: '@s.whatsapp.net',
              type: 'set',
              xmlns: 'status',
            },
            content: [{
              tag: 'status',
              attrs: {},
              content: Buffer.from(status, 'utf-8')
            }]
          });
        },
        enumerable: true
      }
    } : {}),

    // --- sendReact ---
    ...(typeof conn.sendReact !== 'function' ? {
      sendReact: {
        /**
         * Send reaction
         * @param {String} jid
         * @param {String} text
         * @param {Object} key
         */
        value(jid, text, key) {
          return conn.sendMessage(jid, {
            react: {
              text,
              key
            }
          });
        },
        enumerable: true
      }
    } : {}),

    // --- editMessage ---
    ...(typeof conn.editMessage !== 'function' ? {
      editMessage: {
        /**
         * Edit message
         * @param {String} jid 
         * @param {import('@adiwajshing/baileys').proto.WebMessageInfo} message 
         * @param {String} newText 
         * @param {Object} options
         */
        value(jid, message, newText, options = {}) {
          let copy = {
            ...message
          };
          let mtype = Object.keys(copy.message)[0];
          let msgContent = copy.message[mtype];

          if (typeof msgContent === 'string') {
            copy.message[mtype] = newText || msgContent;
          } else if (msgContent.text) {
            msgContent.text = newText || msgContent.text;
          } else if (msgContent.caption) {
            msgContent.caption = newText || msgContent.caption;
          }

          return conn.relayMessage(jid, copy.message, {
            messageId: copy.key.id,
            ...options
          });
        },
        enumerable: true
      }
    } : {})
  });
  // kalau pairing dipilih
  if (pairing && !conn.authState.creds.registered) {
    const phone_number = await question(chalk.green("> Masukkan nomor WhatsApp Anda (dengan kode negara, tanpa + atau spasi): "));
    try {
      const code = await conn.requestPairingCode(phone_number);
      console.log(chalk.green(`\n[✓] Kode Pairing Anda: ${chalk.bold.white(code?.match(/.{1,4}/g)?.join('-') || code)}`));
    } catch (error) {
      console.log(chalk.red(`\n[✗] Gagal meminta kode pairing: ${error.message}`));
      process.exit(1);
    }
  }
  conn.ev.on("creds.update", saveCreds);

  conn.ev.on("connection.update", async (update) => {
    const {
      connection,
      lastDisconnect
    } = update;
    if (connection === "connecting") {
      console.log(chalk.yellow("[+] Menghubungkan ke WhatsApp..."));
    } else if (connection === "open") {
      console.log(chalk.green("[+] Berhasil terhubung ke WhatsApp"));
      global.displayedBanner = false;
      displayBanner(conn);
      setupDailyTasks();
    } else if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(chalk.red(`\n[✗] Koneksi terputus: ${statusCode}, menyambung ulang: ${shouldReconnect}`));
      if (shouldReconnect) {
        setTimeout(waSocket, 5000);
      } else {
        console.log(chalk.red("[!] Logout terdeteksi, hapus folder 'sessions' dan mulai ulang."));
      }
    }
  });

  // --- Event Handlers ---
  const forbidden = [
    'porn', 'hentai', 'pornhub', 'xvideos', 'xnxx', 'nekopoi',
    'lewatsana', 'catsex', 'pixhentai', 'mangasusuku',
    'nhentai', 'bokep','furina','rijal'
  ];
  const store = {
    groupMetadata: {},
    contacts: {}
  };

  conn.ev.on("contacts.upsert", (update) => {
    for (let contact of update) {
      let id = jidNormalizedUser(contact.id);
      store.contacts[id] = {
        ...(contact || {}),
        isContact: true
      };
    }
  });

  conn.ev.on("groups.update", (updates) => {
    for (const update of updates) {
      const id = update.id;
      if (store.groupMetadata[id]) {
        store.groupMetadata[id] = {
          ...(store.groupMetadata[id] || {}),
          ...(update || {})
        };
      }
    }
  });

  conn.ev.on("messages.upsert", async (update) => {
    if (update.type !== 'notify' || !update.messages[0]) return;
    const raw = update.messages[0];

    if (raw.key.remoteJid === `${global.idch}`) {
      let idPesan = raw.key.id || '-';
      let isiPesan =
        raw.message?.conversation ||
        raw.message?.extendedTextMessage?.text ||
        raw.message?.imageMessage?.caption ||
        raw.message?.videoMessage?.caption ||
        raw.message?.documentMessage?.caption ||
        '[Non-text message]';
      let tipe = '';
      if (raw.message?.imageMessage) {
        tipe = '📷 Gambar';
      } else if (raw.message?.stickerMessage) {
        tipe = '🪄 Stiker';
      } else if (raw.message?.videoMessage) {
        tipe = '🎥 Video';
      } else if (raw.message?.audioMessage) {
        tipe = '🎵 Audio';
      } else if (raw.message?.protocolMessage?.type === 0) {
        tipe = '🚫 Pesan Dihapus';
      } else if (raw.message?.conversation || raw.message?.extendedTextMessage) {
        tipe = '💬 Teks';
      } else {
        tipe = '📌 Lainnya';
      }
      let serverId = raw.newsletter_server_id || '-';
      let link = serverId !== '-' ? `${global.linkch}${serverId}` : 'Link tidak tersedia';

      const waktu = moment().tz("Asia/Jakarta").format("DD/MM/YYYY HH:mm");

      await conn.sendMessage(`${global.owner}@s.whatsapp.net`, {
  text: `⚠️ Pesan baru di channel:
*ID Pesan:* 
> ${idPesan}

*Jenis Pesan:*
> ${tipe}

*Link Pesan:* 
> ${link}

*Isi Pesan:* 
${isiPesan}
`,
  buttons: [
    {
      buttonId: `.delch ${global.idch},${idPesan}`,
      buttonText: { displayText: '🗑 Hapus Pesan' },
      type: 1
    }
  ],
  footer: waktu
});
    }
    if (raw.key.remoteJid.endsWith('@newsletter')) {
      let idPesan = raw.key.id;
      let idChannel = raw.key.remoteJid;

      // Ambil teks/caption
      let isiPesan = raw.message?.conversation ||
        raw.message?.extendedTextMessage?.text ||
        raw.message?.imageMessage?.caption ||
        raw.message?.videoMessage?.caption ||
        raw.message?.documentMessage?.caption ||
        '';

      // Cek kata / link terlarang
      if (forbidden.some(x => isiPesan.toLowerCase().includes(x))) {
        console.log(`⚠️ Pesan terdeteksi mengandung link/kata terlarang: ${isiPesan}`);

        // Edit pesan
        try {
          await conn.sendMessage(idChannel, {
            text: '⚠️ Pesan ini melanggar pedoman dan akan dihapus.',
            edit: raw.key
          });
        } catch (e) {
          console.error('❌ Gagal edit pesan:', e);
        }

        // Delay 5 detik lalu hapus
        setTimeout(async () => {
          try {
            await conn.sendMessage(idChannel, {
              delete: {
                remoteJid: idChannel,
                fromMe: true,
                id: idPesan
              }
            });
            console.log(`✅ Pesan ${idPesan} di ${idChannel} berhasil dihapus.`);
          } catch (e) {
            console.error('❌ Gagal hapus pesan:', e);
          }
        }, 5000);
      }
    }
    if (raw.key.remoteJid === `${global.idch}`) {
      let idPesan = raw.key.id || '-';
      let isiPesan =
        raw.message?.conversation ||
        raw.message?.extendedTextMessage?.text ||
        raw.message?.imageMessage?.caption ||
        raw.message?.videoMessage?.caption ||
        raw.message?.documentMessage?.caption ||
        '[Non-text message]';

      let serverId = raw.newsletter_server_id || '-';
      let link = serverId !== '-' ? `${global.linkch}${serverId}` : 'Link tidak tersedia';

      await conn.sendMessage(`${global.owner}@s.whatsapp.net`, {
        text: `⚠️ Pesan baru di channel:
*ID Pesan:* 
> ${idPesan}

*Link Pesan:* 
> ${link}

Isi Pesan: 
${isiPesan}
`
      });
    }

    if (raw.key.remoteJid === 'status@broadcast') return;
    if (raw.key.id.startsWith('BAE5') && raw.key.id.length === 16) return;

    const m = await serialize(raw, conn, store);
    if (!m) return;

    const sender = m.sender || m.jid;

const owners = global.owner.map(v =>
  (v + "").replace(/[^0-9]/g, "") + "@s.whatsapp.net"
);

const dbOwners = db.list().owner.map(v =>
  (v + "").replace(/[^0-9]/g, "") + "@s.whatsapp.net"
);

const botJid = jidNormalizedUser(conn.user.id);

const isOwner = [
  ...owners,
  ...dbOwners,
  botJid
].includes(sender);

if (db.list().settings.self && !isOwner) return;

    logger(m);
    handler(m, conn, store, db, Plugins);
  });

  conn.ev.on("group-participants.update", async (data) => {
    try {
      const participantHandler = (await import("./core/participants.js")).default;
      await participantHandler(data, conn, db);
    } catch (err) {
      console.error(chalk.red("[✗] Gagal menangani pembaruan partisipan:"), err);
    }
  });

  conn.sendTextWithMentions = async (jid, text, quoted, options = {}) =>
    conn.sendMessage(
      jid, {
        text: text,
        contextInfo: {
          mentionedJid: [...text.matchAll(/@(\d{0,16})/g)].map(
            (v) => v[1] + "@s.whatsapp.net",
          ),
        },
        ...options,
      }, {
        quoted,
      },
    );
  //=================================================//
  conn.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (
        (decode.user && decode.server && decode.user + "@" + decode.server) ||
        jid
      );
    } else return jid;
  };
  //=================================================//
  conn.ev.on("contacts.update", (update) => {
    for (let contact of update) {
      let id = conn.decodeJid(contact.id);
      if (store && store.contacts)
        store.contacts[id] = {
          id,
          name: contact.notify,
        };
    }
  });
  //=================================================//
  conn.getName = (jid, withoutContact = false) => {
    id = conn.decodeJid(jid);
    withoutContact = conn.withoutContact || withoutContact;
    let v;
    if (id.endsWith("@g.us"))
      return new Promise(async (resolve) => {
        v = store.contacts[id] || {};
        if (!(v.name || v.subject)) v = conn.groupMetadata(id) || {};
        resolve(
          v.name ||
          v.subject ||
          PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber(
            "international",
          ),
        );
      });
    else
      v =
      id === "0@s.whatsapp.net" ? {
        id,
        name: "WhatsApp",
      } :
      id === conn.decodeJid(conn.user.id) ?
      conn.user :
      store.contacts[id] || {};
    return (
      (withoutContact ? "" : v.name) ||
      v.subject ||
      v.verifiedName ||
      PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber(
        "international",
      )
    );
  };
  //=================================================//
  conn.parseMention = (text = "") => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(
      (v) => v[1] + "@s.whatsapp.net",
    );
  };
  //=================================================//
  conn.sendContact = async (jid, kon, quoted = "", opts = {}) => {
    let list = [];
    for (let i of kon) {
      list.push({
        displayName: await conn.getName(i),
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await conn.getName(i)}\nFN:${await conn.getName(i)}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Click here to chat\nitem2.EMAIL;type=INTERNET:${ytname}\nitem2.X-ABLabel:YouTube\nitem3.URL:${socialm}\nitem3.X-ABLabel:GitHub\nitem4.ADR:;;${location};;;;\nitem4.X-ABLabel:Region\nEND:VCARD`,
      });
    }
    conn.sendMessage(
      jid, {
        contacts: {
          displayName: `${list.length} Contact`,
          contacts: list,
        },
        ...opts,
      }, {
        quoted,
      },
    );
  };
  //=================================================//
  
   conn.sendImage = async (jid, path, caption = "", quoted = "", options) => {
    let buffer = Buffer.isBuffer(path) ?
      path :
      /^data:.*?\/.*?;base64,/i.test(path) ?
      Buffer.from(path.split `,` [1], "base64") :
      /^https?:\/\//.test(path) ?
      await await getBuffer(path) :
      fs.existsSync(path) ?
      fs.readFileSync(path) :
      Buffer.alloc(0);
    return await conn.sendMessage(
      jid, {
        image: buffer,
        caption: caption,
        ...options,
      }, {
        quoted,
      },
    );
  };
  //=================================================//
  conn.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
    let buff = Buffer.isBuffer(path) ?
      path :
      /^data:.*?\/.*?;base64,/i.test(path) ?
      Buffer.from(path.split `,` [1], "base64") :
      /^https?:\/\//.test(path) ?
      await await getBuffer(path) :
      fs.existsSync(path) ?
      fs.readFileSync(path) :
      Buffer.alloc(0);
    let buffer;
    if (options && (options.packname || options.author)) {
      buffer = await writeExifImg(buff, options);
    } else {
      buffer = await imageToWebp(buff);
    }
    await conn.sendMessage(
      jid, {
        sticker: {
          url: buffer,
        },
        ...options,
      }, {
        quoted,
      },
    ).then((response) => {
      fs.unlinkSync(buffer);
      return response;
    });
  };
  //=================================================//
  conn.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
    let buff = Buffer.isBuffer(path) ?
      path :
      /^data:.*?\/.*?;base64,/i.test(path) ?
      Buffer.from(path.split `,` [1], "base64") :
      /^https?:\/\//.test(path) ?
      await await getBuffer(path) :
      fs.existsSync(path) ?
      fs.readFileSync(path) :
      Buffer.alloc(0);
    let buffer;
    if (options && (options.packname || options.author)) {
      buffer = await writeExifVid(buff, options);
    } else {
      buffer = await videoToWebp(buff);
    }
    await conn.sendMessage(
      jid, {
        sticker: {
          url: buffer,
        },
        ...options,
      }, {
        quoted,
      },
    );
    return buffer;
  };
  conn.reply = async (jid, msg, quoted = null, options = {}) => {
    try {
        let message = {};


        if (typeof msg === "string") {
            message.text = msg;
        } 
        
        
        else if (typeof msg === "object") {
            message = { ...msg }; 
        }

        
        if (options.mentions) {
            message.mentions = options.mentions;
        }

      
        Object.assign(message, options);

        return await conn.sendMessage(
            jid,
            message,
            { quoted }
        );

    } catch (e) {
        console.error("conn.reply error:", e);
    }
};
  //=================================================//
  conn.sendImageAsStickerAvatar = async (
    jid,
    path,
    quoted,
    options = {},
  ) => {
    let buff = Buffer.isBuffer(path) ?
      path :
      /^data:.*?\/.*?;base64,/i.test(path) ?
      Buffer.from(path.split `,` [1], "base64") :
      /^https?:\/\//.test(path) ?
      await await getBuffer(path) :
      fs.existsSync(path) ?
      fs.readFileSync(path) :
      Buffer.alloc(0);
    let buffer;
    if (options && (options.packname || options.author)) {
      buffer = await writeExifImgAvatar(buff, options);
    } else {
      buffer = await imageToWebpAvatar(buff);
    }
    await conn.sendMessage(
      jid, {
        sticker: {
          url: buffer,
        },
        ...options,
      }, {
        quoted,
      },
    ).then((response) => {
      fs.unlinkSync(buffer);
      return response;
    });
  };
  //=================================================//
  conn.sendVideoAsStickerAvatar = async (
    jid,
    path,
    quoted,
    options = {},
  ) => {
    let buff = Buffer.isBuffer(path) ?
      path :
      /^data:.*?\/.*?;base64,/i.test(path) ?
      Buffer.from(path.split `,` [1], "base64") :
      /^https?:\/\//.test(path) ?
      await await getBuffer(path) :
      fs.existsSync(path) ?
      fs.readFileSync(path) :
      Buffer.alloc(0);
    let buffer;
    if (options && (options.packname || options.author)) {
      buffer = await writeExifVidAvatar(buff, options);
    } else {
      buffer = await videoToWebpAvatar(buff);
    }
    await conn.sendMessage(
      jid, {
        sticker: {
          url: buffer,
        },
        ...options,
      }, {
        quoted,
      },
    );
    return buffer;
  };
  //=================================================//
  conn.copyNForward = async (
    jid,
    message,
    forceForward = false,
    options = {},
  ) => {
    let vtype;
    if (options.readViewOnce) {
      message.message =
        message.message &&
        message.message.ephemeralMessage &&
        message.message.ephemeralMessage.message ?
        message.message.ephemeralMessage.message :
        message.message || undefined;
      vtype = Object.keys(message.message.viewOnceMessage.message)[0];
      delete(message.message && message.message.ignore ?
        message.message.ignore :
        message.message || undefined);
      delete message.message.viewOnceMessage.message[vtype].viewOnce;
      message.message = {
        ...message.message.viewOnceMessage.message,
      };
    }
    let mtype = Object.keys(message.message)[0];
    let content = await generateForwardMessageContent(message, forceForward);
    let ctype = Object.keys(content)[0];
    let context = {};
    if (mtype != "conversation") context = message.message[mtype].contextInfo;
    content[ctype].contextInfo = {
      ...context,
      ...content[ctype].contextInfo,
    };
    const waMessage = await generateWAMessageFromContent(
      jid,
      content,
      options ? {
        ...content[ctype],
        ...options,
        ...(options.contextInfo ? {
          contextInfo: {
            ...content[ctype].contextInfo,
            ...options.contextInfo,
          },
        } : {}),
      } : {},
    );
    await conn.relayMessage(jid, waMessage.message, {
      messageId: waMessage.key.id,
    });
    return waMessage;
  };
  //=================================================//
  conn.downloadAndSaveMediaMessage = async (
    message,
    filename,
    attachExtension = true,
  ) => {
    let quoted = message.msg ? message.msg : message;
    let mime = (message.msg || message).mimetype || "";
    let messageType = message.mtype ?
      message.mtype.replace(/Message/gi, "") :
      mime.split("/")[0];
    const stream = await downloadContentFromMessage(quoted, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    let type = await FileType.fromBuffer(buffer);
    let trueFileName;
    if (type.ext == "ogg" || type.ext == "opus") {
      trueFileName = attachExtension ? filename + ".mp3" : filename;
      await fs.writeFileSync(trueFileName, buffer);
    } else {
      trueFileName = attachExtension ? filename + "." + type.ext : filename;
      await fs.writeFileSync(trueFileName, buffer);
    }
    return trueFileName;
  };
  //=================================================//
  conn.downloadMediaMessage = async (message) => {
    let mime = (message.msg || message).mimetype || "";
    let messageType = message.mtype ?
      message.mtype.replace(/Message/gi, "") :
      mime.split("/")[0];
    const stream = await downloadContentFromMessage(message, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
  };
  //=================================================//
  conn.getFile = async (PATH, save) => {
    let res;
    let filename;
    let data = Buffer.isBuffer(PATH) ?
      PATH :
      /^data:.*?\/.*?;base64,/i.test(PATH) ?
      Buffer.from(PATH.split `,` [1], "base64") :
      /^https?:\/\//.test(PATH) ?
      await (res = await getBuffer(PATH)) :
      fs.existsSync(PATH) ?
      ((filename = PATH), fs.readFileSync(PATH)) :
      typeof PATH === "string" ?
      PATH :
      Buffer.alloc(0);

    // Ganti FileType.fromBuffer menjadi fileTypeFromBuffer
    let type = (await fileTypeFromBuffer(data)) || {
      mime: "application/octet-stream",
      ext: ".bin",
    };

    if (data && save) fs.promises.writeFile(filename, data);

    return {
      res,
      filename,
      size: await getSizeMedia(data),
      ...type,
      data,
    };
};
  //=================================================//
  conn.sendText = (jid, text, quoted = "", options) =>
    conn.sendMessage(
      jid, {
        text: text,
        ...options,
      }, {
        quoted,
      },
    );
  //=================================================//
  conn.serializeM = (m) => smsg(conn, m, store);
  /**
   * Send Media/File with Automatic Type Specifier
   * @param {String} jid
   * @param {String|Buffer} path
   * @param {String} filename
   * @param {String} caption
   * @param {import('@whiskeysockets/baileys').proto.WebMessageInfo} quoted
   * @param {Boolean} ptt
   * @param {Object} options
   */
  conn.sendFile = async (
    jid,
    path,
    filename = "",
    caption = "",
    quoted,
    ptt = false,
    options = {},
  ) => {
    let type = await conn.getFile(path, true);
    let {
      res,
      data: file,
      filename: pathFile
    } = type;
    if ((res && res.status !== 200) || file.length <= 65536) {
      try {
        throw {
          json: JSON.parse(file.toString()),
        };
      } catch (e) {
        if (e.json) throw e.json;
      }
    }
    const fileSize = fs.statSync(pathFile).size / 1024 / 1024;
    if (fileSize >= 1800) throw new Error(" The file size is too large\n\n");
    let opt = {};
    if (quoted) opt.quoted = quoted;
    if (!type) options.asDocument = true;
    let mtype = "",
      mimetype = options.mimetype || type.mime,
      convert;
    if (
      /webp/.test(type.mime) ||
      (/image/.test(type.mime) && options.asSticker)
    )
      mtype = "sticker";
    else if (
      /image/.test(type.mime) ||
      (/webp/.test(type.mime) && options.asImage)
    )
      mtype = "image";
    else if (/video/.test(type.mime)) mtype = "video";
    else if (/audio/.test(type.mime))
      (convert = await toAudio(file, type.ext)),
      (file = convert.data),
      (pathFile = convert.filename),
      (mtype = "audio"),
      (mimetype = options.mimetype || "audio/mpeg; codecs=mp3");
    else mtype = "document";
    if (options.asDocument) mtype = "document";
    delete options.asSticker;
    delete options.asLocation;
    delete options.asVideo;
    delete options.asDocument;
    delete options.asImage;
    let message = {
      ...options,
      caption,
      ptt,
      [mtype]: {
        url: pathFile,
      },
      mimetype,
      fileName: filename || pathFile.split("/").pop(),
    };
    /**
     * @type {import('@whiskeysockets/baileys').proto.WebMessageInfo}
     */
    let m;
    try {
      m = await conn.sendMessage(jid, message, {
        ...opt,
        ...options,
      });
    } catch (e) {
      console.error(e);
      m = null;
    } finally {
      if (!m)
        m = await conn.sendMessage(
          jid, {
            ...message,
            [mtype]: file,
          }, {
            ...opt,
            ...options,
          },
        );
      file = null; // releasing the memory
      return m;
    }
  };
  //=================================================//
  conn.sendFile = async (jid, media, filename = '', caption = '', quoted = null, options = {}) => {
  try {
    let file = await conn.getFile(media);
    let ext = file.ext ? file.ext.toLowerCase() : "";
    let type;
    let mimetype;

    // Tentukan tipe file berdasarkan ekstensi
    switch (ext) {
      case "mp3":
        type = "audio";
        mimetype = "audio/mpeg";
        break;

      case "jpg":
      case "jpeg":
      case "png":
        type = "image";
        break;

      case "webp":
        type = "sticker";
        break;

      case "mp4":
        type = "video";
        break;

      default:
        type = "document";
        mimetype = file.mime;
        break;
    }

    // Build message
    let message = {
      [type]: file.data,
      mimetype: options.mimetype || mimetype,
      fileName: filename || `file.${ext}`,
      caption: caption || options.caption || ""
    };

    // PTT / VN
    if (type === "audio" && options.ptt) {
      message.ptt = true;
    }

    // Opsi internal Baileys
    let sendOptions = {
      quoted: quoted || options.quoted || null
    };

    return await conn.sendMessage(jid, message, sendOptions);

  } catch (err) {
    console.error("sendFile error:", err);
    throw err;
  }
};
  //=================================================//
  conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
    let mime = "";
    let res = await axios.head(url);
    mime = res.headers["content-type"];
    if (mime.split("/")[1] === "gif") {
      return conn.sendMessage(
        jid, {
          video: await getBuffer(url),
          caption: caption,
          gifPlayback: true,
          ...options,
        }, {
          quoted: quoted,
          ...options,
        },
      );
    }
    let type = mime.split("/")[0] + "Message";
    if (mime === "application/pdf") {
      return conn.sendMessage(
        jid, {
          document: await getBuffer(url),
          mimetype: "application/pdf",
          caption: caption,
          ...options,
        }, {
          quoted: quoted,
          ...options,
        },
      );
    }
    if (mime.split("/")[0] === "image") {
      return conn.sendMessage(
        jid, {
          image: await getBuffer(url),
          caption: caption,
          ...options,
        }, {
          quoted: quoted,
          ...options,
        },
      );
    }
    if (mime.split("/")[0] === "video") {
      return conn.sendMessage(
        jid, {
          video: await getBuffer(url),
          caption: caption,
          mimetype: "video/mp4",
          ...options,
        }, {
          quoted: quoted,
          ...options,
        },
      );
    }
    if (mime.split("/")[0] === "audio") {
      return conn.sendMessage(
        jid, {
          audio: await getBuffer(url),
          caption: caption,
          mimetype: "audio/mpeg",
          ...options,
        }, {
          quoted: quoted,
          ...options,
        },
      );
    }
  };
  /**
   *
   * @param {*} jid
   * @param {*} name
   * @param [*] values
   * @returns
   */
  /*
  conn.sendPoll = (jid, name = "", values = [], selectableCount = 1) => {
  return conn.sendMessage(jid, {
  poll: {
  name,
  values,
  selectableCount,
  },
  });
  };
  */
  /**
   * @typedef Media
   * @prop {"image"|"video"|"document"} type
   * @prop {buffer|{ url: string }} data
   * @prop {{}} [options]
   */
  /**
   * @typedef Button
   * @prop {Section[]} [sections]
   */
  /**
   * @typedef Section
   * @prop {string} title
   * @prop {Row[]} rows
   */
  /**
   * @typedef Row
   * @prop {string} header
   * @prop {string} title
   * @prop {string} description
   * @prop {string} id
   */
  /**
   * Function to send interactiveMessage
   *
   * @param {string} jid
   * @param {string} body
   * @param {string} [footer]
   * @param {string} title
   * @param {string} [subtitle]
   * @param {Media} [media]
   * @param {Button[]} buttons
   * @param {proto.WebMessageInfo} [quoted]
   * @param {{}} [options={}]
   * @returns {Promise<proto.WebMessageInfo>}
   */

  // ### End of sending message ###
  return conn;
}

try {
  const conn = await waSocket();
  setTimeout(async () => {
    console.log(chalk.cyan("\n[+] Memuat plugins..."));
    await Plugins.load();
    console.log(chalk.green(`[✓] ${Object.keys(Plugins.plugins).length} plugin berhasil dimuat.`));

    console.log(chalk.green(`\n[✓] ${global.botname} siap digunakan!`));
  }, 3000);
} catch (e) {
  console.error(chalk.bgRed("[!] Gagal memulai bot:"), e);
}