import axios from "axios";
import https from "https";


async function getUpdatedMetadata(conn, id) {
  await new Promise(r => setTimeout(r, 200));
  return await conn.groupMetadata(id);
}

export default async function handleGroupParticipants(data, conn, db) {
  const { id, participants, action, actor } = data;

  const groupSettings = db.get("group", id) || { welcome: false, detect: false };
  const isWelcome = groupSettings.welcome !== false;
  const isDetect = groupSettings.detect !== false;

  if (!isWelcome && !isDetect) return;

  try {
    let metadata = await conn.groupMetadata(id);
    let memberCount = metadata.participants.length;

    if (action === "add" || action === "remove") {
      try {
        metadata = await getUpdatedMetadata(conn, id);
        memberCount = metadata.participants.length;
      } catch {
      }
    }

    const groupName = metadata.subject || "Grup Ini";

    // Default foto profil & background
    const defaultBg = groupSettings.background || "https://f.top4top.io/p_3631pzji70.jpg";
    const defaultAvatar = groupSettings.avatar || "https://files.catbox.moe/7e4y9f.jpg";

    const enc = (txt) => encodeURIComponent(String(txt || ""));
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    for (const user of participants) {
      const jid = typeof user === "string" ? user : user?.id || user?.jid;
      if (!jid) continue;

      const mentionName = "@" + jid.split("@")[0];

      // FOTO PROFIL FALLBACK
      const ppuser = await conn.profilePictureUrl(jid, "image").catch(() => defaultAvatar);

      let caption = null;


      switch (action) {
        case "add":
          if (isWelcome)
            caption = `Selamat datang ${mentionName}!`;
          break;

        case "remove":
          if (isWelcome)
            caption = actor === jid
              ? `Selamat tinggal ${mentionName}!`
              : `${mentionName} telah keluar dari grup.`;
          break;

        case "promote":
          if (isDetect)
            caption = `${mentionName} sekarang menjadi admin!`;
          break;

        case "demote":
          if (isDetect)
            caption = `${mentionName} tidak lagi menjadi admin.`;
          break;
      }

      if (!caption) continue;
      const desc = `${caption} | Member: ${memberCount}`;

      const apiUrl =
        "https://api.ryuu-dev.offc.my.id/tools/WelcomeLeave" +
        `?title=${enc(groupName)}` +
        `&desc=${enc(desc)}` +
        `&profile=${enc(ppuser)}` +
        `&background=${enc(defaultBg)}`;

      try {
        const res = await axios.get(apiUrl, {
          httpsAgent,
          responseType: "arraybuffer",
          timeout: 15000,
        });

        const buffer = Buffer.from(res.data);

        await conn.sendMessage(id, {
          image: buffer,
          caption,
          mentions: [jid, actor].filter(Boolean),
        });

      } catch (err) {
        console.error("API Welcome/Leave ERROR →", err.message);

        // FALLBACK ke text
        await conn.sendMessage(id, {
          text: caption,
          mentions: [jid],
        });
      }
    }
  } catch (e) {
    console.error(`❌ Group Metadata Error (${id}):`, e.message);
  }
}