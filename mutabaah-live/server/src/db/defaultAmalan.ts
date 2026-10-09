import type { NewAmalan } from './client.js';

export const DEFAULT_AMALAN: Array<Omit<NewAmalan, 'id' | 'usrahId' | 'createdOn'>> = [
  { code: '01', name: "Tilawah Al-Quran", description: "Sasaran 5 muka surat sehari", freq: 'harian', inputType: 'count', targetVal: 5, unit: "muka surat / hari", icon: 'menu_book', active: true, sort: 0 },
  { code: '02', name: "Solat Fardhu Berjamaah", description: "Sasaran 5 waktu (keutamaan Subuh & Isya di masjid)", freq: 'harian', inputType: 'prayers', targetVal: 5, unit: "waktu", icon: 'mosque', active: true, sort: 1 },
  { code: '03', name: "Beristighfar", description: "Sasaran 70 kali minimum", freq: 'harian', inputType: 'count', targetVal: 70, unit: "kali / hari", icon: 'counter_3', active: true, sort: 2 },
  { code: '04', name: "Solat Sunat Rawatib", description: "Sasaran 8 rakaat (Qabliyyah & Ba'diyyah)", freq: 'harian', inputType: 'count', targetVal: 8, unit: "rakaat / hari", icon: 'person_play', active: true, sort: 3 },
  { code: '05', name: "Solat Dhuha", description: "Sasaran Harian (minimum 2 rakaat)", freq: 'harian', inputType: 'check', targetVal: 2, unit: "rakaat / hari", icon: 'light_mode', active: true, sort: 4 },
  { code: '06', name: "Membaca Doa-Doa Pilihan", description: "Doa harian & rabitah pada waktu berbeza", freq: 'harian', inputType: 'check', targetVal: 1, unit: "sesi / hari", icon: 'favorite', active: true, sort: 5 },
  { code: '07', name: "Wirid Selepas Solat", description: "Tasbih, Tahmid, Takbir 33× & Ayat Kursi", freq: 'harian', inputType: 'check', targetVal: 5, unit: "waktu", icon: 'self_improvement', active: true, sort: 6 },
  { code: '08', name: "Membaca Buku Tsaqafah", description: "Sasaran harian 30 minit pembacaan ilmiah", freq: 'harian', inputType: 'count', targetVal: 30, unit: "minit / hari", icon: 'auto_stories', active: true, sort: 7 },
  { code: '09', name: "Menghafaz Al-Quran", description: "Sukatan: An-Naba' – Al-Lail & Wirid Iman", freq: 'mingguan', inputType: 'check', targetVal: 1, unit: "ayat disemak / minggu", icon: 'record_voice_over', active: true, sort: 8 },
  { code: '10', name: "Ma'thurat Sughra", description: "Sasaran 2 kali seminggu (Pagi & Petang)", freq: 'mingguan', inputType: 'check', targetVal: 2, unit: "kali / minggu", icon: 'import_contacts', active: true, sort: 9 },
  { code: '11', name: "Riadah & Kesihatan Jasmani", description: "Sasaran 3 sesi × 15 minit", freq: 'mingguan', inputType: 'count', targetVal: 3, unit: "sesi / minggu", icon: 'directions_run', active: true, sort: 10 },
  { code: '12', name: "Berinteraksi dengan Jiran", description: "Sapaan, berkongsi juadah, ziarah ringkas", freq: 'mingguan', inputType: 'check', targetVal: 1, unit: "kali / minggu", icon: 'holiday_village', active: true, sort: 11 },
  { code: '13', name: "Qiamullail", description: "Sasaran 1 kali seminggu (Tahajjud & Witir)", freq: 'mingguan', inputType: 'check', targetVal: 1, unit: "kali / minggu", icon: 'bedtime', active: true, sort: 12 },
  { code: '14', name: "Bersedekah", description: "Infaq Jumaat / Bantuan tabung kebajikan", freq: 'mingguan', inputType: 'check', targetVal: 1, unit: "kali / minggu", icon: 'volunteer_activism', active: true, sort: 13 },
  { code: '15', name: "Silaturrahim Ibu Bapa", description: "Panggilan telefon, bertanya khabar & doa", freq: 'mingguan', inputType: 'check', targetVal: 1, unit: "kali / minggu", icon: 'family_restroom', active: true, sort: 14 },
  { code: '16', name: "Aktiviti Kemasyarakatan", description: "Gotong-royong, program surau / ziarah amal", freq: 'mingguan', inputType: 'check', targetVal: 1, unit: "kali / minggu", icon: 'diversity_3', active: true, sort: 15 },
  { code: '17', name: "Berpuasa Sunat", description: "Sasaran 1 hari / bulan (Isnin/Khamis/Putih)", freq: 'bulanan', inputType: 'check', targetVal: 1, unit: "hari / bulan", icon: 'restaurant', active: true, sort: 16 },
];
