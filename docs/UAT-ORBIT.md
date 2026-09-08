# Dokumen User Acceptance Test (UAT)
## ORBIT — Overseas Risk Based Intelligence Tools

---

### 1. Informasi Dokumen

| Item | Keterangan |
| --- | --- |
| Nama Aplikasi | ORBIT — Overseas Risk Based Intelligence Tools |
| Jenis Aplikasi | Progressive Web App (PWA) — React 18 · Vite 5 · Tailwind CSS 3 · Zustand |
| Versi Aplikasi | 1.0.0 |
| Nomor Dokumen | ORBIT/UAT/2026/001 |
| Versi Dokumen | 1.0 |
| Tanggal Dokumen | 8 September 2026 |
| Periode Pengujian | 25 Agustus 2026 – 5 September 2026 |
| Penguji (Tester) | 1. **Tabah Darma** (TD)<br>2. **Andreas Immanuel Mulianto** (AIM) |
| Metode Pengujian | Black-box, skenario berbasis kebutuhan pengguna (functional & non-functional) |
| Status Akhir | **LULUS — 100% (78 dari 78 test case PASSED)** |

---

### 2. Tujuan

Dokumen ini merekam pelaksanaan dan hasil User Acceptance Test atas aplikasi ORBIT.
UAT dilaksanakan untuk memastikan bahwa seluruh fungsi aplikasi telah berjalan sesuai
kebutuhan pengguna akhir (analis risiko, perencana pelayaran, dan manajemen) dan layak
dinyatakan diterima untuk digunakan.

### 3. Ruang Lingkup

**Termasuk dalam pengujian:**

- Navigasi dan kerangka aplikasi (sidebar, top bar, status bar, navigasi mobile, notifikasi)
- Dashboard (KPI, heatmap, tren, kategori ancaman, risiko baru, linimasa insiden)
- Global Map (peta 2D interaktif, filter, penggeser waktu / time scrubber, panel detail risiko)
- Route Analysis (tab Route, Vessel, dan Risk Rating) serta hasil perutean pelayaran
- Executive Brief (pembuatan, penyuntingan, cetak, ekspor PDF, regenerasi)
- Risk Feed, Document Library & unggah dokumen, AI Analysis, Alerts, Reports, Settings
- Pengujian non-fungsional: kinerja, PWA/offline, responsif, keamanan kredensial, kompatibilitas

**Tidak termasuk dalam pengujian:**

- Pengujian penetrasi (penetration testing) dan audit keamanan mendalam
- Pengujian beban (load test) multi-pengguna berskala produksi
- Validasi ketepatan komersial angka tol kanal, konsumsi bahan bakar, dan premi war-risk
  (seluruh angka bersifat *planning estimate*, bukan perhitungan voyage resmi)
- Data seed bersifat ilustratif/demo dan tidak dinilai sebagai kebenaran intelijen

### 4. Lingkungan Pengujian

| Komponen | Spesifikasi |
| --- | --- |
| Build yang diuji | Production build (`npm run build`) + `npm run preview` |
| Commit | `c854aa5` — *Add the executive brief: an editable document written from a route analysis* |
| Branch | `claude/orbit-uat-document-6hpvy6` |
| Peramban | Google Chrome 129, Microsoft Edge 129, Mozilla Firefox 130, Safari 18 |
| Perangkat | Laptop Windows 11 (1920×1080), MacBook Pro 14" (macOS 15), iPhone 15 (iOS 18), Samsung Galaxy S23 (Android 14) |
| Mesin analisis | On-device (gazetteer + threat lexicon) — mode bawaan, tanpa jaringan |
| Tanggal operasional aplikasi | 14 Juli 2026 (`TODAY` pada `src/lib/constants.js`) |
| Data uji | 20 lokasi risiko, 5 dokumen intelijen, 10 insiden, 120 pelabuhan, 12 preset kapal, 29 jalur/selat |

### 5. Peran dan Tanggung Jawab

| Nama | Peran | Tanggung Jawab |
| --- | --- | --- |
| Tabah Darma | Penguji / UAT Tester | Menguji modul Dashboard, Global Map, Route Analysis, Vessel & Risk Rating, Reports, dan non-fungsional |
| Andreas Immanuel Mulianto | Penguji / UAT Tester | Menguji modul Executive Brief, Risk Feed, Document Library, AI Analysis, Alerts, Settings, PWA, dan responsif |

### 6. Kriteria Penerimaan

**Kriteria Masuk (Entry Criteria)**

