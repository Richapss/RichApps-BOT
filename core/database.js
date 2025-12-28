import fs from "node:fs";
import path from "node:path";

class Database {
    #data;

    constructor(filename) {
        this.databaseFile = path.join(process.cwd(), filename);
        this.#data = {};
    }

    default = () => ({
        user: {},
        group: {},
        settings: {
            self: false,
            online: true,
            lastReset: new Date().toISOString().split('T')[0],
        },
        owner: [],
    });

    init = async () => {
        const data = await this.read();
        this.#data = { ...this.default(), ...data };
        if (!this.#data.settings) this.#data.settings = this.default().settings;
        if (!this.#data.owner) this.#data.owner = this.default().owner;
        await this.save();
        return this.#data;
    };

    read = async () => {
        if (fs.existsSync(this.databaseFile)) {
            const data = fs.readFileSync(this.databaseFile, "utf-8");
            try {
                return JSON.parse(data);
            } catch (e) {
                console.error("Database korup, membuat backup dan memulai ulang...", e);
                fs.copyFileSync(this.databaseFile, `${this.databaseFile}.${Date.now()}.corrupt.bak`);
                return this.default();
            }
        } else {
            return this.default();
        }
    };

    save = async () => {
        try {
            const jsonData = JSON.stringify(this.#data, null, 2);
            fs.writeFileSync(this.databaseFile, jsonData, "utf-8");
        } catch (e) {
            console.error("Gagal menyimpan database:", e);
            const backupFile = `${this.databaseFile}.${Date.now()}.bak`;
            const jsonData = JSON.stringify(this.#data, null, 2);
            fs.writeFileSync(backupFile, jsonData, "utf-8");
            console.error(`Database saat ini berhasil dibackup ke ${backupFile}`);
        }
    };

    reset = async () => {
        this.#data = this.default();
        await this.save();
    };

    add = async (type, id, newData) => {
        if (!this.#data[type]) return `- Tipe data ${type} tidak ditemukan!`;
        if (!this.#data[type][id]) {
            this.#data[type][id] = newData;
        }
        await this.save();
        return this.#data[type][id];
    };

    delete = async (type, id) => {
        if (this.#data[type] && this.#data[type][id]) {
            delete this.#data[type][id];
            await this.save();
            return `- ${type} dengan ID ${id} telah dihapus.`;
        } else {
            return `- ${type} dengan ID ${id} tidak ditemukan!`;
        }
    };

    get = (type, id) => {
        if (this.#data[type] && this.#data[type][id]) {
            return this.#data[type][id];
        } else {
            return null;
        }
    };

    // method untuk mengubah banchat per grup
    setBanchat = async (groupId, value) => {
        if (!this.#data.group[groupId]) this.#data.group[groupId] = {};
        this.#data.group[groupId].banchat = value;
        await this.save();
        return this.#data.group[groupId];
    };

    // method untuk mendapatkan status banchat per grup
    getBanchat = (groupId) => {
        const group = this.get("group", groupId) || {};
        return typeof group.banchat !== "undefined" ? group.banchat : false;
    };

    main = async (m) => {
        await this.read();

        if (m?.isGroup) {
            const groupData = this.get('group', m.from) || {};
            await this.add("group", m.from, {
                ...groupData,
                mute: groupData.mute || false,
                sewa: groupData.sewa || { status: false, expired: 0 },
                antilink: typeof groupData.antilink !== 'undefined' ? groupData.antilink : false,
                welcome: typeof groupData.welcome !== 'undefined' ? groupData.welcome : false,
                detect: typeof groupData.detect !== 'undefined' ? groupData.detect : false,
                warnings: groupData.warnings || {},
                banchat: typeof groupData.banchat !== 'undefined' ? groupData.banchat : false,
            });
        }

        const userData = this.get('user', m.jid) || {};
        await this.add("user", m.jid, {
            ...userData,
            name: m.name || userData.name || 'User',
            limit: typeof userData.limit !== 'undefined' ? userData.limit : 100,
            register: userData.register || false,
            owner: userData.owner || false,
            premium: userData.premium || { status: false, expired: 0 },
            banned: userData.banned || { status: false, expired: 0 },
            saldo: typeof userData.saldo !== 'undefined' ? userData.saldo : 0
        });

        return this.list();
    };

    list = () => this.#data;
}

export default Database;