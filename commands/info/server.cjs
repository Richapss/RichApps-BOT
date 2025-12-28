const axios = require('axios')
const os = require('os')

const handler = async (m, {
    conn
}) => {
    try {
        if (global.loading) await global.loading(m, conn)

        const response = await axios.get('http://ip-api.com/json/')
        const serverInfo = response.data

        let serverMessage = `•  S E R V E R\n\n`

        const osInfo = os.platform()
        const totalRAM = Math.floor(os.totalmem() / (1024 * 1024))
        const freeRAM = Math.floor(os.freemem() / (1024 * 1024))
        const uptimeFormatted = formatUptime(os.uptime())
        const processor = os.cpus()[0]?.model || 'Unknown'

        serverMessage += `OS: *${osInfo}*\n`
        serverMessage += `Ram: *${freeRAM} MB / ${totalRAM} MB*\n`
        serverMessage += `Negara: *${serverInfo.country}*\n`
        serverMessage += `Kode Negara: *${serverInfo.countryCode}*\n`
        serverMessage += `Wilayah: *${serverInfo.region}*\n`
        serverMessage += `Nama Wilayah: *${serverInfo.regionName}*\n`
        serverMessage += `Kota: *${serverInfo.city}*\n`
        serverMessage += `Zip: *${serverInfo.zip}*\n`
        serverMessage += `Lat: *${serverInfo.lat}*\n`
        serverMessage += `Lon: *${serverInfo.lon}*\n`
        serverMessage += `Zona Waktu: *${serverInfo.timezone}*\n`
        serverMessage += `ISP: *${serverInfo.isp}*\n`
        serverMessage += `Org: *${serverInfo.org}*\n`
        serverMessage += `AS: *${serverInfo.as}*\n`
        serverMessage += `Pencarian: *HIDDEN*\n`
        serverMessage += `Waktu Aktif: *${uptimeFormatted.trim()}*\n`
        serverMessage += `Prosesor: *${processor}*`

        await m.reply(serverMessage)
    } catch (e) {
        console.error(e)
        await m.reply('❌ Gagal mengambil informasi server')
    } finally {
        if (global.loading) await global.loading(m, conn, true)
    }
}

handler.help = ['server']
handler.tags = ['info']
handler.command = /^(server)$/i

module.exports = handler

function formatUptime(uptime) {
    let seconds = Math.floor(uptime % 60)
    let minutes = Math.floor((uptime / 60) % 60)
    let hours = Math.floor((uptime / 3600) % 24)
    let days = Math.floor(uptime / 86400)

    let formatted = ''
    if (days) formatted += `${days} days `
    if (hours) formatted += `${hours} hours `
    if (minutes) formatted += `${minutes} minutes `
    if (seconds) formatted += `${seconds} seconds`

    return formatted || '0 seconds'
}