import CryptoJS from 'crypto-js';

// Helpers to create and parse QR payloads
export function makeQRPayload(user, encrypt = true) {
  const payloadObj = {
    userId: user.id,
    username: user.shareUsername === false ? undefined : user.username,
    name: user.shareName === false ? undefined : user.name,
    timestamp: new Date().toISOString(),
    baseUrl: process.env.REACT_APP_BASE_URL || window.location.origin,
  };
  const json = JSON.stringify(payloadObj);
  if (!encrypt) return json;
  try {
    const key = process.env.REACT_APP_ENCRYPTION_KEY || '';
    if (!key) return json; // no key, return plain JSON
    const cipher = CryptoJS.AES.encrypt(json, key).toString();
    return JSON.stringify({ v: 1, enc: 'AES', data: cipher });
  } catch (e) {
    console.error('Encryption failed, returning plain payload', e);
    return json;
  }
}

export function parseQRPayload(text) {
  // Accept either encrypted wrapper or plain JSON
  try {
    const obj = JSON.parse(text);
    // Encrypted payload wrapper
    if (obj && obj.data && obj.enc === 'AES') {
      const key = process.env.REACT_APP_ENCRYPTION_KEY || '';
      if (!key) return null;
      try {
        const bytes = CryptoJS.AES.decrypt(obj.data, key);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decrypted);
      } catch (e) {
        console.error('Decryption failed', e);
        return null;
      }
    }
    if (obj && (obj.userId || obj.username)) return obj;
  } catch (e) {
    // not JSON
  }
  return null;
}
