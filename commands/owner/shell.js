import {
    spawn
} from "child_process";
import util from "util";

const handler = async (m, {
    conn,
    args
}) => {
    const command = (args || []).join(" ").trim();
    if (!command) return m.reply("Masukkan command untuk dijalankan.");
    const commandParts = command.split(" ");
    const cmdName = commandParts[0];
    const cmdArgs = commandParts.slice(1);
    if (!cmdName)
        return m.reply("Invalid command.");
    const execProcess = spawn(cmdName, cmdArgs, {
        cwd: process.cwd(),
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    execProcess.stdout.on("data", (data) => {
        stdout += data.toString();
    });
    execProcess.stderr.on("data", (data) => {
        stderr += data.toString();
    });
    const timeout = setTimeout(() => {
        execProcess.kill("SIGTERM");
        stderr += "\n[!] Command terminated: terlalu lama dijalankan.";
    }, 15000);
    execProcess.on("close", (code) => {
        clearTimeout(timeout);
        let output = "";
        if (code === 0 && stdout.trim()) {
            output = stdout.trim();
        } else if (stderr.trim()) {
            output = stderr.trim();
        } else {
            output = "No output.";
        }
        m.reply("```" + output + "```");
    });
    execProcess.on("error", (err) => {
        clearTimeout(timeout);
        m.reply("Error menjalankan command:\\n```" + err.message + "```");
    });
}
handler.command = handler.help = ["exec", "$"];
handler.tags = ["owner"];
handler.owner = true;
handler.description =
    "Untuk jakankan kode shell";

export default handler