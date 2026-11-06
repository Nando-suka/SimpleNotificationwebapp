import fetch from 'node-fetch';

const NVD_API_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0';

/**
 * Ambil CVE dari NVD berdasarkan rentang tanggal
 * @param {number} daysBack - Ambil data berapa hari ke belakang (default 2 hari)
 */
export async function fetchRecentCVEs(daysBack = 2) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - daysBack);

  // Format: YYYY-MM-DDTHH:mm:ss.sssZ
  const pubStartDate = startDate.toISOString();
  const pubEndDate = endDate.toISOString();

  const url = `${NVD_API_BASE}?pubStartDate=${pubStartDate}&pubEndDate=${pubEndDate}&resultsPerPage=200`;

  console.log(`Mengambil CVE dari NVD (${daysBack} hari terakhir)...`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CVE-Dashboard-Portfolio/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`NVD API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    const vulnerabilities = json.vulnerabilities || [];

    console.log(`Berhasil mengambil ${vulnerabilities.length} CVE dari NVD`);

    return vulnerabilities.map(parseNvdItem).filter(Boolean);
  } catch (error) {
    console.error('Gagal mengambil data dari NVD:', error.message);
    return [];
  }
}

/**
 * Parsing data mentah dari NVD menjadi format tabel kita
 */
function parseNvdItem(item) {
  try {
    const cve = item.cve;
    if (!cve || !cve.id) return null;

    // Ambil CVSS score (prioritas V3.1 → V3.0 → V2)
    let cvssScore = null;
    let cvssVector = null;
    let severity = 'Unknown';

    const metrics = cve.metrics || {};

    if (metrics.cvssMetricV31 && metrics.cvssMetricV31.length > 0) {
      const cvss = metrics.cvssMetricV31[0].cvssData;
      cvssScore = cvss.baseScore;
      cvssVector = cvss.vectorString;
      severity = cvss.baseSeverity; // CRITICAL, HIGH, MEDIUM, LOW
    } else if (metrics.cvssMetricV30 && metrics.cvssMetricV30.length > 0) {
      const cvss = metrics.cvssMetricV30[0].cvssData;
      cvssScore = cvss.baseScore;
      cvssVector = cvss.vectorString;
      severity = cvss.baseSeverity;
    } else if (metrics.cvssMetricV2 && metrics.cvssMetricV2.length > 0) {
      const cvss = metrics.cvssMetricV2[0].cvssData;
      cvssScore = cvss.baseScore;
      cvssVector = cvss.vectorString;
      severity = metrics.cvssMetricV2[0].baseSeverity || 'Unknown';
    }

    // Normalisasi severity
    severity = normalizeSeverity(severity);

    // Ambil deskripsi (prefer Bahasa Inggris)
    let description = '';
    if (cve.descriptions && cve.descriptions.length > 0) {
      const enDesc = cve.descriptions.find((d) => d.lang === 'en');
      description = enDesc ? enDesc.value : cve.descriptions[0].value;
    }

    // Ambil referensi
    const referenceLinks = (cve.references || []).map((ref) => ({
      url: ref.url,
      source: ref.source || null,
    }));

    return {
      cve_id: cve.id,
      title: `${cve.id}`,
      description: description,
      severity: severity,
      cvss_score: cvssScore,
      cvss_vector: cvssVector,
      published_at: cve.published || null,
      last_modified_at: cve.lastModified || null,
      reference_links: referenceLinks,
      affected_products: [],
      source: 'nvd',
    };
  } catch (error) {
    console.error('Gagal parsing item NVD:', error.message);
    return null;
  }
}

/**
 * Normalisasi nilai severity
 */
function normalizeSeverity(severity) {
  if (!severity) return 'Unknown';

  const s = severity.toString().toUpperCase();

  if (s.includes('CRITICAL')) return 'Critical';
  if (s.includes('HIGH')) return 'High';
  if (s.includes('MEDIUM') || s.includes('MODERATE')) return 'Medium';
  if (s.includes('LOW')) return 'Low';
  if (s.includes('NONE')) return 'None';

  return 'Unknown';
}