import fs from 'fs';
import  js_beautify  from 'js-beautify';

class CaseManager {
  constructor(file) {
    this.file = file;
  }

  // Ambil konten case berdasarkan nama
  get(name) {
    try {
      const content = fs.readFileSync(this.file, 'utf8');
      const regex = new RegExp(`case\\s+"${name}"\\s*:[\\s\\S]*?break;`, 'g');
      const match = content.match(regex);
      return match ? match[0] : null;
    } catch (error) {
      console.error(`[CaseManager] Gagal membaca file: ${error.message}`);
      return null;
    }
  }

  // Tambahkan case baru (kode mentah)
  add(code) {
    try {
      const content = fs.readFileSync(this.file, 'utf8');

      // Cek jika case sudah ada
      const caseName = code.trim().split(/\s+/)[0];
      if (this.get(caseName)) {
        console.warn(`[CaseManager] Case "${caseName}" sudah ada.`);
        return false;
      }

      const regex = /(switch\s*\([^)]+\)\s*{)/;
      const match = content.match(regex);
      if (!match) return false;

      const newCase = `\n${code}\n`;
      const updatedContent = content.replace(regex, `${match[0]}${newCase}`);
      fs.writeFileSync(this.file, js_beautify(updatedContent, { indent_size: 2 }));
      return true;
    } catch (error) {
      console.error(`[CaseManager] Gagal menambahkan case: ${error.message}`);
      return false;
    }
  }

  // Hapus case berdasarkan nama
  delete(name) {
    try {
      const content = fs.readFileSync(this.file, 'utf8');
      const caseToDelete = this.get(name);
      if (!caseToDelete) return false;

      const updatedContent = content.replace(caseToDelete, '');
      fs.writeFileSync(this.file, js_beautify(updatedContent, { indent_size: 2 }));
      return true;
    } catch (error) {
      console.error(`[CaseManager] Gagal menghapus case: ${error.message}`);
      return false;
    }
  }

  // Daftar semua nama case
  list() {
    try {
      const data = fs.readFileSync(this.file, 'utf8');
      const casePattern = /case\s+"([^"]+)"/g;
      const matches = [...data.matchAll(casePattern)];
      return matches.map(m => m[1]);
    } catch (error) {
      console.error(`[CaseManager] Gagal membaca file: ${error.message}`);
      return [];
    }
  }
}

export default CaseManager;

