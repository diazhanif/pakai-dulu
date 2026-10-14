# PakaiDulu

PakaiDulu adalah pencatat persediaan bahan dapur yang membantu pengguna memprioritaskan bahan dengan tanggal penggunaan paling dekat. Proyek ini dibuat sebagai aplikasi web statis: gratis, tanpa akun, dan tanpa dependensi eksternal.

## Fitur

- Catat nama bahan, kategori, jumlah, satuan, dan tanggal pada label atau perkiraan tanggal penggunaan.
- Prioritaskan bahan yang tanggalnya lewat atau jatuh dalam tiga hari ke depan; urutan daftar menempatkan tanggal terdekat terlebih dahulu.
- Cari bahan dan saring antara daftar aktif, bahan prioritas, dan bahan yang sudah dipakai.
- Tandai bahan yang sudah digunakan, atau kembalikan ke daftar aktif.
- Ekspor CSV untuk dibuka di spreadsheet, serta cadangkan dan pulihkan seluruh daftar melalui file JSON.
- Tampilan responsif, label formulir, status yang diumumkan ke pembaca layar, dan dukungan preferensi gerakan rendah.

## Mulai menggunakan

Buka [`index.html`](./index.html) di browser modern. Tidak perlu instalasi, akun, API key, server, atau proses build. Untuk menjalankannya lewat server lokal:

```bash
python3 -m http.server 8000
```

Kemudian buka `http://localhost:8000` dari dalam folder proyek.

## Pengujian

Membutuhkan Node.js 18 atau lebih baru; tidak perlu memasang paket:

```bash
npm test
```

Tes memakai test runner bawaan Node.js dan mencakup tanggal, validasi, filter, pengurutan, netralisasi formula CSV, serta validasi format cadangan.

## Privasi dan batasan

PakaiDulu menyimpan daftar hanya di `localStorage` browser pada perangkat yang sedang digunakan. Data tidak dikirim ke server dan tidak dibagikan dengan pihak ketiga. Menghapus data situs/browser dapat menghapus daftar; unduh **Cadangkan JSON** secara berkala agar daftar dapat dipulihkan. CSV hanya untuk spreadsheet dan tidak dapat diimpor kembali. Pemulihan JSON mengganti daftar lokal saat ini setelah konfirmasi. Jangan mencatat informasi sensitif yang tidak diperlukan.

Tanggal yang ditampilkan merupakan pengingat, bukan penilaian keamanan atau kelayakan konsumsi makanan. Ikuti petunjuk penyimpanan pada kemasan dan periksa kondisi bahan sebelum digunakan. Perkiraan tanggal, jika dipakai, dapat keliru.

## Lisensi

Kode dirilis di bawah lisensi MIT. Lihat [`LICENSE`](./LICENSE).
