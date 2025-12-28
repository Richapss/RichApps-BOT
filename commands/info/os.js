import os from "os";
import {
    exec
} from "child_process";
import {
    promisify
} from "util";
import performance from "performance-now";

const execAsync = promisify(exec);

// ==================== 🛠️ UTILITY FUNCTIONS ====================

const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const formatDuration = (seconds) => {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);
    return parts.join(' ') || '0s';
};

/** Membuat Bar Visual (Sistem Bar) */
const createProgressBar = (percentage, size = 20) => {
    const filledSize = Math.floor((percentage / 100) * size);
    const emptySize = size - filledSize;
    const filledBar = '█'.repeat(filledSize);
    const emptyBar = '░'.repeat(emptySize);
    return `[${filledBar}${emptyBar}]`;
};

// ==================== 🔍 SYSTEM DATA GATHERING (STABILIZED) ====================

const getOSRelease = async () => {
    try {
        if (os.platform() === 'win32') return os.version();
        const {
            stdout
        } = await execAsync('cat /etc/os-release | grep PRETTY_NAME');
        return stdout.split('=')[1]?.replace(/"/g, '').trim() || os.type();
    } catch {
        return `${os.type()} ${os.release()}`;
    }
};

/** Ambil Info CPU Mendalam (Dasar) */
const getCPUDetails = () => {
    const cpus = os.cpus();
    const model = cpus[0].model.trim();
    const speed = cpus[0].speed;
    const cores = cpus.length;

    return {
        model,
        speed: `${speed} MHz`,
        cores,
        arch: os.arch(),
        cacheSize: 'N/A (Limited Access)'
    };
};

/** Info RAM & Disk (Disimplifikasi agar tidak memanggil perintah Shell yang kompleks) */
const getHardwareInfoBasic = () => {
    return {
        ramType: 'Virtual/Unknown',
        diskInfo: {
            type: 'Virtual/Unknown',
            raid: 'N/A'
        }
    };
};

/** Ambil Info Disk (Filter Loop & Root) */
const getDiskDetails = async () => {
    try {
        if (os.platform() === 'win32') return null;

        const {
            stdout
        } = await execAsync('df -h --output=source,size,used,avail,pcent,target');
        const lines = stdout.trim().split('\n').slice(1);

        const relevant = lines.filter(line => {
            const raw = line.trim();
            // FILTER: HANYA TAMPILKAN /dev/loop DAN / (root)
            return (raw.includes('/dev/loop') || raw.endsWith(' /')) &&
                !raw.includes('tmpfs') &&
                !raw.includes('udev') &&
                !raw.includes('shm');
        }).map(line => {
            const parts = line.trim().split(/\s+/).filter(Boolean);

            if (parts.length < 6) return null;

            const percentStr = parts[4].replace('%', '');
            return {
                source: parts[0],
                total: parts[1],
                used: parts[2],
                avail: parts[3],
                percent: parseFloat(percentStr),
                raw_percent: parts[4],
                mount: parts[5]
            };
        }).filter(d => d !== null);

        return relevant.length ? relevant : null;
    } catch (e) {
        return null;
    }
};

/** Ambil Info Memory (Termasuk Swap jika ada) */
const getMemoryDetails = async () => {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;

    let swap = {
        total: 0,
        used: 0,
        free: 0
    };

    if (os.platform() === 'linux') {
        try {
            const {
                stdout
            } = await execAsync('free -b');
            const swapLine = stdout.split('\n').find(l => l.includes('Swap:'));
            if (swapLine) {
                const parts = swapLine.trim().split(/\s+/);
                swap = {
                    total: parseInt(parts[1]),
                    used: parseInt(parts[2]),
                    free: parseInt(parts[3])
                };
            }
        } catch {}
    }

    const ram_percent = (used / total) * 100;
    const swap_percent = swap.total ? (swap.used / swap.total) * 100 : 0;

    return {
        ram: {
            total: formatSize(total),
            used: formatSize(used),
            free: formatSize(free),
            percent: ram_percent.toFixed(1),
            bar: createProgressBar(ram_percent, 18)
        },
        swap: {
            total: formatSize(swap.total),
            used: formatSize(swap.used),
            percent: swap_percent.toFixed(1),
            bar: createProgressBar(swap_percent, 18)
        }
    };
};

/** Ambil Informasi Network Interface */
const getNetworkInfo = () => {
    const interfaces = os.networkInterfaces();
    let info = [];

    for (const name in interfaces) {
        if (name === 'lo') continue;

        const iface = interfaces[name].find(details => details.family === 'IPv4' && !details.internal);
        if (iface) {
            info.push({
                name: name,
                address: iface.address
            });
        }
    }
    return info.length ? info : null;
};

// ==================== 🚀 MAIN HANDLER ====================

const handler = async (m, {
    conn
}) => {
    const timestamp = performance();

    // Pesan Loading
    const {
        key
    } = await conn.sendMessage(m.chat, {
        text: '⚙️ _Gathering basic system telemetry..._'
    }, {
        quoted: m
    });

    try {
        // Eksekusi semua task secara paralel
        const results = await Promise.allSettled([
            getOSRelease(),
            getDiskDetails(),
            getMemoryDetails(),
            getCPUDetails(),
            getHardwareInfoBasic(),
            getNetworkInfo()
        ]);

        // Helper untuk ambil hasil promise
        const unwrap = (index, fallback) =>
            results[index].status === 'fulfilled' ? results[index].value : fallback;

        const osName = unwrap(0, os.type());
        const disks = unwrap(1, null);
        const mem = unwrap(2, {
            ram: {},
            swap: {}
        });
        const cpu = unwrap(3, getCPUDetails());
        const hwInfo = unwrap(4, getHardwareInfoBasic());
        const netInfo = unwrap(5, null);

        // Hitung Uptime & Latency
        const uptime = formatDuration(os.uptime());
        const botUptime = formatDuration(process.uptime());
        const latency = (performance() - timestamp).toFixed(2);
        const loadAvg = os.loadavg().map(v => v.toFixed(2)).join(' | ');

        // Cek apakah jalan di PM2
        const isPM2 = process.env.PM2_HOME ? 'Yes (PM2)' : 'No (Native)';

        // ==================== 🎨 BUILD DISPLAY ====================

        let text = `
╭───「 🌐 *SYSTEM OVERVIEW* 」
│
│ ⏱️ *Server Time:* ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })}
│ 🚀 *Latency:* ${latency} ms
│ ⏳ *OS Uptime:* ${uptime}
│
├──「 💻 *OS & ENGINE* 」
│ 💿 *System:* ${osName}
│ 🏗️ *Kernel:* ${os.release()}
│ ⚡ *NodeJS:* ${process.version}
│ ⚙️ *Manager:* ${isPM2}
│
├──「 🧠 *CPU INFO* 」
│ 🦾 *Model:* ${cpu.model}
│ 📊 *Cores:* ${cpu.cores} Core(s)
│ 🏎️ *Speed:* ${cpu.speed}
│ 🛠️ *Cache L3:* ${cpu.cacheSize}
│ 📈 *Load (1/5/15):* ${loadAvg}
│
├──「 💾 *MEMORY (RAM)* 」
│ 🏷️ *Type:* ${hwInfo.ramType}
│ 📦 *Total:* ${mem.ram.total}
│ 
│ ${mem.ram.bar} ${mem.ram.percent}% Used
│ 
│ 📉 *Used:* ${mem.ram.used}
│ 🆓 *Free:* ${mem.ram.free}
│
├──「 🔄 *SWAP* 」
│ 📦 *Total:* ${mem.swap.total}
│ 
│ ${mem.swap.bar} ${mem.swap.percent}% Used
│ 
│ 📉 *Used:* ${mem.swap.used}
│
├──「 💿 *DISK & STORAGE* 」
│ 🏷️ *Technology:* ${hwInfo.diskInfo.type}
│ 🛡️ *RAID:* ${hwInfo.diskInfo.raid}\n`;

        if (disks && disks.length > 0) {
            disks.forEach(d => {
                const bar = createProgressBar(d.percent, 18);
                text += `│ 📂 *${d.mount}* [${d.source}]\n`;
                text += `│ ${bar} ${d.raw_percent} Used\n`;
                text += `│ └ ${d.used} / ${d.total} (Avail: ${d.avail})\n`;
            });
        } else {
            text += `│ ⚠️ Disk utama tidak terdeteksi oleh filter. (Hanya Root & Loop)\n`;
        }

        text += `
├──「 🔌 *NETWORK INFO* 」\n`;
        if (netInfo && netInfo.length > 0) {
            netInfo.forEach(n => {
                text += `│ 📡 *${n.name}*\n`;
                text += `│ └ IPv4: ${n.address}\n`;
            });
        } else {
            text += `│ ⚠️ Interface non-local tidak terdeteksi\n`;
        }


        text += `
├──「 📦 *BOT RESOURCE* 」
│ 🧠 *Process RAM:* ${formatSize(process.memoryUsage().rss)}
│ ⏱️ *Bot Active:* ${botUptime}
│
╰─────────────────────────`;

        // Kirim Hasil
        await conn.sendMessage(m.chat, {
            text: text.trim(),
            edit: key
        }, {
            quoted: m
        });

    } catch (e) {
        console.error(e);
        await conn.sendMessage(m.chat, {
            text: `❌ *System Error:*\n${e.message}`,
            edit: key
        }, {
            quoted: m
        });
    }
};

// ==================== 📦 COMMAND EXPORT ====================

handler.command = ['os', 'system', 'info', 'status', 'cpu'];
handler.category = 'info';
handler.description = 'Displays detailed system and server status information, including OS, CPU, RAM, and disk usage.';
handler.help = ['os'];

export default handler;