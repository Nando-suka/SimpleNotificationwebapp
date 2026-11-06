import { fetchRecentCVEs } from './utils/nvd.js';
import { fetchSecurityNews, extractCVEIds } from './utils/rss.js';
import {
  upsertCVE,
  upsertNews,
  linkCveNews,
  getActiveNotificationEmails,
} from './utils/supabase.js';
import { sendCriticalCVENotification } from './utils/email.js';

async function main() {
  console.log('🚀 Memulai proses pengambilan data CVE...\n');

  // =============================================
  // 1. Ambil CVE dari NVD
  // =============================================
  const cves = await fetchRecentCVEs(2); // 2 hari terakhir
  const criticalCVEs = [];

  console.log('\n📦 Menyimpan data CVE ke Supabase...');

  for (const cve of cves) {
    const saved = await upsertCVE(cve);

    if (saved) {
      console.log(`  ✓ ${saved.cve_id} (${saved.severity})`);

      // Kumpulkan yang Critical untuk notifikasi
      if (saved.severity === 'Critical') {
        criticalCVEs.push(saved);
      }
    }
  }

  // =============================================
  // 2. Ambil berita dari RSS
  // =============================================
  console.log('\n');
  const newsList = await fetchSecurityNews();

  console.log('\n📰 Menyimpan berita & menghubungkan ke CVE...');

  for (const news of newsList) {
    const savedNews = await upsertNews(news);
    if (!savedNews) continue;

    // Cari CVE ID di judul + summary
    const textToSearch = `${news.title} ${news.summary || ''}`;
    const foundCveIds = extractCVEIds(textToSearch);

    for (const cveId of foundCveIds) {
      // Cari CVE yang sudah ada di database
      const matchingCVE = cves.find((c) => c.cve_id === cveId);

      if (matchingCVE) {
        // Ambil UUID dari hasil upsert sebelumnya
        const savedCVE = await upsertCVE(matchingCVE); // sudah ada, hanya untuk dapatkan id
        if (savedCVE?.id) {
          await linkCveNews(savedCVE.id, savedNews.id);
          console.log(`  ✓ Terhubung: ${cveId} ↔ ${news.source_name}`);
        }
      }
    }
  }

  // =============================================
  // 3. Kirim Notifikasi Email (hanya Critical)
  // =============================================
  if (criticalCVEs.length > 0) {
    console.log(`\n📧 Ditemukan ${criticalCVEs.length} CVE Critical. Mengirim notifikasi...`);

    const emails = await getActiveNotificationEmails();

    for (const cve of criticalCVEs) {
      await sendCriticalCVENotification(cve, emails);
    }
  } else {
    console.log('\n📧 Tidak ada CVE Critical hari ini. Tidak ada email yang dikirim.');
  }

  console.log('\n✅ Proses selesai!');
}

main().catch((error) => {
  console.error('❌ Terjadi kesalahan:', error);
  process.exit(1);
});