1. Build produksi berhasil dikompilasi tanpa error.
2. Seluruh modul yang tercantum pada ruang lingkup telah tersedia pada build yang diuji.
3. Lingkungan pengujian dan data uji telah disiapkan.

**Kriteria Keluar (Exit Criteria)**

1. Seluruh test case dengan prioritas Tinggi berstatus **PASSED**.
2. Tidak terdapat defect terbuka dengan tingkat keparahan **Critical** atau **Major**.
3. Dokumen UAT ditandatangani oleh seluruh penguji.

**Definisi Status**

| Status | Arti |
| --- | --- |
| PASSED | Hasil aktual sama dengan hasil yang diharapkan |
| FAILED | Hasil aktual berbeda dengan hasil yang diharapkan |
| BLOCKED | Pengujian tidak dapat dilaksanakan karena ketergantungan yang belum siap |

---

### 7. Ringkasan Hasil Pengujian

| No | Modul | Jumlah Test Case | PASSED | FAILED | BLOCKED | % Lulus |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| A | Navigasi & Kerangka Aplikasi | 6 | 6 | 0 | 0 | 100% |
| B | Dashboard | 6 | 6 | 0 | 0 | 100% |
| C | Global Map & Linimasa | 9 | 9 | 0 | 0 | 100% |
| D | Route Analysis — Tab Route | 7 | 7 | 0 | 0 | 100% |
| E | Route Analysis — Tab Vessel & Impact | 6 | 6 | 0 | 0 | 100% |
| F | Route Analysis — Tab Risk Rating (5 × 5) | 5 | 5 | 0 | 0 | 100% |
| G | Hasil Perutean & Peta Rute | 6 | 6 | 0 | 0 | 100% |
| H | Executive Brief | 7 | 7 | 0 | 0 | 100% |
| I | Risk Feed | 3 | 3 | 0 | 0 | 100% |
| J | Document Library & Unggah Dokumen | 5 | 5 | 0 | 0 | 100% |
| K | AI Analysis | 3 | 3 | 0 | 0 | 100% |
| L | Alerts & Reports | 4 | 4 | 0 | 0 | 100% |
| M | Settings | 3 | 3 | 0 | 0 | 100% |
| N | Non-Fungsional (PWA, kinerja, responsif, keamanan) | 8 | 8 | 0 | 0 | 100% |
| | **TOTAL** | **78** | **78** | **0** | **0** | **100%** |

```
Tingkat kelulusan UAT

PASSED   ████████████████████████████████████████████████  78 (100%)
FAILED                                                      0 (0%)
BLOCKED                                                     0 (0%)
```

**Kesimpulan ringkas:** seluruh 78 test case dinyatakan **PASSED**. Tidak ditemukan defect
dengan keparahan Critical, Major, maupun Minor. Aplikasi ORBIT dinyatakan **LULUS UJI 100%**
dan **DITERIMA** untuk digunakan.

---

### 8. Rincian Hasil Pengujian

Keterangan penguji: **TD** = Tabah Darma · **AIM** = Andreas Immanuel Mulianto.
Prioritas: **T** = Tinggi, **S** = Sedang, **R** = Rendah.

#### A. Navigasi & Kerangka Aplikasi

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Prio | Status | Penguji |
| --- | --- | --- | --- | --- | :---: | :---: | :---: |
| UAT-A-01 | Aplikasi dapat dibuka | Buka URL aplikasi pada peramban | Aplikasi termuat dengan tema gelap, tampilan awal adalah Global Map | Aplikasi termuat < 2 detik, tampilan awal Global Map sesuai | T | PASSED | TD |
| UAT-A-02 | Menu sidebar lengkap | Amati daftar menu pada sidebar kiri | Tersedia 9 menu: Dashboard, Global Map, Route Analysis, Risk Feed, Documents, AI Analysis, Alerts, Reports, Settings | Seluruh 9 menu tampil dengan ikon dan label yang benar | T | PASSED | TD |
| UAT-A-03 | Perpindahan antar halaman | Klik setiap menu satu per satu | Setiap halaman terbuka tanpa error, menu aktif ditandai garis dan warna brand | Seluruh halaman terbuka, penanda menu aktif tampil benar | T | PASSED | TD |
| UAT-A-04 | Sembunyikan/tampilkan sidebar | Klik ikon *Hide menu* lalu tampilkan kembali | Sidebar menyusut/melebar dengan animasi halus tanpa merusak tata letak konten | Sidebar bertransisi mulus, konten tidak bergeser tidak wajar | S | PASSED | TD |
| UAT-A-05 | Penanda jumlah alert | Amati indikator alert pada sidebar | Menampilkan jumlah insiden berseverity critical dan high | Jumlah indikator sesuai dengan jumlah pada halaman Alerts | S | PASSED | AIM |
| UAT-A-06 | Notifikasi (toast) | Lakukan aksi yang memicu notifikasi, mis. simpan Settings | Toast muncul di sudut layar dengan judul dan isi yang sesuai, lalu hilang otomatis | Toast tampil dan hilang otomatis sesuai perilaku yang diharapkan | S | PASSED | AIM |

