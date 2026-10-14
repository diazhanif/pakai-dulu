const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');

const item = (overrides = {}) => ({
  id: 'id-1', name: 'Tomat', category: 'Sayur & buah', quantity: 2, unit: 'pcs',
  expiry: '2026-10-16', addedAt: '2026-10-14T00:00:00.000Z', consumed: false, consumedAt: '',
  ...overrides
});

test('tanggal yang tidak valid ditolak dan tanggal kalender valid diterima', () => {
  assert.equal(L.isValidDateKey('2026-02-29'), false);
  assert.equal(L.isValidDateKey('2028-02-29'), true);
  assert.equal(L.isValidDateKey('0004-02-29'), true);
  assert.equal(L.daysUntil('0001-01-02', '0001-01-01'), 1);
  assert.equal(L.isValidDateKey('14-10-2026'), false);
});

test('perhitungan hari tidak bergantung pada perubahan waktu musim', () => {
  assert.equal(L.daysUntil('2026-10-17', '2026-10-14'), 3);
  assert.equal(L.daysUntil('2026-10-13', '2026-10-14'), -1);
});

test('status tanggal membedakan lewat tanggal, hari ini, segera, dan nanti', () => {
  assert.equal(L.dateStatus('2026-10-13', '2026-10-14'), 'overdue');
  assert.equal(L.dateStatus('2026-10-14', '2026-10-14'), 'today');
  assert.equal(L.dateStatus('2026-10-17', '2026-10-14'), 'soon');
  assert.equal(L.dateStatus('2026-10-18', '2026-10-14'), 'later');
});

test('validasi item memastikan nilai wajib berada dalam rentang yang didukung', () => {
  assert.equal(L.isValidItem(item()), true);
  assert.equal(L.isValidItem(item({ quantity: 0 })), false);
  assert.equal(L.isValidItem(item({ category: 'Kategori tidak dikenal' })), false);
  assert.equal(L.isValidItem(item({ consumedAt: 42 })), false);
  assert.equal(L.isValidItem(item({ expiry: '2026-02-30' })), false);
});

test('filter prioritas mencakup tanggal lewat dan maksimal tiga hari, lalu mengurutkan terdekat', () => {
  const rows = [
    item({ id: 'late', name: 'Bahan lewat', expiry: '2026-10-13' }),
    item({ id: 'soon', name: 'Bahan dekat', expiry: '2026-10-17' }),
    item({ id: 'later', name: 'Bahan nanti', expiry: '2026-10-18' }),
    item({ id: 'done', name: 'Bahan selesai', expiry: '2026-10-14', consumed: true })
  ];
  assert.deepEqual(L.filterItems(rows, 'priority', '', '2026-10-14').map((row) => row.id), ['late', 'soon']);
  assert.deepEqual(L.filterItems(rows, 'done', '', '2026-10-14').map((row) => row.id), ['done']);
});

test('pencarian tidak peka kapital dan mencocokkan nama maupun kategori', () => {
  const rows = [item({ name: 'Cabai Merah' }), item({ id: '2', name: 'Susu', category: 'Susu & olahan' })];
  assert.deepEqual(L.filterItems(rows, 'active', 'CABAI', '2026-10-14').map((row) => row.name), ['Cabai Merah']);
  assert.deepEqual(L.filterItems(rows, 'active', 'olahan', '2026-10-14').map((row) => row.name), ['Susu']);
});

test('CSV mengutip nilai dan menetralkan formula spreadsheet', () => {
  assert.equal(L.escapeCsvCell('=1+1'), '"\'=1+1"');
  assert.equal(L.escapeCsvCell('nama, "spesial"'), '"nama, ""spesial"""');
  const csv = L.toCsv([item({ name: '=IMPORTXML("x")' })]);
  assert.match(csv, /'=IMPORTXML/);
  assert.match(csv, /Nama bahan/);
});

test('cadangan JSON dapat diekspor dan dipulihkan tanpa kehilangan data', () => {
  const original = [item(), item({ id: 'id-2', name: 'Susu', consumed: true, consumedAt: '2026-10-14T12:00:00.000Z' })];
  const backup = L.createBackup(original, '2026-10-14T12:00:00.000Z');
  const parsed = L.parseBackup(backup);
  assert.deepEqual(parsed, original);
  assert.equal(JSON.parse(backup).format, 'pakai-dulu-backup');
});

test('pemulihan menolak JSON rusak, format asing, data invalid, dan ID ganda', () => {
  assert.throws(() => L.parseBackup('{'), /JSON yang valid/);
  assert.throws(() => L.parseBackup('{"items":[]}'), /bukan cadangan PakaiDulu/);
  assert.throws(() => L.parseBackup(L.createBackup([item()]).replace('Tomat', '')), /data bahan yang tidak valid/);
  assert.throws(() => L.createBackup([item(), item()]), /ID ganda/);
});
