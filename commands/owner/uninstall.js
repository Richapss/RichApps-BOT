import {
    exec
} from 'child_process'

let handler = async (m, {
    text
}) => {
    if (!text) return m.reply('Masukkan nama modul\nContoh: .install axios')

    m.reply(`Installing module ${text}...`)

    exec(`npm uninstall ${text}`, (err, stdout, stderr) => {
        if (err) return m.reply(`Gagal install: ${err.message}`)
        if (stderr) return m.reply(`Error: ${stderr}`)
        m.reply(`${stdout}`)
    })
}

handler.help = ['uninstall <module>']
handler.command = ['uninstall']
handler.owner = true
export default handler
