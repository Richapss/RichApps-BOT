import {
    exec
} from 'child_process';
import util from 'util';
import stripAnsi from 'strip-ansi'; // untuk menghapus kode warna ANSI

const execPromise = util.promisify(exec);

const handler = async (m, {
    text,
    usedPrefix,
    command
}) => {
    if (!text) {
        let helpText = `*PM2 Process Manager*\n\n`;
        helpText += `This command allows you to manage PM2 processes directly.\n\n`;
        helpText += `*Usage:*\n${usedPrefix + command} <action> [process_name|id|all]\n\n`;
        helpText += `*Examples:*\n`;
        helpText += `  • ${usedPrefix + command} list\n`;
        helpText += `  • ${usedPrefix + command} restart all\n`;
        helpText += `  • ${usedPrefix + command} stop 0\n`;
        helpText += `  • ${usedPrefix + command} logs bot --lines 15\n\n`;
        helpText += `*Common Actions:*\n`;
        helpText += `  list, restart, stop, reload, delete, logs, flush, monit`;

        return m.reply(helpText);
    }

    await m.reply(`Executing: \`pm2 ${text}\`...`);

    try {
        // Menambahkan flag --no-color untuk mencegah ANSI codes
        const {
            stdout,
            stderr
        } = await execPromise(`pm2 ${text} --no-color`);
        let output = '';

        if (stdout) {
            output += `*✅ STDOUT:*\n\`\`\`\n${stripAnsi(stdout.trim())}\n\`\`\``;
        }

        if (stderr) {
            output += `\n\n*⚠️ STDERR:*\n\`\`\`\n${stripAnsi(stderr.trim())}\n\`\`\``;
        }

        if (!stdout && !stderr) {
            output = `*✅ Command \`pm2 ${text}\` executed successfully with no output.*`;
        }

        await m.reply(output.trim());
    } catch (e) {
        const errorMessage = e.stderr || e.stdout || e.message;
        await m.reply(`*❌ Command Failed:*\n\`\`\`\n${stripAnsi(errorMessage.trim())}\n\`\`\``);
    }
};

handler.help = ['pm2 <action>'];
handler.command = /^pm2$/i;
handler.tags = ['owner'];
handler.description = 'Manage PM2 process manager.';
handler.owner = true;

export default handler;