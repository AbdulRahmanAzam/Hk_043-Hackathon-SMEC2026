export const STORAGE_KEYS = {
  USER: 'qrconnect_user',
  CONNECTIONS: 'qrconnect_connections'
};

export function loadUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Failed to load user from storage', e);
    return null;
  }
}

export function saveUser(user) {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save user to storage', e);
  }
}

export function loadConnections() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONNECTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load connections', e);
    return [];
  }
}

export function saveConnections(conns) {
  try {
    localStorage.setItem(STORAGE_KEYS.CONNECTIONS, JSON.stringify(conns));
  } catch (e) {
    console.error('Failed to save connections to storage', e);
  }
}
