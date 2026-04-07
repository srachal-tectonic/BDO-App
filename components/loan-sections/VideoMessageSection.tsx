'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { authenticatedFormPost } from '@/lib/authenticatedFetch';
import { Camera, Square, Play, Upload, RotateCcw, AlertCircle, CheckCircle2, Video } from 'lucide-react';

type RecorderState = 'idle' | 'previewing' | 'recording' | 'recorded' | 'uploading' | 'uploaded' | 'error';

const MAX_DURATION_SECONDS = 120;

function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
}

interface VideoMessageSectionProps {
  projectId: string;
}

export default function VideoMessageSection({ projectId }: VideoMessageSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<RecorderState>('idle');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadResult, setUploadResult] = useState<{ fileId: string; filename: string } | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllTracks();
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const enableCamera = async () => {
    try {
      setErrorMessage('');

      // Check for secure context (HTTPS or localhost) - required for getUserMedia
      if (!window.isSecureContext) {
        setErrorMessage(
          `Camera access requires HTTPS or localhost. Current origin "${window.location.origin}" is not a secure context. ` +
          'If using WSL, access the app via localhost:3000 instead of an IP address.'
        );
        setState('error');
        return;
      }

      // Check that the API is available
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMessage(
          'Camera API is not available in this browser. Ensure you are using a modern browser over HTTPS or localhost.'
        );
        setState('error');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }

      setState('previewing');
    } catch (err) {
      console.error('Camera access error:', err);
      const error = err as DOMException;
      if (error.name === 'NotAllowedError') {
        setErrorMessage(
          'Camera/microphone permission was denied. Please allow access in your browser settings and try again.'
        );
      } else if (error.name === 'NotFoundError') {
        setErrorMessage(
          'No camera or microphone found. Please connect a camera and try again.'
        );
      } else if (error.name === 'NotReadableError' || error.name === 'AbortError') {
        setErrorMessage(
          'Camera is already in use by another application. Please close other apps using the camera and try again.'
        );
      } else {
        setErrorMessage(
          `Could not access camera/microphone: ${error.name || 'Unknown error'} - ${error.message || 'Please check browser permissions.'}`
        );
      }
      setState('error');
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    setElapsed(0);

    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(streamRef.current, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      stopAllTracks();
      setState('recorded');

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1000); // collect data every second
    setState('recording');

    // Timer
    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= MAX_DURATION_SECONDS) {
          stopRecording();
        }
        return next;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetRecording = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
    setUploadResult(null);
    setErrorMessage('');
    setState('idle');
  };

  const uploadVideo = async () => {
    if (!recordedBlob) return;

    setState('uploading');
    setErrorMessage('');

    try {
      const ext = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const filename = `video-message-${Date.now()}.${ext}`;
      const formData = new FormData();
      formData.append('file', recordedBlob, filename);
      formData.append('loanAppId', projectId);

      const response = await authenticatedFormPost('/api/video-messages', formData);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      setUploadResult({ fileId: result.fileId, filename: result.filename });
      setState('uploaded');
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload video');
      setState('error');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const remaining = MAX_DURATION_SECONDS - elapsed;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Video Message</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Record a short video message (up to 2 minutes) to include with this loan application.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {state === 'uploaded' && uploadResult && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>Upload Complete</AlertTitle>
          <AlertDescription>
            Video &quot;{uploadResult.filename}&quot; has been uploaded successfully.
          </AlertDescription>
        </Alert>
      )}

      {/* Video Display */}
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-w-2xl">
        {state === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4">
            <Video className="w-16 h-16 opacity-50" />
            <p className="text-sm opacity-70">Enable your camera to get started</p>
          </div>
        )}

        {(state === 'recorded' || state === 'uploading' || state === 'uploaded') && recordedUrl ? (
          <video
            className="w-full h-full object-contain"
            src={recordedUrl}
            controls
            playsInline
          />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            muted
            style={{ display: state === 'previewing' || state === 'recording' ? 'block' : 'none' }}
          />
        )}

        {/* Recording Indicator */}
        {state === 'recording' && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white text-sm font-mono">
              {formatTime(elapsed)} / {formatTime(MAX_DURATION_SECONDS)}
            </span>
          </div>
        )}

        {/* Time Remaining Warning */}
        {state === 'recording' && remaining <= 10 && (
          <div className="absolute top-4 right-4 bg-red-600/80 text-white rounded-full px-3 py-1.5 text-sm font-medium">
            {remaining}s left
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {state === 'idle' && (
          <Button onClick={enableCamera} className="gap-2">
            <Camera className="w-4 h-4" />
            Enable Camera
          </Button>
        )}

        {state === 'previewing' && (
          <Button onClick={startRecording} variant="destructive" className="gap-2">
            <span className="w-3 h-3 bg-white rounded-full" />
            Start Recording
          </Button>
        )}

        {state === 'recording' && (
          <Button onClick={stopRecording} variant="destructive" className="gap-2">
            <Square className="w-4 h-4" />
            Stop Recording
          </Button>
        )}

        {state === 'recorded' && (
          <>
            <Button onClick={uploadVideo} className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Video
            </Button>
            <Button onClick={resetRecording} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Re-record
            </Button>
          </>
        )}

        {state === 'uploading' && (
          <Button disabled className="gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Uploading...
          </Button>
        )}

        {state === 'uploaded' && (
          <Button onClick={resetRecording} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Record Another
          </Button>
        )}

        {state === 'error' && (
          <Button onClick={resetRecording} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}
