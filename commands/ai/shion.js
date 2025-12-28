import axios from 'axios'

const handler = async (m, {
    text,
    conn
}) => {
    if (!text) return m.reply('Masukkan percakapanmu, contoh: Hai Shion, apa kabar?')

    try {
        const url = `https://zelapioffciall.koyeb.app/ai/shion?text=${encodeURIComponent(text)}`
        const res = await axios.get(url)
        const data = res.data

        if (!data.status || !data.result) {
            throw data.message || 'Tidak ada hasil ditemukan.'
        }

        const hasil = `${data.result.content}`

        await conn.sendMessage(m.chat, {
            text: hasil.trim()
        }, {
            quoted: m
        })

    } catch (error) {
        await conn.sendMessage(m.chat, {
            text: `Terjadi kesalahan: ${error.response?.data?.message || error.message || error}`
        }, {
            quoted: m
        })
    }
}

handler.help = ['shion']
handler.tags = ['ai']
handler.command = /^(shion)$/i
handler.limit = false

export default handler