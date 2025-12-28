import {
  readdirSync
} from "node:fs";
import {
  resolve,
  join
} from "node:path";
import chokidar from "chokidar";
import {
  pathToFileURL
} from "node:url";
import {
  createRequire
} from "node:module";

const require = createRequire(
  import.meta.url);

/**

 * Mengimpor modul ESM dengan cache-busting untuk pembaruan.

 * @param {string} modulePath Path ke modul.

 * @returns {Promise<any>}

 */

export async function importModule(modulePath) {

  const moduleURL = pathToFileURL(modulePath).href + `?t=${Date.now()}`;

  try {

    const module_ = await import(moduleURL);

    return module_ && "default" in module_ ? module_.default : module_;

  } catch (error) {

    console.error(`[!] Gagal mengimpor modul ${modulePath}:`, error.message);

    throw error;

  }

}

class PluginsLoad {

  constructor(directory) {

    if (!directory) throw new Error("Direktori plugin harus ditentukan!");

    this.directory = resolve(directory);

    this.plugins = {};

    this.watcher = null;

  }

  /**

   * Memindai direktori plugin secara rekursif.

   * @param {string} dir Direktori yang akan dipindai.

   */

  async scan(dir = this.directory) {

    try {

      const items = readdirSync(dir, {
        withFileTypes: true
      });

      for (const item of items) {

        const p = join(dir, item.name);

        if (item.isDirectory()) {

          await this.scan(p);

        } else if (item.isFile() && (p.endsWith(".js") || p.endsWith(".cjs"))) {

          await this.add(p);

        }

      }

    } catch (error) {

      console.error(`[!] Gagal memindai direktori ${dir}:`, error.message);

    }

  }

  /**

   * Menambahkan atau memperbarui plugin dari path file.

   * @param {string} p Path ke file plugin.

   * @returns {Promise<object|null>}

   */

  async add(p) {

    try {

      const pluginPath = resolve(p);

      let data;

      if (pluginPath.endsWith(".cjs")) {

        if (require.cache[pluginPath]) {

          delete require.cache[pluginPath];

        }

        data = require(pluginPath);
        if (data) {
          data.type = "commojs";
        }

      } else {

        data = await importModule(pluginPath);

      }

      if (typeof data !== "function" && typeof data !== "object") {

        console.warn(`[!] Plugin di ${pluginPath} tidak mengekspor format yang valid.`);

        return null;

      }

      this.plugins[pluginPath] = data;

      return data;

    } catch (error) {

      delete this.plugins[resolve(p)];

      console.error(`[-] GAGAL MEMUAT PLUGIN: ${p}\n`, error);

      return null;

    }

  }

  /**

   * Memuat semua plugin dan memulai watcher untuk hot-reloading.

   */

  async load() {

    this.plugins = {}; // Kosongkan plugin sebelum memuat ulang

    await this.scan();

    console.log(`[i] Memuat ${Object.keys(this.plugins).length} plugin.`);

    if (this.watcher) {

      await this.watcher.close();

    }

    this.watcher = chokidar.watch(this.directory, {

      ignored: /(^|[\/\\])\../,

      persistent: true,

      ignoreInitial: true,

      awaitWriteFinish: {

        stabilityThreshold: 300,

        pollInterval: 100,

      },

    });

    const handleFileChange = async (path) => {

      if (path.endsWith(".js") || path.endsWith(".cjs")) {

        console.log(`[+] Plugin diperbarui: ${path}`);

        await this.add(path);

      }

    };

    this.watcher

      .on("add", handleFileChange)

      .on("change", handleFileChange)

      .on("unlink", (path) => {

        const pluginPath = resolve(path);

        if (pluginPath in this.plugins) {

          delete this.plugins[pluginPath];

          console.log(`[-] Plugin dihapus: ${path}`);

        }

      })

      .on("error", (error) => {

        console.error(`[!] Watcher error:`, error);

      });

  }

}

export default PluginsLoad;