import {
  extractMessageContent,
  jidNormalizedUser,
  areJidsSameUser,
  downloadMediaMessage,
} from "baileys";

const getDevice = (id) =>
  /^3A.{18}$/.test(id)
    ? "ios"
    : /^3E.{20}$/.test(id)
      ? "web"
      : /^(.{21}|.{32})$/.test(id)
        ? "android"
        : /^.{18}$/.test(id)
          ? "desktop"
          : "bot";

const getContentType = (content) => {
  if (!content) return;
  const keys = Object.keys(content);
  const key = keys.find(
    (k) =>
      (k === "conversation" ||
        k.endsWith("Message") ||
        k.includes("V2") ||
        k.includes("V3")) &&
      k !== "senderKeyDistributionMessage"
  );
  return key;
};

function parseMessage(content) {
  content = extractMessageContent(content);
  if (content?.viewOnceMessageV2Extension) {
    content = content.viewOnceMessageV2Extension.message;
  }
  if (content?.protocolMessage?.type === 14) {
    const type = getContentType(content.protocolMessage);
    content = content.protocolMessage[type];
  }
  if (content?.message) {
    const type = getContentType(content.message);
    content = content.message[type];
  }
  return content;
}

export default async (raw, conn, store) => {
  if (!raw?.message) return;

  const m = {};
  m.key = raw.key;
  m.from = m.key.remoteJid;
  m.fromMe = m.key.fromMe;
  m.message = parseMessage(raw.message);
  m.sender = jidNormalizedUser(m.key.participant || m.from);

  if (raw.message) {
    m.type = getContentType(raw.message) || Object.keys(raw.message)[0];
    m.msg = parseMessage(raw.message[m.type]) || raw.message[m.type];
    m.mentions = [
      ...(m.msg?.contextInfo?.mentionedJid || []),
      ...(m.msg?.contextInfo?.groupMentions?.map(v => v.groupJid) || []),
    ];
    m.text =
      m.msg?.text ||
      m.msg?.conversation ||
      m.msg?.caption ||
      m.message?.conversation ||
      m.msg?.selectedButtonId ||
      m.msg?.singleSelectReply?.selectedRowId ||
      m.msg?.selectedId ||
      m.msg?.contentText ||
      m.msg?.selectedDisplayText ||
      m.msg?.title ||
      "";
  }

  m.isGroup = m.from.endsWith("@g.us");
  m.isNewsletter = m.from.endsWith("@newsletter");
  m.jid = jidNormalizedUser(
    m.fromMe ? conn.user.id : m.isGroup ? m.key.participant : m.from
  );

  if (m.isGroup) {
    if (!(m.from in store.groupMetadata))
      store.groupMetadata[m.from] = await conn.groupMetadata(m.from);
    m.metadata = store.groupMetadata[m.from];
  }

  m.id = raw?.key?.id || false;
  m.device = getDevice(m.id);
  m.isBot = m.id?.startsWith("BAE5") || m.device === "bot";
  m.expiration = m.msg?.contextInfo?.expiration || 0;
  m.timestamps =
    typeof raw?.messageTimestamp === "number"
      ? raw.messageTimestamp * 1000
      : m.msg?.timestampMs * 1000 || Date.now();
  m.name = raw?.pushName || conn.user?.name || "User";
  m.isMedia = !!m.msg?.mimetype || !!m.msg?.thumbnailDirectPath;

  if (m.isMedia) {
    m.download = async () => downloadMediaMessage(raw, "buffer", {}, {
      logger: console,
      reuploadRequest: conn.updateMediaMessage
    });
  }

  m.reply = async (text) => {
    let payload = typeof text === "string" ? { text } : { ...text };
    return conn.sendMessage(m.from, payload, { quoted: raw });
  };

  m.edit = async (text, key = m.key) => {
    let payload = typeof text === "string" ? { text, edit: key } : { ...text, edit: key };
    return conn.sendMessage(m.from, payload, { quoted: raw });
  };

  m.react = (emoji) => conn.sendMessage(m.from, { react: { text: emoji, key: m.key } });

  // --- QUOTED MESSAGE ---
  if (m.msg?.contextInfo?.quotedMessage) {
    m.quoted = {};
    const quotedRaw = {
      key: {
        remoteJid: m.from,
        fromMe: areJidsSameUser(
          m.msg.contextInfo.participant,
          conn.user.id.split(":")[0] + "@s.whatsapp.net"
        ),
        id: m.msg.contextInfo.stanzaId,
        participant: m.msg.contextInfo.participant
      },
      message: m.msg.contextInfo.quotedMessage
    };

    m.quoted.id = quotedRaw.key.id || null;
    m.quoted.sender = jidNormalizedUser(quotedRaw.key.participant || m.from);
    m.quoted.fromMe = quotedRaw.key.fromMe || false;
    m.quoted.isBot = m.quoted.id?.startsWith("BAE5") || false;
    m.quoted.message = parseMessage(quotedRaw.message);
    m.quoted.type = getContentType(m.quoted.message) || Object.keys(m.quoted.message || {})[0];
    m.quoted.msg = m.quoted.message?.[m.quoted.type] || m.quoted.message;

    m.quoted.text =
      m.quoted.msg?.text ||
      m.quoted.msg?.conversation ||
      m.quoted.msg?.caption ||
      (typeof m.quoted.msg === "string" ? m.quoted.msg : "") ||
      "";

    m.quoted.isMedia = !!m.quoted.msg?.mimetype || !!m.quoted.msg?.thumbnailDirectPath;
    if (m.quoted.isMedia) {
      m.quoted.download = async () => downloadMediaMessage(quotedRaw, "buffer", {}, {
        logger: console,
        reuploadRequest: conn.updateMediaMessage
      });
    }
  }

  return m;
};