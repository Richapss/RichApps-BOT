import axios from 'axios'

let handler = async (m, {
    conn,
    text,
    usedPrefix,
    command
}) => {
    try {
        let q = m.quoted && !text ? m.quoted : m
        let txt = text ? text : typeof q.text == 'string' ? q.text : ''

        const token = global.tokengh
        if (!token) return m.reply('⚠️ Token GitHub belum diset di settings.js! (global.tokengh)')

        if (!txt) {
            return m.reply(
                `⚙️ Format salah!\n\nGunakan:\n${usedPrefix + command} nama_file.js|isi_kode\n\nAtau reply teks dengan:\n${usedPrefix + command} nama_file.js`
            )
        }

        // Ambil prefix asli dari text
        let rawText = m.text?.trim() || ''
        let cleanText = rawText.replace(new RegExp(`^\\${usedPrefix}${command}\\s*`, 'i'), '').trim()

        let filename = ''
        let content = ''
        let isRaw = false

        if (cleanText.includes('--raw')) isRaw = true

        // Jika reply message
        if (m.quoted && m.quoted.text && !cleanText.includes('|')) {
            filename = cleanText.replace(/--raw/gi, '').trim() || 'reply.js'
            content = m.quoted.text
        } else {
            // Format biasa: file|isi
            let [fname, ...contentArr] = cleanText.split('|')
            filename = (fname || 'untitled.js').replace(/--raw/gi, '').trim()
            content = contentArr.join('|').trim()
        }

        if (!filename || !content) {
            return m.reply(
                `⚙️ Format salah!\n\nContoh:\n${usedPrefix + command} index.js|console.log("Halo dunia!")`
            )
        }

        const isPrivate = cleanText.includes('--private')
        const description = `Uploaded via ${conn.user?.name || 'Bot WhatsApp'}`

        let { data } = await axios.post(
            'https://api.github.com/gists',
            {
                description,
                public: !isPrivate,
                files: {
                    [filename]: { content }
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'WhatsApp-Bot'
                }
            }
        )

        const gistUrl = data.html_url
        const rawUrl = data.files?.[filename]?.raw_url

        let msg = `✅ *Berhasil upload ke GitHub Gist!*\n📁 File: ${filename}`

        if (isRaw && rawUrl) {
            msg += `\n🔗 *Raw URL:* ${rawUrl}`
        } else {
            msg += `\n🌐 *URL:* ${gistUrl}\n📄 *Raw:* ${rawUrl}`
        }

        await m.reply(msg)

    } catch (e) {
        console.error(e)
        await m.reply(`❌ Gagal upload Gist!\n${e.response?.data?.message || e.message}`)
    }
}

handler.help = ['gist']
handler.tags = ['tools']
handler.command = /^(gist|uptogist|uploadgist)$/i
handler.owner = true

export default handler