import { Resend } from 'resend';
import { logNotification } from './supabase.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'CVE Alert <onboarding@resend.dev>';

/**
 * Kirim notifikasi email untuk CVE Critical
 */
export async function sendCriticalCVENotification(cve, emails = []) {
  if (!emails.length) {
    console.log('Tidak ada email aktif untuk menerima notifikasi Critical');
    return;
  }

  const subject = `[CRITICAL] ${cve.cve_id} - CVSS ${cve.cvss_score || 'N/A'}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">🚨 Critical CVE Detected</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <tr>
          <td style="padding: 8px; font-weight: bold; width: 140px;">CVE ID</td>
          <td style="padding: 8px;">${cve.cve_id}</td>
        </tr>
        <tr style="background: #f9fafb;">
          <td style="padding: 8px; font-weight: bold;">Severity</td>
          <td style="padding: 8px; color: #dc2626; font-weight: bold;">${cve.severity}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">CVSS Score</td>
          <td style="padding: 8px;">${cve.cvss_score ?? 'N/A'}</td>
        </tr>
        <tr style="background: #f9fafb;">
          <td style="padding: 8px; font-weight: bold;">Published</td>
          <td style="padding: 8px;">${cve.published_at ? new Date(cve.published_at).toLocaleString('id-ID') : 'N/A'}</td>
        </tr>
      </table>

      <h3 style="margin-top: 24px;">Description</h3>
      <p style="line-height: 1.6; color: #374151;">
        ${cve.description ? cve.description.substring(0, 600) + (cve.description.length > 600 ? '...' : '') : 'No description available.'}
      </p>

      <p style="margin-top: 24px;">
        <a href="https://nvd.nist.gov/vuln/detail/${cve.cve_id}" 
           style="background: #dc2626; color: white; padding: 10px 16px; text-decoration: none; border-radius: 6px;">
          Lihat Detail di NVD
        </a>
      </p>

      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #9ca3af;">
        Email ini dikirim otomatis oleh sistem CVE Dashboard.
      </p>
    </div>
  `;

  for (const email of emails) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: subject,
        html: htmlContent,
      });

      console.log(`Email berhasil dikirim ke: ${email} (${cve.cve_id})`);

      await logNotification({
        cveId: cve.id,
        email,
        status: 'success',
      });
    } catch (error) {
      console.error(`Gagal kirim email ke ${email}:`, error.message);

      await logNotification({
        cveId: cve.id,
        email,
        status: 'failed',
        errorMessage: error.message,
      });
    }
  }
}