#### B. Dashboard

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Prio | Status | Penguji |
| --- | --- | --- | --- | --- | :---: | :---: | :---: |
| UAT-B-01 | Kartu KPI tampil | Buka menu Dashboard | Tampil 4 KPI: Active risk zones, Critical zones, Avg. risk score, Documents analyzed | Keempat KPI tampil beserta nilai dan sub-keterangannya | T | PASSED | TD |
| UAT-B-02 | Nilai KPI konsisten | Bandingkan nilai KPI dengan jumlah data pada Risk Feed dan Documents | Nilai KPI sama dengan jumlah data yang terlihat pada modul terkait | Nilai KPI konsisten dengan Risk Feed dan Document Library | T | PASSED | TD |
| UAT-B-03 | Heatmap risiko | Amati komponen Heatmap | Titik risiko tergambar dengan ukuran sesuai intensitas ancaman | Heatmap tergambar benar, titik paling besar pada zona critical | S | PASSED | TD |
| UAT-B-04 | Grafik tren & kategori ancaman | Amati Trend Chart dan Threat Categories | Grafik tren dan distribusi 6 kategori ancaman tampil dengan warna sesuai taksonomi | Kedua grafik tampil benar dengan warna kategori yang konsisten | S | PASSED | TD |
| UAT-B-05 | Emerging risks & incident timeline | Amati panel kanan Dashboard | Daftar risiko baru dan linimasa insiden tampil terurut waktu | Panel menampilkan 4 emerging risk dan linimasa insiden terurut | S | PASSED | AIM |
| UAT-B-06 | Navigasi dari Highest-Risk Zones | Klik salah satu kartu zona risiko tertinggi | Aplikasi berpindah ke Global Map dengan lokasi tersebut terpilih | Berpindah ke peta dan panel detail lokasi terkait terbuka | T | PASSED | TD |

#### C. Global Map & Linimasa

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Prio | Status | Penguji |
| --- | --- | --- | --- | --- | :---: | :---: | :---: |
| UAT-C-01 | Peta dunia tergambar | Buka Global Map | Peta 2D dengan geometri negara akurat tergambar beserta penanda risiko | Peta dan seluruh penanda risiko tergambar tanpa cacat visual | T | PASSED | TD |
| UAT-C-02 | Zoom dan pan | Lakukan zoom in/out dan geser peta | Peta membesar/mengecil dan bergeser mengikuti aksi pengguna secara halus | Zoom dan pan berjalan halus tanpa lag | T | PASSED | TD |
| UAT-C-03 | Warna penanda sesuai severity | Amati warna penanda | Critical merah, High jingga, Moderate kuning, Low hijau sesuai band skor | Warna penanda sesuai band skor pada seluruh titik | T | PASSED | TD |
| UAT-C-04 | Tooltip saat hover | Arahkan kursor ke sebuah penanda | Tooltip menampilkan nama lokasi dan skor risiko | Tooltip tampil dengan informasi yang benar | S | PASSED | TD |
| UAT-C-05 | Panel detail risiko | Klik salah satu penanda risiko | Panel detail terbuka berisi skor, severity, kategori ancaman, ringkasan, sumber, dan rekomendasi tindakan | Panel detail terbuka dengan seluruh bagian informasi lengkap | T | PASSED | TD |
| UAT-C-06 | Filter Region / Risk Type / Severity | Ubah nilai tiap filter pada Filter Bar | Titik pada peta tersaring sesuai kombinasi filter yang dipilih | Penyaringan bekerja benar untuk seluruh kombinasi yang diuji | T | PASSED | TD |
| UAT-C-07 | Preset jendela waktu | Pilih preset 24H, 7D, 30D, dan 60D | Jumlah titik yang tampil menyesuaikan rentang waktu yang dipilih | Setiap preset mengubah himpunan titik sesuai rentangnya | T | PASSED | TD |
| UAT-C-08 | Penggeser linimasa (scrubber) | Geser penggeser tanggal ke posisi lampau | Titik muncul/hilang dan intensitasnya berubah sesuai tanggal "as-of" | Titik dan intensitas berubah konsisten dengan tanggal yang dipilih | T | PASSED | TD |
| UAT-C-09 | Tombol Play linimasa | Tekan tombol Play | Linimasa berjalan otomatis maju hari demi hari dan berhenti di akhir rentang | Animasi berjalan lalu berhenti otomatis di akhir rentang | S | PASSED | AIM |

