const {
    createCanvas,
    registerFont
} = require('canvas');
const {
    performance
} = require("perf_hooks");
const os = require("os");
const {
    execSync
} = require("child_process");

const THEME = {
    bg: "#0f1419",
    bgSecondary: "#1a1f2e",
    card: "#1e2433",
    cardHover: "#252b3d",
    primary: "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    purple: "#8b5cf6",
    cyan: "#06b6d4",
    pink: "#ec4899",
    textPrimary: "#f1f5f9",
    textSecondary: "#94a3b8",
    textTertiary: "#64748b",
    border: "#2d3548",
    glow: "rgba(59, 130, 246, 0.2)"
};

const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};

const formatTime = (seconds) => {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
};

function drawBackground(ctx, w, h) {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, THEME.bg);
    gradient.addColorStop(0.5, THEME.bgSecondary);
    gradient.addColorStop(1, THEME.bg);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 0.02;
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const size = Math.random() * 2;
        ctx.fillStyle = THEME.textPrimary;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = THEME.border;
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 50) {
        ctx.globalAlpha = 0.03;
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();
    }
    for (let i = 0; i < h; i += 50) {
        ctx.globalAlpha = 0.03;
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(w, i);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

function drawCard(ctx, x, y, w, h, radius) {
    ctx.save();
    ctx.shadowColor = THEME.glow;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = THEME.card;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = THEME.border;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}

function drawIcon(ctx, x, y, type, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (type) {
        case 'cpu':
            ctx.strokeRect(x - 12, y - 12, 24, 24);
            ctx.fillRect(x - 6, y - 6, 12, 12);
            ctx.beginPath();
            ctx.moveTo(x - 12, y - 8);
            ctx.lineTo(x - 16, y - 8);
            ctx.moveTo(x - 12, y);
            ctx.lineTo(x - 16, y);
            ctx.moveTo(x - 12, y + 8);
            ctx.lineTo(x - 16, y + 8);
            ctx.moveTo(x + 12, y - 8);
            ctx.lineTo(x + 16, y - 8);
            ctx.moveTo(x + 12, y);
            ctx.lineTo(x + 16, y);
            ctx.moveTo(x + 12, y + 8);
            ctx.lineTo(x + 16, y + 8);
            ctx.stroke();
            break;
        case 'memory':
            for (let i = 0; i < 4; i++) {
                ctx.strokeRect(x - 10 + i * 6, y - 12, 5, 24);
            }
            break;
        case 'disk':
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'network':
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y - 8);
            ctx.lineTo(x, y + 8);
            ctx.moveTo(x - 8, y);
            ctx.lineTo(x + 8, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x - 6, y - 6, 2, 0, Math.PI * 2);
            ctx.arc(x + 6, y - 6, 2, 0, Math.PI * 2);
            ctx.arc(x - 6, y + 6, 2, 0, Math.PI * 2);
            ctx.arc(x + 6, y + 6, 2, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'server':
            for (let i = 0; i < 3; i++) {
                ctx.strokeRect(x - 12, y - 10 + i * 8, 24, 6);
                ctx.beginPath();
                ctx.arc(x + 8, y - 7 + i * 8, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'clock':
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y - 8);
            ctx.moveTo(x, y);
            ctx.lineTo(x + 6, y);
            ctx.stroke();
            break;
    }
    ctx.restore();
}

function drawLogo(ctx, x, y, size) {
    ctx.save();
    const gradient = ctx.createLinearGradient(x - size, y - size, x + size, y + size);
    gradient.addColorStop(0, THEME.primary);
    gradient.addColorStop(0.5, THEME.cyan);
    gradient.addColorStop(1, THEME.purple);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - size / 2, y);
    ctx.lineTo(x, y - size / 2);
    ctx.lineTo(x + size / 2, y);
    ctx.lineTo(x, y + size / 2);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
}

function drawDonutChart(ctx, x, y, radius, lineWidth, percent, color) {
    ctx.save();
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = THEME.bgSecondary;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * (percent / 100));

    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.arc(x, y, radius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = THEME.textPrimary;
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(percent)}%`, x, y);

    ctx.restore();
}

function drawProgressBar(ctx, x, y, w, h, percent, color, label, value) {
    ctx.fillStyle = THEME.bgSecondary;
    ctx.fillRect(x, y, w, h);

    const gradient = ctx.createLinearGradient(x, y, x + w, y);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color + 'aa');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w * (percent / 100), h);

    ctx.strokeStyle = THEME.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = THEME.textSecondary;
    ctx.font = "11px Arial";
    ctx.textAlign = "left";
    ctx.fillText(label, x, y - 6);

    ctx.fillStyle = THEME.textPrimary;
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "right";
    ctx.fillText(value, x + w, y - 6);
}

function drawStatBox(ctx, x, y, w, h, label, value, color, iconType) {
    drawCard(ctx, x, y, w, h, 12);

    drawIcon(ctx, x + 28, y + 28, iconType, color);

    ctx.fillStyle = THEME.textSecondary;
    ctx.font = "11px Arial";
    ctx.textAlign = "left";
    ctx.fillText(label, x + 50, y + 22);

    ctx.fillStyle = THEME.textPrimary;
    ctx.font = "bold 16px Arial";
    ctx.fillText(value, x + 50, y + 40);
}

async function renderDashboard(stats) {
    const W = 1200;
    const H = 800;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    drawBackground(ctx, W, H);

    drawLogo(ctx, 60, 50, 20);

    ctx.fillStyle = THEME.textPrimary;
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`${global.botname} MONITOR`, 100, 58);

    ctx.fillStyle = THEME.textSecondary;
    ctx.font = "13px Arial";
    ctx.fillText("Real-time Performance Dashboard", 100, 80);

    const pingStatus = stats.ping < 100 ? THEME.success : stats.ping < 300 ? THEME.warning : THEME.danger;
    ctx.fillStyle = pingStatus;
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`${stats.ping}ms`, W - 50, 50);
    ctx.fillStyle = THEME.textSecondary;
    ctx.font = "12px Arial";
    ctx.fillText("LATENCY", W - 50, 70);

    const gradient = ctx.createLinearGradient(50, 100, W - 50, 100);
    gradient.addColorStop(0, THEME.primary);
    gradient.addColorStop(0.33, THEME.success);
    gradient.addColorStop(0.66, THEME.purple);
    gradient.addColorStop(1, THEME.cyan);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 100);
    ctx.lineTo(W - 50, 100);
    ctx.stroke();

    const mainY = 130;
    const cardW = 260;
    const cardH = 240;
    const gap = 30;

    const x1 = 50;
    const x2 = x1 + cardW + gap;
    const x3 = x2 + cardW + gap;
    const x4 = x3 + cardW + gap;

    drawCard(ctx, x1, mainY, cardW, cardH, 15);
    drawIcon(ctx, x1 + 30, mainY + 35, 'cpu', THEME.primary);
    ctx.fillStyle = THEME.textPrimary;
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "left";
    ctx.fillText("CPU USAGE", x1 + 55, mainY + 40);
    ctx.fillStyle = THEME.textSecondary;
    ctx.font = "11px Arial";
    ctx.fillText(`${stats.cpuCores} Cores @ ${stats.cpuSpeed} MHz`, x1 + 55, mainY + 58);
    drawDonutChart(ctx, x1 + cardW / 2, mainY + 140, 50, 12, stats.cpuLoad, THEME.primary);
    ctx.fillStyle = THEME.textTertiary;
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(stats.cpuModel.substring(0, 32), x1 + cardW / 2, mainY + 215);

    drawCard(ctx, x2, mainY, cardW, cardH, 15);
    drawIcon(ctx, x2 + 30, mainY + 35, 'memory', THEME.success);
    ctx.fillStyle = THEME.textPrimary;
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "left";
    ctx.fillText("MEMORY", x2 + 55, mainY + 40);
    ctx.fillStyle = THEME.textSecondary;
    ctx.font = "11px Arial";
    ctx.fillText(`Total: ${formatSize(stats.ramTotal)}`, x2 + 55, mainY + 58);
    const ramPercent = (stats.ramUsed / stats.ramTotal) * 100;
    drawDonutChart(ctx, x2 + cardW / 2, mainY + 140, 50, 12, ramPercent, THEME.success);
    ctx.fillStyle = THEME.textTertiary;
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${formatSize(stats.ramUsed)} Used`, x2 + cardW / 2, mainY + 205);
    ctx.fillText(`${formatSize(stats.ramTotal - stats.ramUsed)} Free`, x2 + cardW / 2, mainY + 220);

    drawCard(ctx, x3, mainY, cardW, cardH, 15);
    drawIcon(ctx, x3 + 30, mainY + 35, 'disk', THEME.purple);
    ctx.fillStyle = THEME.textPrimary;
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "left";
    ctx.fillText("STORAGE", x3 + 55, mainY + 40);
    ctx.fillStyle = THEME.textSecondary;
    ctx.font = "11px Arial";
    ctx.fillText(`Total: ${formatSize(stats.diskTotal)}`, x3 + 55, mainY + 58);
    let diskPercent = stats.diskTotal > 0 ? (stats.diskUsed / stats.diskTotal) * 100 : 0;
    drawDonutChart(ctx, x3 + cardW / 2, mainY + 140, 50, 12, diskPercent, THEME.purple);
    ctx.fillStyle = THEME.textTertiary;
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${formatSize(stats.diskUsed)} Used`, x3 + cardW / 2, mainY + 205);
    ctx.fillText(`${formatSize(stats.diskTotal - stats.diskUsed)} Free`, x3 + cardW / 2, mainY + 220);

    drawCard(ctx, x4, mainY, cardW, cardH, 15);
    drawIcon(ctx, x4 + 30, mainY + 35, 'network', THEME.cyan);
    ctx.fillStyle = THEME.textPrimary;
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "left";
    ctx.fillText("NETWORK", x4 + 55, mainY + 40);
    ctx.fillStyle = THEME.textSecondary;
    ctx.font = "11px Arial";
    ctx.fillText(`Interface: ${stats.networkInterface}`, x4 + 55, mainY + 58);

    ctx.fillStyle = THEME.textPrimary;
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "left";
    ctx.fillText("RX (Download)", x4 + 30, mainY + 95);
    ctx.fillStyle = THEME.cyan;
    ctx.font = "bold 20px Arial";
    ctx.fillText(formatSize(stats.networkRx), x4 + 30, mainY + 120);

    ctx.fillStyle = THEME.textPrimary;
    ctx.font = "bold 13px Arial";
    ctx.fillText("TX (Upload)", x4 + 30, mainY + 155);
    ctx.fillStyle = THEME.pink;
    ctx.font = "bold 20px Arial";
    ctx.fillText(formatSize(stats.networkTx), x4 + 30, mainY + 180);

    ctx.fillStyle = THEME.textTertiary;
    ctx.font = "10px Arial";
    ctx.textAlign = "center";

    const statsY = 400;
    const statW = 175;
    const statH = 70;
    const statGap = 20;

    drawStatBox(ctx, 50, statsY, statW, statH, "HOSTNAME", stats.hostname.substring(0, 15), THEME.primary, 'server');
    drawStatBox(ctx, 50 + (statW + statGap), statsY, statW, statH, "PLATFORM", `${stats.platform} (${stats.arch})`, THEME.success, 'server');
    drawStatBox(ctx, 50 + (statW + statGap) * 2, statsY, statW, statH, "BOT UPTIME", stats.uptimeBot, THEME.purple, 'clock');
    drawStatBox(ctx, 50 + (statW + statGap) * 3, statsY, statW, statH, "SERVER UPTIME", stats.uptimeServer, THEME.warning, 'clock');
    drawStatBox(ctx, 50 + (statW + statGap) * 4, statsY, statW, statH, "NODE.JS", stats.nodeVersion, THEME.cyan, 'server');

    const perfY = 500;
    const perfH = 250;
    const perfW = W - 100;

    drawCard(ctx, 50, perfY, perfW, perfH, 15);

    ctx.fillStyle = THEME.textPrimary;
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "left";
    ctx.fillText("SYSTEM PERFORMANCE", 75, perfY + 35);

    ctx.fillStyle = THEME.textSecondary;
    ctx.font = "12px Arial";
    ctx.fillText("Real-time resource monitoring", 75, perfY + 55);

    const barY = perfY + 85;
    const barW = 500;
    const barH = 18;
    const barGap = 35;

    drawProgressBar(ctx, 75, barY, barW, barH, stats.cpuLoad, THEME.primary,
        "CPU Load", `${stats.cpuLoad}%`);
    drawProgressBar(ctx, 75, barY + barGap, barW, barH, ramPercent, THEME.success,
        "Memory Usage", `${Math.round(ramPercent)}%`);
    drawProgressBar(ctx, 75, barY + barGap * 2, barW, barH, diskPercent, THEME.purple,
        "Disk Usage", `${Math.round(diskPercent)}%`);
    drawProgressBar(ctx, 75, barY + barGap * 3, barW, barH,
        Math.min(100, (stats.ping / 500) * 100), pingStatus,
        "Network Latency", `${stats.ping}ms`);

    const infoX = 620;
    const infoStartY = perfY + 85;
    const infoLineHeight = 28;
    let infoY = infoStartY;

    ctx.font = "13px Arial";
    ctx.textAlign = "left";

    const drawInfoLine = (label, value) => {
        ctx.fillStyle = THEME.textSecondary;
        ctx.fillText(label, infoX, infoY);
        ctx.fillStyle = THEME.textPrimary;
        ctx.font = "bold 13px Arial";
        ctx.fillText(value, infoX + 150, infoY);
        ctx.font = "13px Arial";
        infoY += infoLineHeight;
    };

    drawInfoLine("OS Release", stats.release);
    drawInfoLine("CPU Cores", `${stats.cpuCores} Cores`);
    drawInfoLine("CPU Speed", `${stats.cpuSpeed} MHz`);
    drawInfoLine("Total Memory", formatSize(stats.ramTotal));
    drawInfoLine("Free Memory", formatSize(stats.ramTotal - stats.ramUsed));

    ctx.fillStyle = THEME.textTertiary;
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`Dashboard Generated: ${new Date().toLocaleString()}`, W / 2, H - 20);

    return canvas.toBuffer('image/png');
}

function getNetworkStats() {
    try {
        const interfaces = os.networkInterfaces();
        let totalRx = 0;
        let totalTx = 0;
        let activeInterface = 'N/A';
        let ip = 'N/A';

        for (const [name, addrs] of Object.entries(interfaces)) {
            if (name.toLowerCase().includes('lo')) continue;

            for (const addr of addrs) {
                if (addr.family === 'IPv4' && !addr.internal) {
                    activeInterface = name;
                    ip = addr.address;
                    break;
                }
            }
        }

        try {
            const netstat = execSync("cat /proc/net/dev 2>/dev/null || echo ''").toString();
            const lines = netstat.split('\n');

            for (const line of lines) {
                if (line.includes(':') && !line.includes('lo:')) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 10) {
                        totalRx += parseInt(parts[1]) || 0;
                        totalTx += parseInt(parts[9]) || 0;
                    }
                }
            }
        } catch (e) {}

        return {
            totalRx,
            totalTx,
            activeInterface,
            ip
        };
    } catch (e) {
        return {
            totalRx: 0,
            totalTx: 0,
            activeInterface: 'N/A',
            ip: 'N/A'
        };
    }
}

let handler = async (m, {
    conn
}) => {
    try {
        const loadingMsg = await m.reply("Generating dashboard...");

        const start = performance.now();
        await new Promise(resolve => setTimeout(resolve, 10));
        const end = performance.now();
        const latency = (end - start).toFixed(2);

        const cpus = os.cpus();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const loadAvg = os.loadavg();
        const cpuPercent = Math.min(100, (loadAvg[0] * 100) / cpus.length).toFixed(1);

        let diskTotal = 0,
            diskUsed = 0;
        try {
            const df = execSync("df -k --output=size,used / 2>/dev/null").toString();
            const lines = df.trim().split("\n");
            if (lines.length > 1) {
                const [total, used] = lines[1].trim().split(/\s+/).map(Number);
                diskTotal = total * 1024;
                diskUsed = used * 1024;
            }
        } catch (e) {}

        const networkStats = getNetworkStats();

        const stats = {
            ping: latency,
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
            nodeVersion: process.version,
            uptimeBot: formatTime(process.uptime()),
            uptimeServer: formatTime(os.uptime()),
            cpuModel: cpus[0].model.trim(),
            cpuSpeed: cpus[0].speed,
            cpuCores: cpus.length,
            cpuLoad: cpuPercent,
            ramTotal: totalMem,
            ramUsed: totalMem - freeMem,
            diskTotal: diskTotal,
            diskUsed: diskUsed,
            networkRx: networkStats.totalRx,
            networkTx: networkStats.totalTx,
            networkInterface: networkStats.activeInterface,
            networkIP: networkStats.ip
        };

        const imageBuffer = await renderDashboard(stats);

        await conn.sendMessage(m.chat, {
            image: imageBuffer,
            caption: `*SYSTEM DASHBOARD*\n\n` +
                `Latency: ${latency}ms\n` +
                `CPU: ${stats.cpuLoad}%\n` +
                `RAM: ${formatSize(stats.ramUsed)} / ${formatSize(stats.ramTotal)}\n` +
                `Disk: ${formatSize(stats.diskUsed)} / ${formatSize(stats.diskTotal)}\n` +
                `Network: ↓${formatSize(stats.networkRx)} ↑${formatSize(stats.networkTx)}`
        }, {
            quoted: m
        });

        await conn.sendMessage(m.chat, {
            delete: loadingMsg.key
        });

    } catch (e) {
        console.error(e);
        m.reply(`Error: ${e.message}`);
    }
};

handler.help = ["ping"];
handler.tags = ["info"];
handler.command = ["ping"];

module.exports = handler