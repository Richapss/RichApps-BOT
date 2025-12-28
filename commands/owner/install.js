import {
    exec
} from 'child_process'

let handler = async (m, {
    text
}) => {
    if (!text) return m.reply('Masukkan nama modul\nContoh: .install axios')

    m.reply(`Installing module ${text}...`)

    exec(`npm i ${text}`, (err, stdout, stderr) => {
        if (err) return m.reply(`Gagal install: ${err.message}`)
        if (stderr) return m.reply(`Error: ${stderr}`)
        m.reply(`${stdout}`)
    })
}

handler.help = ['install <module>']
handler.command = ['install']
handler.tags = ['owner']
handler.owner = true
export default handler