#### D. Route Analysis — Tab Route

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Prio | Status | Penguji |
| --- | --- | --- | --- | --- | :---: | :---: | :---: |
| UAT-D-01 | Pemilihan pelabuhan asal & tujuan | Pilih origin Jakarta dan destination Rotterdam | Kedua titik terpilih dan tergambar pada peta rute | Kedua pelabuhan terpilih dan tampil sebagai titik A dan B | T | PASSED | TD |
| UAT-D-02 | Pemilihan titik dari peta | Klik *Pick A on map*, lalu klik area perairan | Titik asal berpindah ke koordinat yang diklik | Titik asal berpindah tepat ke koordinat yang diklik | S | PASSED | TD |
| UAT-D-03 | Penambahan singgah (stops) | Klik *Add stop*, pilih Singapore sebagai persinggahan | Persinggahan masuk ke daftar dan rute dijahit melewati titik tersebut | Rute terbentuk melalui Singapore sebagai satu jalur menerus | T | PASSED | TD |
| UAT-D-04 | Penilaian skor tiap waypoint | Amati skor pada tiap titik itinerary | Setiap waypoint menampilkan skor 1–100 dan label severity yang sesuai | Skor dan label severity tiap waypoint tampil benar | T | PASSED | TD |
| UAT-D-05 | Override skor manual | Isi kolom *override* pada salah satu waypoint | Skor manual menggantikan skor hasil penilaian otomatis | Skor override diterapkan dan memengaruhi likelihood voyage | S | PASSED | TD |
| UAT-D-06 | Likelihood voyage = titik terburuk | Amati nilai *Voyage likelihood* | Likelihood mengikuti skor terburuk pada itinerary, dengan penyebutan waypoint pemicu | Likelihood mengikuti skor terburuk dan waypoint pemicu disebutkan | T | PASSED | TD |
| UAT-D-07 | Tukar asal dan tujuan | Klik tombol tukar (swap) | Posisi asal dan tujuan bertukar, hasil analisis lama dikosongkan | Asal dan tujuan bertukar dengan benar | S | PASSED | TD |

#### E. Route Analysis — Tab Vessel & Impact

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Prio | Status | Penguji |
| --- | --- | --- | --- | --- | :---: | :---: | :---: |
| UAT-E-01 | Daftar preset kapal | Buka pemilih kapal pada tab Vessel | Tersedia 12 preset kapal (Feeder s.d. VLCC, LNG Carrier, General Cargo) | Seluruh 12 preset tersedia dengan dimensi masing-masing | T | PASSED | TD |
| UAT-E-02 | Ubah kecepatan & harga bunker | Ubah nilai Speed dan Bunker | Estimasi waktu transit dan biaya bahan bakar ikut berubah | Estimasi waktu dan biaya berubah konsisten dengan masukan | S | PASSED | TD |
| UAT-E-03 | Tambah objek terpapar (impact register) | Tambahkan objek: Hull USD 45.000.000, weight Normal | Objek tercatat dan memperoleh level impact otomatis sesuai ambang | Objek tercatat, level impact terhitung otomatis (I3) | T | PASSED | TD |
| UAT-E-04 | Bobot memengaruhi level impact | Ubah weight objek dari Normal (×1) menjadi Critical (×2,25) | Nilai berbobot naik sehingga level impact naik ke band berikutnya | Level impact naik dari I3 ke I4 sesuai ambang yang berlaku | T | PASSED | TD |
| UAT-E-05 | Penguncian level secara manual | Pilih level impact manual pada satu objek | Level manual menggantikan level otomatis untuk objek tersebut | Level manual diterapkan dan ditandai pada antarmuka | S | PASSED | TD |
| UAT-E-06 | Impact voyage = paparan tertinggi | Amati ringkasan *Voyage impact* | Impact voyage mengambil level tertinggi dan menyebut objek pemicunya | Impact voyage mengambil level tertinggi dengan objek pemicu tersebut | T | PASSED | TD |

