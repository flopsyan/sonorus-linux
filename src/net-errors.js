// Chromium names a failed load with a code ("net::ERR_CONNECTION_REFUSED").
// This turns the ones that happen in practice into what they mean; the code
// stays in brackets for whoever has to look into it.

const REASONS = {
  ERR_INTERNET_DISCONNECTED: 'Keine Internetverbindung.',
  ERR_NAME_NOT_RESOLVED: 'Diese Adresse gibt es nicht. Stimmt die Server-Adresse?',
  ERR_CONNECTION_REFUSED: 'Der Server nimmt keine Verbindung an. Läuft Sonorus?',
  ERR_CONNECTION_TIMED_OUT: 'Der Server antwortet nicht.',
  ERR_TIMED_OUT: 'Der Server antwortet nicht.',
  ERR_ADDRESS_UNREACHABLE: 'Der Server ist aus diesem Netz nicht zu erreichen.',
  ERR_CONNECTION_RESET: 'Die Verbindung wurde unterbrochen.',
  ERR_CONNECTION_CLOSED: 'Die Verbindung wurde unterbrochen.',
  ERR_NETWORK_CHANGED: 'Das Netzwerk hat gewechselt. Bitte nochmal versuchen.',
  // An https:// address on a port that speaks plain http ends up here.
  ERR_SSL_PROTOCOL_ERROR: 'Die verschlüsselte Verbindung kam nicht zustande. Stimmt http oder https?',
};

/** A sentence for a Chromium error description or message. */
export function describeNetError(text) {
  const code = (String(text ?? '').match(/ERR_[A-Z_]+/) || [])[0];
  if (!code) return String(text ?? '');
  if (code.startsWith('ERR_CERT_')) return `Das Zertifikat des Servers wird nicht akzeptiert. (${code})`;
  return REASONS[code] ? `${REASONS[code]} (${code})` : code;
}

/** The statuses a reverse proxy answers with when Sonorus behind it is gone. */
export const GATEWAY = new Set([502, 503, 504]);

export function describeStatus(status) {
  if (status === 504) return 'Der Server hat zu lange nicht geantwortet (HTTP 504).';
  return `Sonorus ist nicht erreichbar, der Dienst startet vielleicht gerade neu (HTTP ${status}).`;
}
