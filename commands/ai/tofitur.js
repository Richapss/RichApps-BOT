import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(global.googleAiApiKey);

function detectPluginType(code) {
    if (/export\s+default\s+handler/.test(code)) return "esm";
    if (/module\.exports\s*=\s*handler/.test(code)) return "cjs";
    if (/case\s+['"`]/.test(code)) return "case";
    return "scrape";
}

function buildEnglishPrompt(sourceCode, targetType) {
    const inputType = detectPluginType(sourceCode);
    const targetFormat = targetType.toUpperCase();

    let taskInstruction = "";

    if (inputType === "scrape") {
        if (targetFormat === "CASE") {
            taskInstruction = `
You are an expert developer for WhatsApp bots. Your task is to wrap the given code into a complete WhatsApp bot CASE handler:
- Create a proper case block: case "<command>": { /* code */ break }
- Generate a suitable command name for the case
- Use conn.sendMessage or m.reply to send output
- Do not modify the core logic of the code
- Ensure it is ready for use in a WhatsApp bot switch-case`;
        } else {
            taskInstruction = `
You are an expert developer for WhatsApp bots. Your task is to wrap the given code into a complete WhatsApp bot ${targetFormat} plugin:
- Add necessary handler structure with handler.command, handler.category, handler.description
- Generate suitable values for these properties
- Do not modify the core logic of the code
- Ensure it is ready for use in a WhatsApp bot`;
        }
    } else {
        taskInstruction = `
You are an expert code converter for WhatsApp bots. Your task is to convert the provided bot code into ${targetFormat} format:
- Do not change the logic, variables, or functions
- Only adjust the module system (imports/exports/handler structure) as needed
- Ensure it matches the WhatsApp bot feature format`;
    }

    return `
${taskInstruction}

**Rules:**
1. ONLY return raw code. No explanations, no markdown, no code fences.
2. If you can't generate valid code, respond with JSON: { "success": false, "message": "Your explanation." }

**Source Code:**
${sourceCode}

Now return the converted code or JSON error.
`;
}

const handler = async (m, { conn, args }) => {
    if (!global.googleAiApiKey || global.googleAiApiKey === "YOUR_API_KEY_HERE") {
        return m.reply("API Key untuk Google AI belum diatur di file settings.js.");
    }

    const targetType = (args[0] || "").toLowerCase();
    const validFormats = ["esm", "cjs", "case"];

    if (!validFormats.includes(targetType)) {
        return m.reply(
            `⚡ *TOFITUR INSTRUKSI*\n\nGunakan: .tofitur <format> <kode>\nAtau reply pesan berisi kode dengan: .tofitur <format>\n\n📌 *Format target yang didukung:*\n- esm → plugin ESM\n- cjs → plugin CommonJS\n- case → case handler\n\n📌 *Contoh:*\n.tofitur esm const axios = require("axios");\n.tofitur cjs import fetch from "node-fetch";\n.tofitur case const crypto = require("crypto");`
        );
    }

    const sourceCode =
        args.slice(1).join(" ") || (m.quoted && m.quoted.text);

    if (!sourceCode) {
        return m.reply("Silakan sertakan kode atau reply pesan berisi kode.");
    }

    await m.reply(
        `Mengonversi kode ke format *${targetType.toUpperCase()}*...`
    );

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
        });

        const prompt = buildEnglishPrompt(sourceCode, targetType);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let textResult = response.text();

        if (textResult.trim().startsWith("{")) {
            try {
                const errorJson = JSON.parse(textResult);
                if (errorJson.success === false) {
                    return m.reply(
                        `*Konversi Gagal:*\n${errorJson.message}`
                    );
                }
            } catch {
                // ignore
            }
        }

        const cleanResult = textResult
            .replace(/```[\w]*\n?/g, "")
            .replace(/```/g, "")
            .trim();

        await conn.sendMessage(
            m.chat,
            { text: cleanResult },
            { quoted: m }
        );
    } catch (err) {
        console.error("ToFitur AI Error:", err);
        await conn.sendMessage(
            m.chat,
            { text: `❌ Konversi gagal: ${err.message}` },
            { quoted: m }
        );
    }
};

handler.command = ["tofitur"];
handler.tags = "ai";
handler.description = "Ubah kode scrape/API jadi plugin/case bot otomatis.";
handler.owner = true;

export default handler;