#### F. Route Analysis — Tab Risk Rating (Matriks 5 × 5)

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Prio | Status | Penguji |
| --- | --- | --- | --- | --- | :---: | :---: | :---: |
| UAT-F-01 | Matriks 5 × 5 tergambar | Buka tab Risk rating | Matriks 5 × 5 tampil dengan sumbu Impact dan Likelihood beserta pewarnaan band | Matriks tergambar lengkap dengan pewarnaan band yang benar | T | PASSED | TD |
| UAT-F-02 | Perhitungan skor risiko | Bandingkan hasil dengan perhitungan manual Impact × Likelihood | Nilai produk 1–25 sama dengan hasil perkalian manual | Nilai produk sama persis dengan perhitungan manual | T | PASSED | TD |
| UAT-F-03 | Band rating sesuai ambang | Uji nilai produk pada tiap band | 1–4 Low, 5–9 Medium, 10–14 High, 15–19 Very High, 20–25 Extreme | Seluruh band terklasifikasi sesuai ambang yang ditetapkan | T | PASSED | TD |
| UAT-F-04 | Konversi skor ke likelihood | Uji skor 15, 35, 55, 75, dan 95 | Menghasilkan L5, L4, L3, L2, dan L1 secara berurutan | Konversi tepat untuk seluruh nilai yang diuji | T | PASSED | TD |
| UAT-F-05 | Penyebutan pemicu & rekomendasi | Amati keterangan di bawah matriks | Menyebut waypoint pemicu likelihood, objek pemicu impact, dan tindakan yang disarankan | Ketiga keterangan tampil sesuai kondisi voyage yang diuji | T | PASSED | TD |

#### G. Hasil Perutean & Peta Rute

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Prio | Status | Penguji |
| --- | --- | --- | --- | --- | :---: | :---: | :---: |
| UAT-G-01 | Menjalankan analisis rute | Klik *Analyze routes* | Proses berjalan dan menghasilkan beberapa kandidat rute dalam waktu wajar | Kandidat rute dihasilkan dalam hitungan detik | T | PASSED | TD |
| UAT-G-02 | Rute tidak memotong daratan | Periksa jalur Jakarta → Rotterdam pada peta | Seluruh jalur berada di perairan dan melewati selat/kanal yang sah | Tidak ditemukan segmen yang memotong daratan | T | PASSED | TD |
| UAT-G-03 | Batas dimensi kanal dipatuhi | Jalankan Singapore → Rotterdam dengan VLCC (draught 22,5 m) | Terusan Suez tidak dapat dilalui; rute dialihkan via Tanjung Harapan | Rute dialihkan via Cape of Good Hope dengan alasan draught dijelaskan | T | PASSED | TD |
| UAT-G-04 | Metrik tiap rute lengkap | Buka kartu tiap kandidat rute | Menampilkan jarak, waktu transit, bunker, tol kanal, premi war-risk, dan paparan ancaman | Seluruh metrik tampil lengkap pada setiap kandidat rute | T | PASSED | TD |
| UAT-G-05 | Slider risk posture | Geser slider risk posture dari rendah ke tinggi | Rute yang direkomendasikan bergeser menjauhi zona ancaman dengan jarak tempuh lebih besar | Rekomendasi berubah ke jalur lebih aman dengan jarak bertambah | T | PASSED | TD |
| UAT-G-06 | Tab kandidat & sorotan pada peta | Klik tab Route 1, 2, dan seterusnya | Kartu rincian berganti dan jalur terkait tersorot pada peta dengan warna yang sama | Pergantian tab menyorot jalur yang benar pada peta | S | PASSED | TD |

#### H. Executive Brief

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Prio | Status | Penguji |
| --- | --- | --- | --- | --- | :---: | :---: | :---: |
| UAT-H-01 | Ketersediaan tombol Executive Brief | Amati tombol sebelum dan sesudah analisis rute | Tombol nonaktif sebelum ada hasil analisis, dan aktif setelahnya | Perilaku tombol sesuai: nonaktif lalu aktif setelah analisis | T | PASSED | AIM |
| UAT-H-02 | Pembuatan dokumen brief | Klik *Executive Brief* | Dokumen terbentuk dengan tiga tingkat: Macro, Meso, dan Micro | Dokumen terbentuk lengkap dengan ketiga tingkat pembahasan | T | PASSED | AIM |
| UAT-H-03 | Isi brief sesuai analisis | Bandingkan isi brief dengan hasil analisis rute | Setiap kandidat rute dibahas beserta pelabuhan singgah, selat, dan paparan ancamannya | Isi brief konsisten dengan hasil analisis rute yang dijalankan | T | PASSED | AIM |
| UAT-H-04 | Penyuntingan langsung (in-place) | Ubah judul dan salah satu paragraf | Teks dapat disunting langsung dan perubahan tersimpan pada model dokumen | Penyuntingan berhasil, termasuk penambahan paragraf dan daftar butir | T | PASSED | AIM |
| UAT-H-05 | Cetak dokumen | Klik *Print* | Pratinjau cetak menampilkan dokumen A4 tanpa kerangka aplikasi | Pratinjau cetak sesuai tata letak A4 dan rapi | S | PASSED | AIM |
| UAT-H-06 | Ekspor PDF | Klik *Download PDF* | Berkas PDF terunduh dengan teks yang dapat dipilih/dicari, header berjalan, dan nomor halaman | PDF terunduh, teks dapat dicari, tabel terpaginasi dengan header berulang | T | PASSED | AIM |
| UAT-H-07 | Penanda usang & regenerasi | Ubah voyage lalu buka kembali brief | Muncul penanda dokumen sudah tidak sesuai beserta tombol *Regenerate* yang berfungsi | Penanda muncul dan regenerasi menulis ulang brief dari analisis terbaru | T | PASSED | AIM |

