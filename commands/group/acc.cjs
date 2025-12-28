const delay = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const handler = async (m, { conn, command, text }) => {
    const listRequest = await conn.groupRequestParticipantsList(m.chat);
    if (!listRequest || listRequest.length === 0) {
        return m.reply("Tidak ada list request join!");
    }

    const action = command === "reject" ? "reject" : "approve";
    const jids = listRequest.map((r) => r.jid);

    const isAll = text && text.toLowerCase().includes("all");
    const parsedNumber = text ? parseInt(text.replace(/[^\d]/g, ""), 10) : NaN;

    let target = [];

    if (isAll) {
        target = jids;
    } else if (!isNaN(parsedNumber) && parsedNumber > 0) {
        const n = Math.min(parsedNumber, jids.length);
        target = shuffle(jids).slice(0, n);
    } else {
        target = [jids[0]];
    }

    let ok = 0, fail = 0;
    for (const jid of target) {
        try {
            await conn.groupRequestParticipantsUpdate(m.chat, [jid], action);
            ok++;
            await delay(1500);
        } catch {
            fail++;
        }
    }

    const verb = action === "approve" ? "diacc" : "direject";
    return m.reply(`✅ ${ok} ${verb}${fail ? `, ❌ ${fail} gagal` : ""}. Total request: ${listRequest.length}`);
};

handler.help = ["acc", "reject"];
handler.tags = ["group"];
handler.command = ["acc", "reject"];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

module.exports = handler;