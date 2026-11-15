const MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');

/** "13 066 pozycji", with the Polish plural forms of "pozycja". */
export function itemsLabel(n: number): string {
  const last = n % 10;
  const tens = n % 100;
  const word = n === 1 ? 'pozycja' : last >= 2 && last <= 4 && !(tens >= 12 && tens <= 14) ? 'pozycje' : 'pozycji';
  return `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${word}`;
}

/** "12 października 2025" from the calendar date written in an ISO string (no time zone conversion). */
export function formatPlDate(iso: string | null | undefined): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : '';
}

/** Plain-Polish text for an error thrown while talking to Immich. */
export { group as groupThousands };

export function describeError(message: string): string {
  const code = message.match(/^Immich (\d{3})$/)?.[1];
  if (!code) return 'Brak połączenia z serwerem Immich';
  return code === '401' || code === '403' ? `Serwer odrzucił klucz API (kod ${code})` : `Serwer odpowiedział błędem (kod ${code})`;
}