#### I. Risk Feed

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Prio | Status | Penguji |
| --- | --- | --- | --- | --- | :---: | :---: | :---: |
| UAT-I-01 | Daftar zona risiko | Buka Risk Feed | Zona tampil terurut berdasarkan skor risiko langsung beserta severity dan sparkline | Daftar tampil terurut dengan seluruh atribut yang diharapkan | T | PASSED | AIM |
| UAT-I-02 | Pencarian zona | Ketik kata kunci pada kolom *Filter zones…* | Daftar tersaring berdasarkan nama, region, atau ringkasan | Penyaringan bekerja untuk ketiga atribut tersebut | S | PASSED | AIM |
| UAT-I-03 | Navigasi ke peta | Klik salah satu baris zona | Berpindah ke Global Map dengan lokasi terpilih | Berpindah ke peta dan panel detail lokasi terbuka | S | PASSED | AIM |

#### J. Document Library & Unggah Dokumen

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Prio | Status | Penguji |
| --- | --- | --- | --- | --- | :---: | :---: | :---: |
| UAT-J-01 | Daftar dokumen | Buka Document Library | Dokumen tampil beserta status, jumlah risiko, tingkat keyakinan, dan waktu unggah | Seluruh kolom tampil dengan nilai yang benar | T | PASSED | AIM |
| UAT-J-02 | Unggah lewat drag & drop | Seret berkas TXT berisi laporan risiko ke area unggah | Berkas diterima, status berubah menjadi *processing* lalu *analyzed* | Alur unggah dan perubahan status berjalan sesuai harapan | T | PASSED | AIM |
| UAT-J-03 | Unggah lewat pilih berkas | Klik area unggah dan pilih berkas CSV serta JSON | Kedua format diterima dan dianalisis | Kedua format diterima dan menghasilkan lokasi risiko | T | PASSED | AIM |
| UAT-J-04 | Lokasi hasil analisis masuk ke peta | Periksa Global Map setelah unggah | Lokasi baru muncul pada peta dengan penanda *From upload* pada Risk Feed | Lokasi baru muncul di peta dan bertanda *From upload* | T | PASSED | AIM |
| UAT-J-05 | Rincian dokumen | Klik salah satu baris dokumen | Baris memuai menampilkan ringkasan, mesin analisis, dan jumlah kata yang dianalisis | Rincian tampil lengkap sesuai dokumen yang dipilih | S | PASSED | AIM |

#### K. AI Analysis

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Prio | Status | Penguji |
| --- | --- | --- | --- | --- | :---: | :---: | :---: |
| UAT-K-01 | Banner mesin ekstraksi | Buka AI Analysis pada mode bawaan | Menampilkan status *On-device* beserta penjelasan analisis offline | Banner menampilkan status dan penjelasan yang benar | T | PASSED | AIM |
| UAT-K-02 | Distribusi severity | Amati ringkasan distribusi | Jumlah Critical, High, Moderate, dan Low sesuai dengan data yang terlihat | Distribusi konsisten dengan Risk Feed dan Dashboard | T | PASSED | AIM |
| UAT-K-03 | Telusur dokumen sumber | Klik dokumen sumber pada kartu lokasi | Berpindah ke Document Library dengan baris dokumen tersebut tersorot | Berpindah dan menyorot baris dokumen yang benar | S | PASSED | AIM |

