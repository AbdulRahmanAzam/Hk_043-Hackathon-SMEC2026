import { useEffect, useMemo, useState } from 'react';
import { useZxing } from 'react-zxing';

export default function useQRScanner({ onDecode, onError, facingMode = 'environment' }) {
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [permission, setPermission] = useState('prompt'); // 'granted' | 'denied' | 'prompt'

  useEffect(() => {
    async function bootstrap() {
      try {
        const perm = await navigator.permissions?.query?.({ name: 'camera' });
        if (perm && perm.state) setPermission(perm.state);
      } catch {}
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        const cams = all.filter(d => d.kind === 'videoinput');
        setDevices(cams);
        if (!deviceId && cams.length) setDeviceId(cams[0].deviceId);
      } catch (e) {
        onError?.(e);
      }
    }
    bootstrap();
  }, [deviceId, onError]);

  const constraints = useMemo(() => ({
    video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode },
    audio: false,
  }), [deviceId, facingMode]);

  const { ref, torch } = useZxing({
    constraints,
    onDecodeResult: (result) => {
      const text = result.getText();
      onDecode?.(text);
    },
    onError: (err) => onError?.(err),
    timeBetweenDecodingAttempts: 250,
  });

  return { ref, devices, deviceId, setDeviceId, torch, permission };
}