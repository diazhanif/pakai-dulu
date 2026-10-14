((root, factory) => {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PakaiDuluLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const CATEGORIES = ['Sayur & buah', 'Daging & ikan', 'Susu & olahan', 'Roti & kue', 'Bahan kering', 'Bumbu', 'Lainnya'];
  const UNITS = ['pcs', 'bungkus', 'kg', 'g', 'L', 'ml', 'butir', 'ikat'];
  const BACKUP_FORMAT = 'pakai-dulu-backup';
  const BACKUP_VERSION = 1;
  const MAX_BACKUP_ITEMS = 10000;

  function utcDayNumber(year, month, day) {
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);
    return date.getTime() / 86400000;
  }

  function isValidDateKey(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(utcDayNumber(year, month, day) * 86400000);
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${String(year).padStart(4, '0')}-${month}-${day}`;
  }

  function daysUntil(dateKey, todayKey = localDateKey()) {
    if (!isValidDateKey(dateKey) || !isValidDateKey(todayKey)) return NaN;
    const ordinal = (key) => {
      const [year, month, day] = key.split('-').map(Number);
      return utcDayNumber(year, month, day);
    };
    return ordinal(dateKey) - ordinal(todayKey);
  }

  function dateStatus(dateKey, todayKey = localDateKey()) {
    const days = daysUntil(dateKey, todayKey);
    if (!Number.isFinite(days)) return 'invalid';
    if (days < 0) return 'overdue';
    if (days === 0) return 'today';
    if (days <= 3) return 'soon';
    return 'later';
  }

  function isValidItem(item) {
    return Boolean(item && typeof item.id === 'string' && item.id.length > 0 &&
      typeof item.name === 'string' && item.name.trim().length > 0 && item.name.length <= 60 &&
      Number.isFinite(item.quantity) && item.quantity > 0 &&
      CATEGORIES.includes(item.category) && UNITS.includes(item.unit) &&
      isValidDateKey(item.expiry) && typeof item.consumed === 'boolean' &&
      typeof item.addedAt === 'string' &&
      (item.consumedAt === undefined || typeof item.consumedAt === 'string'));
  }

  function filterItems(items, filter = 'active', query = '', todayKey = localDateKey()) {
    const needle = String(query).trim().toLocaleLowerCase('id-ID');
    return items.filter((item) => {
      const isDone = item.consumed === true;
      if (filter === 'done' && !isDone) return false;
      if (filter === 'active' && isDone) return false;
      if (filter === 'priority' && (isDone || daysUntil(item.expiry, todayKey) > 3)) return false;
      if (needle && !`${item.name} ${item.category}`.toLocaleLowerCase('id-ID').includes(needle)) return false;
      return true;
    }).sort((a, b) => {
      if (a.consumed !== b.consumed) return a.consumed ? 1 : -1;
      if (a.consumed) return String(b.consumedAt || '').localeCompare(String(a.consumedAt || ''));
      return daysUntil(a.expiry, todayKey) - daysUntil(b.expiry, todayKey) || a.name.localeCompare(b.name, 'id-ID');
    });
  }

  function escapeCsvCell(value) {
    let text = String(value ?? '');
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }

  function toCsv(items) {
    const header = ['Nama bahan', 'Kategori', 'Jumlah', 'Satuan', 'Gunakan sebelum', 'Status'];
    const rows = items.map((item) => [item.name, item.category, item.quantity, item.unit, item.expiry, item.consumed ? 'Sudah dipakai' : 'Disimpan']);
    return ['\uFEFF' + header.map(escapeCsvCell).join(','), ...rows.map((row) => row.map(escapeCsvCell).join(','))].join('\r\n');
  }

  function createBackup(items, exportedAt = new Date().toISOString()) {
    if (!Array.isArray(items) || items.length > MAX_BACKUP_ITEMS || !items.every(isValidItem)) {
      throw new TypeError('Daftar bahan tidak valid untuk dicadangkan.');
    }
    const ids = new Set(items.map((item) => item.id));
    if (ids.size !== items.length) throw new TypeError('Daftar bahan memiliki ID ganda.');
    return JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, items }, null, 2);
  }

  function parseBackup(contents) {
    let backup;
    try {
      backup = JSON.parse(contents);
    } catch {
      throw new TypeError('File bukan JSON yang valid.');
    }
    if (!backup || backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION || !Array.isArray(backup.items)) {
      throw new TypeError('Format file bukan cadangan PakaiDulu yang didukung.');
    }
    if (backup.items.length > MAX_BACKUP_ITEMS) {
      throw new TypeError(`Cadangan memuat lebih dari ${MAX_BACKUP_ITEMS} bahan.`);
    }
    if (!backup.items.every(isValidItem)) {
      throw new TypeError('Cadangan memuat data bahan yang tidak valid atau tidak lengkap.');
    }
    const ids = new Set(backup.items.map((item) => item.id));
    if (ids.size !== backup.items.length) throw new TypeError('Cadangan memuat ID bahan yang ganda.');
    return backup.items.map((item) => ({ ...item }));
  }

  return Object.freeze({ CATEGORIES, UNITS, isValidDateKey, localDateKey, daysUntil, dateStatus, isValidItem, filterItems, escapeCsvCell, toCsv, createBackup, parseBackup });
});