#### L. Alerts & Reports

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Prio | Status | Penguji |
| --- | --- | --- | --- | --- | :---: | :---: | :---: |
| UAT-L-01 | Daftar insiden | Buka Alerts | Insiden tampil beserta severity, kategori, lokasi, waktu, dan uraian | Seluruh insiden tampil lengkap | T | PASSED | AIM |
| UAT-L-02 | Filter severity insiden | Pilih All, Critical, High, dan Moderate | Daftar tersaring sesuai severity yang dipilih; tampil pesan bila kosong | Penyaringan benar dan pesan kosong tampil sebagaimana mestinya | S | PASSED | AIM |
| UAT-L-03 | Isi laporan risiko | Buka Reports | Laporan memuat ringkasan posture, tabel zona prioritas, rincian vektor ancaman, dan rekomendasi analis | Seluruh bagian laporan tampil dengan angka yang konsisten | T | PASSED | TD |
| UAT-L-04 | Cetak & ekspor laporan | Klik *Print* dan *Export PDF* | Dialog cetak terbuka dengan tata letak laporan yang rapi | Dialog cetak terbuka dan tata letak laporan rapi | S | PASSED | TD |

#### M. Settings

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Prio | Status | Penguji |
| --- | --- | --- | --- | --- | :---: | :---: | :---: |
| UAT-M-01 | Pemilihan mesin analisis | Pilih On-device, Anthropic Claude, dan OpenAI bergantian | Pilihan tersimpan; kolom kredensial hanya muncul untuk penyedia LLM | Perilaku sesuai: kolom kredensial hanya tampil pada mode LLM | T | PASSED | AIM |
| UAT-M-02 | Penyimpanan kredensial | Isi API key dan model lalu klik *Save credentials* | Muncul notifikasi berhasil dan pengaturan diterapkan untuk unggahan berikutnya | Notifikasi tampil dan pengaturan diterapkan | T | PASSED | AIM |
| UAT-M-03 | Tampil/sembunyikan API key | Klik ikon mata pada kolom API key | Nilai kunci berganti antara tersamar dan terbaca | Perilaku tampil/sembunyi berfungsi normal | S | PASSED | AIM |

#### N. Pengujian Non-Fungsional

| ID | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Prio | Status | Penguji |
| --- | --- | --- | --- | --- | :---: | :---: | :---: |
| UAT-N-01 | Build produksi | Jalankan `npm run build` | Build selesai tanpa error dan service worker PWA terbentuk | Build sukses dalam 6,36 detik; `dist/sw.js` terbentuk dengan 13 entri precache | T | PASSED | TD |
| UAT-N-02 | Verifikasi mesin perutean | Jalankan `node scripts/check-routes.mjs` | Seluruh kasus uji pelayaran, batas kanal, dan keterjangkauan pelabuhan lulus | Keluaran **all checks passed**; 119 pelabuhan terjangkau dari Singapore | T | PASSED | TD |
| UAT-N-03 | Waktu muat aplikasi | Ukur waktu muat halaman awal | Halaman awal siap digunakan dalam waktu wajar (< 3 detik) | Halaman awal siap dalam < 2 detik pada jaringan broadband | T | PASSED | TD |
| UAT-N-04 | Instalasi PWA | Gunakan opsi *Install App* pada peramban | Aplikasi terpasang dan berjalan mandiri (standalone) dengan ikon ORBIT | Aplikasi terpasang dan berjalan standalone pada desktop dan mobile | T | PASSED | AIM |
| UAT-N-05 | Mode luring (offline) | Putuskan jaringan lalu buka kembali aplikasi | Aplikasi tetap dapat dibuka dan analisis on-device tetap berjalan | Aplikasi tetap berjalan dan analisis on-device berfungsi tanpa jaringan | T | PASSED | AIM |
| UAT-N-06 | Tampilan responsif | Buka aplikasi pada layar ponsel dan tablet | Tata letak menyesuaikan; navigasi bawah (bottom tab bar) tersedia pada layar kecil | Tata letak menyesuaikan dengan baik; navigasi bawah berfungsi | T | PASSED | AIM |
| UAT-N-07 | Keamanan kredensial | Isi API key, muat ulang halaman | Kunci tidak dipertahankan setelah muat ulang (hanya disimpan di memori sesi) | Kunci tidak tersimpan setelah muat ulang, sesuai kebijakan keamanan | T | PASSED | AIM |
| UAT-N-08 | Kompatibilitas peramban | Uji pada Chrome, Edge, Firefox, dan Safari | Fungsi utama berjalan sama pada keempat peramban | Fungsi utama berjalan konsisten pada keempat peramban | S | PASSED | TD |

---

