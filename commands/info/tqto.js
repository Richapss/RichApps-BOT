const handler = async (m, { conn }) => {
  const caption = `*>_SPECIAL THANKS TO_*

> - *Z7*
  (Script Owner & Modifier)
> - *AxellNetwork/Bang_syaii*
  (Original Script Developer)
> - *Baileys Team*
  (WhatsApp Web API Library)
> - *Base awal*
    (Flow falcon)
> - *Recode*
       (Z7)
*© Sponsor by Z7*`;

  await conn.sendMessage(m.from, { text: caption }, { quoted: m });
};

handler.command = ["tqto", "thanksto", "credits"];
handler.tags = "info";
handler.description = "Menampilkan ucapan terima kasih dan kredit.";

export default handler;
