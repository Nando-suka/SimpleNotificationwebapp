// THis code for supabbase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum di-set');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Upsert data CVE
 */
export async function upsertCVE(cveData) {
  const { data, error } = await supabase
    .from('cves')
    .upsert(cveData, {
      onConflict: 'cve_id',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    console.error(`Gagal upsert CVE ${cveData.cve_id}:`, error.message);
    return null;
  }

  return data;
}

/**
 * Upsert berita
 */
export async function upsertNews(newsData) {
  const { data, error } = await supabase
    .from('news')
    .upsert(newsData, {
      onConflict: 'url',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    console.error(`Gagal upsert news:`, error.message);
    return null;
  }

  return data;
}

/**
 * Hubungkan CVE dengan berita
 */
export async function linkCveNews(cveId, newsId) {
  const { error } = await supabase
    .from('cve_news')
    .upsert(
      { cve_id: cveId, news_id: newsId },
      { onConflict: 'cve_id,news_id', ignoreDuplicates: true }
    );

  if (error) {
    console.error('Gagal link CVE-News:', error.message);
  }
}

/**
 * Ambil daftar email aktif yang ingin menerima notifikasi Critical
 */
export async function getActiveNotificationEmails() {
  const { data, error } = await supabase
    .from('notification_emails')
    .select('email, min_severity')
    .eq('is_active', true);

  if (error) {
    console.error('Gagal mengambil daftar email:', error.message);
    return [];
  }

  // Hanya ambil yang min_severity = Critical (karena kita hanya kirim Critical)
  return data
    .filter((item) => item.min_severity === 'Critical')
    .map((item) => item.email);
}

/**
 * Simpan log notifikasi
 */
export async function logNotification({ cveId, email, status, errorMessage = null }) {
  await supabase.from('notification_logs').insert({
    cve_id: cveId,
    email,
    status,
    error_message: errorMessage,
  });
}