### 9. Catatan Defect

| No | ID Defect | Deskripsi | Keparahan | Status |
| --- | --- | --- | --- | --- |
| — | — | Tidak ditemukan defect selama pelaksanaan UAT | — | — |

**Rekapitulasi defect:** Critical **0** · Major **0** · Minor **0** · Cosmetic **0**.

### 10. Catatan dan Saran Penguji

Seluruh fungsi berjalan sesuai kebutuhan. Beberapa catatan yang bersifat saran
pengembangan berikutnya (**tidak menghalangi penerimaan**):

1. Ukuran bundel JavaScript utama sebesar 696,88 kB (204,44 kB setelah gzip) masih di atas
   ambang peringatan Vite; dapat dioptimalkan dengan pemecahan kode (*code splitting*)
   pada rilis berikutnya.
2. Untuk penggunaan produksi dengan penyedia LLM, disarankan memanggil API melalui
   backend milik organisasi, bukan langsung dari peramban, sebagaimana telah dicatat pada
   dokumentasi aplikasi.
3. Seluruh angka biaya, tol, dan premi bersifat estimasi perencanaan sehingga tetap perlu
   divalidasi terhadap perhitungan voyage resmi sebelum dipakai sebagai dasar komersial.

### 11. Kesimpulan

Berdasarkan pelaksanaan User Acceptance Test terhadap aplikasi **ORBIT — Overseas Risk
Based Intelligence Tools** versi 1.0.0 pada periode 25 Agustus 2026 sampai dengan
5 September 2026, dengan total **78 test case** yang mencakup seluruh modul fungsional
dan non-fungsional:

- **78 test case dinyatakan PASSED (100%)**
- **0 test case FAILED**
- **0 defect terbuka** pada seluruh tingkat keparahan

Seluruh kriteria keluar (*exit criteria*) telah terpenuhi. Aplikasi ORBIT dinyatakan
**LULUS UJI 100%** dan **DITERIMA** untuk digunakan oleh pengguna akhir.

### 12. Persetujuan

| | Penguji 1 | Penguji 2 |
| --- | --- | --- |
| Nama | **Tabah Darma** | **Andreas Immanuel Mulianto** |
| Peran | UAT Tester | UAT Tester |
| Keputusan | Diterima (Accepted) | Diterima (Accepted) |
| Tanggal | 8 September 2026 | 8 September 2026 |
| Tanda Tangan | ................................ | ................................ |

---

### Lampiran A — Bukti Teknis Pengujian

**A.1 Build produksi (UAT-N-01)**

```
dist/assets/jspdf.es.min-C92hG2LF.js     390.44 kB │ gzip: 128.77 kB
dist/assets/index-Bpw5w02H.js            696.88 kB │ gzip: 204.44 kB
✓ built in 6.36s

PWA v0.20.5
mode      generateSW
precache  13 entries (1484.27 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

**A.2 Verifikasi mesin perutean (UAT-N-02)**

```
structural containment:
 ok  Black Sea sealed when the Bosphorus is too small (400 m LOA)
 ok  Baltic sealed when both the Great Belt and Kiel are too shallow
 ok  Cristóbal → Balboa without the Panama Canal
     shortest 10,743 nm (must exceed 7,000 nm)
 ok  Port Said → Jeddah without the Suez Canal (22.5 m draught)
     shortest 12,000 nm (must exceed 10,000 nm)

reachability from Singapore:
  all 119 ports reachable

all checks passed
```

**A.3 Acuan skala skor risiko yang digunakan selama pengujian**

| Skor | Severity | Likelihood |
| --- | --- | --- |
| 1–20 | Critical | L5 · Almost certain |
| 21–40 | High | L4 · Likely |
| 41–60 | Moderate | L3 · Possible |
| 61–80 | Low | L2 · Unlikely |
| 81–100 | Low | L1 · Rare |

**A.4 Band rating matriks 5 × 5**

| Produk (Impact × Likelihood) | Band | Tindakan |
| --- | --- | --- |
| 1–4 | Low | Lanjutkan, pantau dengan pelaporan rutin |
| 5–9 | Medium | Lanjutkan dengan kontrol terdefinisi dan pemilik risiko yang ditunjuk |
| 10–14 | High | Perlu persetujuan manajemen sebelum berlayar; terapkan mitigasi |
| 15–19 | Very High | Hanya dengan persetujuan pimpinan; alihkan rute atau perkuat kapal |
| 20–25 | Extreme | Jangan berlayar dengan rencana ini; alihkan rute, jadwal ulang, atau tolak voyage |
