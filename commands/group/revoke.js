let handler = async (m, { conn, db }) => {


  const user = db.get('user', m.sender);

  if (!user) return m.reply('❌ Kamu belum terdaftar. Silakan daftar dulu dengan command .daftar');

  try {

    let rest = await conn.groupRevokeInvite(m.chat);

    let linked = 'https://chat.whatsapp.com/' + rest;

    m.reply(linked);

  } catch (error) {

    console.error(error);

    m.reply('❌ Gagal mengambil link undangan grup');

  }

};

handler.help = ['revoke'];

handler.tags = ['group'];

handler.command = ['revoke'];

handler.group = true;

handler.admin = true;

handler.botAdmin = true

export default handler;