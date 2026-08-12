import { useEffect, useState } from 'react';
import { CameraView } from './components/CameraView';
import { StartScreen } from './components/StartScreen';

function cameraError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Camera access was declined. Allow camera access in your browser settings, then try again.';
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'No camera was found on this device. Connect a camera and try again.';
    }
    if (error.name === 'NotReadableError') {
      return 'The camera is already in use by another application.';
    }
  }
  return 'The camera could not be opened. Check your camera connection and try again.';
}

function App() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    stream?.getTracks().forEach((track) => track.stop());
  }, [stream]);

  const startCamera = async () => {
    setError(null);
    setBusy(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is not supported here.');
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setStream(nextStream);
      if (document.documentElement.requestFullscreen) {
        void document.documentElement.requestFullscreen().catch(() => undefined);
      }
    } catch (caught) {
      setError(caught instanceof Error && caught.message === 'Camera access is not supported here.'
        ? 'Camera access is not supported in this browser.'
        : cameraError(caught));
    } finally {
      setBusy(false);
    }
  };

  return stream
    ? <CameraView stream={stream} />
    : <StartScreen onStart={startCamera} busy={busy} error={error} />;
}

export default App;