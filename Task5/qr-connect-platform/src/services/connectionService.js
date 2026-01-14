import { parseISO, format } from 'date-fns';

const STORAGE_KEY = 'qrconnect_connections_v1';

export async function loadConnections() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('loadConnections error', e);
    return [];
  }
}

export async function saveConnections(conns) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conns));
  } catch (e) {
    console.error('saveConnections error', e);
  }
}

export function formatDate(dateStr) {
  try {
    return format(parseISO(dateStr), 'PP p');
  } catch (e) {
    return dateStr;
  }
}
