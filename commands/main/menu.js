import os from "os";
import fs from "fs";
import moment from "moment-timezone";

const handler = async (m, { conn, user, isOwner, isPremium, cmd, Func }) => {

  const menu = {};

  const prefixMatch = m.text.match(/^[°•π÷×¶∆£¢€¥®™+✓=|/~!?@#%^&.©^]/);
  const prefix = prefixMatch ? prefixMatch[0] : "";

  // Loop semua plugin
  Object.values(cmd.plugins).forEach((plugin) => {
    if (!plugin.command || !plugin.tags) return;
    if (plugin.owner && !isOwner) return;

    if (!menu[plugin.tags]) menu[plugin.tags] = [];

    let commandName = "";

    if (plugin.command instanceof RegExp) {
      let src = plugin.command.source;

      src = src
        .replace(/^\^/, "")
        .replace(/\$$/, "")
        .replace(/\(\?:/g, "(")
        .replace(/\(\?/g, "(")
        .replace(/[()]/g, "")
        .replace(/[+*?]/g, "")
        .trim();

      commandName = src.split("|")[0];
    } else if (Array.isArray(plugin.command)) {
      commandName = plugin.command[0];
    } else if (typeof plugin.command === "string") {
      commandName = plugin.command;
    }

    if (!commandName) return;

    menu[plugin.tags].push({
      command: commandName.toLowerCase(),
      description: plugin.description || "Tanpa deskripsi"
    });
  });

  // Baca case.js
  try {
    const caseFile = fs.readFileSync("./case.js", "utf-8").split("\n");

    let currentTags = "casejs";

    for (let line of caseFile) {
      line = line.trim();

      if (line.startsWith("//")) {
        currentTags = line.replace("//", "").trim().toLowerCase();
        continue;
      }

      const match = line.match(/case ['"`](.*?)['"`]\s*:/);

      if (match) {
        const commandName = match[1];

        if (!menu[currentTags]) menu[currentTags] = [];

        menu[currentTags].push({
          command: commandName,
          description: "Command dari case.js",
        });
      }
    }

  } catch (e) {
    console.error("Gagal membaca case.js:", e.message);
  }

  // READMORE
  const more = String.fromCharCode(8206);
  const readMore = more.repeat(4001);

  // USER STATUS
  const userStatus = isOwner
    ? "👑 Owner"
    : isPremium
    ? "💎 Premium"
    : user.register
    ? "👤 Free User"
    : "❓ Not Registered";

  const uptime = Func.toTime(process.uptime() * 1000);
  const serverUptime = Func.toTime(os.uptime() * 1000);
  const groupCount = Object.keys(await conn.groupFetchAllParticipating()).length;

  // HEADER
  let caption = `ʜɪ, ${m.name}: 👋

ꜱᴀʏᴀ ᴀᴅᴀʟᴀʜ ${global.botname}, ꜱɪᴀᴘ ᴍᴇᴍʙᴀɴᴛᴜ ᴀɴᴅᴀ!

乂 ɪɴꜰᴏ ᴘᴇɴɢɢᴜɴᴀ
┌  ◦ ꜱᴛᴀᴛᴜꜱ: ${userStatus}
└  ◦ ʟɪᴍɪᴛ: ${user.limit || 0}

乂 ɪɴꜰᴏ ʙᴏᴛ
┌  ◦ ɢʀᴜᴘ: ${groupCount}
│  ◦ ᴜᴘᴛɪᴍᴇ: ${uptime}
└  ◦ ꜱᴇʀᴠᴇʀ ᴜᴘᴛɪᴍᴇ: ${serverUptime}

*Bug Report:* Jika ada bug, hubungi Owner.

${readMore}
`;

  const sortedTags = Object.keys(menu).sort(); // Urutkan alfabetik tag
  const prefixLabel = prefix ? `(ᴘʀᴇꜰɪx: ${prefix})` : "(ᴛᴀɴᴘᴀ ᴘʀᴇꜰɪx)";

  caption += `乂 ᴍᴇɴᴜ ${prefixLabel}\n\n`;

  // LOOP MENU PER TAG
  for (let tags of sortedTags) {
    caption += `– ᴍᴇɴᴜ ${tags.toUpperCase()}\n`;

    // Urutkan command alfabetik
    const commands = menu[tags]
      .sort((a, b) => a.command.localeCompare(b.command))
      .map((c) => `│  ◦ ${prefix}${c.command}`)
      .join("\n");

    caption += `${commands}\n└––\n\n`;
  }

  // KIRIM PESAN
  await conn.sendMessage(
    m.from,
    {
      text: Func.Styles(caption),
      contextInfo: {
        externalAdReply: {
          title: `${global.botname} | ${moment().tz("Asia/Jakarta").format("HH:mm")}`,
          body: `Uptime: ${uptime}`,
          thumbnail: await Func.fetchBuffer(global.thumb),
          sourceUrl: "https://github.com/Reyz2902",
          mediaType: 1,
          renderLargerThumbnail: true,
        },
      },
    },
    { quoted: m }
  );
};

handler.command = ["menu"];
handler.tags = "main";
handler.description = "Menampilkan daftar perintah bot.";

export default handler;