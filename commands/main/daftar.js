import {
    createHash
} from 'crypto';

const handler = async (m, {
    text,
    command,
    user,
    db
}) => {
    // Pastikan database terdefinisi
    const database = db || global.db;
    if (!database) return m.reply('⚠️ Database tidak ditemukan. Pastikan global.db sudah diinisialisasi.');

  
    let userData = user || database.get('user', m.sender);
    if (!userData) {
        // Jika belum ada user, buat entri baru
        userData = {
            id: m.sender,
            name: '',
            age: 0,
            register: false,
            regTime: 0,
            sn: '',
            limit: 0,
            premium: {
                status: false,
                expired: 0
            }
        };
        database.add('user', userData);
    }

    // Cegah pendaftaran ganda
    if (userData.register) {
        return m.reply('_Anda sudah terdaftar!_');
    }

    const name = text?.trim();
    if (!name) {
        return m.reply(`_Masukkan nama Anda._\nContoh: *.${command} Z7*`);
    }
    if (name.length > 20) {
        return m.reply('_Nama terlalu panjang, maksimal 20 karakter._');
    }

    // Buat data pendaftaran
    const age = Math.floor(Math.random() * 20) + 15; // Contoh umur acak
    const serialNumber = createHash('md5').update(m.sender).digest('hex').slice(0, 8).toUpperCase();

    // Update data user
    userData.name = name;
    userData.age = age;
    userData.register = true;
    userData.regTime = Date.now();
    userData.sn = serialNumber;
    userData.limit = (userData.limit || 0) + 50; // Tambah bonus 50 limit

    // Simpan database
    await database.save();

    // Pesan konfirmasi
    const msg = `
🎉 *Pendaftaran Berhasil!*

👤 *Nama:* ${name}
🎂 *Umur:* ${age} tahun
🧾 *Serial Number:* ${serialNumber}

🎁 Anda mendapatkan bonus *50 Limit*.
Ketik *.menu* untuk melihat daftar perintah.
  `.trim();

    await m.reply(msg);
};

handler.command = ['daftar', 'register', 'reg'];
handler.tags = 'main';
handler.description = 'Mendaftarkan pengguna baru ke database.';
handler.limit = false; // tidak mengurangi limit saat daftar

export default handler;