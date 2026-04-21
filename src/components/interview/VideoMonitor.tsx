import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Eye } from "lucide-react";

interface Props {
  onViolation: (type: "multiple_faces" | "no_face" | "looking_away") => void;
  enabled: boolean;
}

export function VideoMonitor({ onViolation, enabled }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceCount, setFaceCount] = useState<number | null>(null);
  const lastViolationRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setActive(true);
      } catch (e: any) {
        setError(e?.message ?? "Camera blocked");
      }
    }
    start();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled]);

  // Lightweight face detection using FaceDetector API (Chromium) with brightness fallback
  useEffect(() => {
    if (!active) return;
    let detector: any = null;
    // @ts-ignore - experimental API
    if (typeof window !== "undefined" && "FaceDetector" in window) {
      try {
        // @ts-ignore
        detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
      } catch {}
    }

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    function fireOnce(type: "multiple_faces" | "no_face" | "looking_away", ms = 8000) {
      const now = Date.now();
      if ((lastViolationRef.current[type] ?? 0) + ms > now) return;
      lastViolationRef.current[type] = now;
      onViolation(type);
    }

    const interval = setInterval(async () => {
      const v = videoRef.current;
      if (!v || v.readyState < 2 || !ctx) return;

      if (detector) {
        try {
          const faces = await detector.detect(v);
          setFaceCount(faces.length);
          if (faces.length === 0) fireOnce("no_face");
          else if (faces.length > 1) fireOnce("multiple_faces", 5000);
          else {
            // crude looking-away heuristic via face bbox center
            const f = faces[0];
            const cx = (f.boundingBox.x + f.boundingBox.width / 2) / v.videoWidth;
            if (cx < 0.25 || cx > 0.75) fireOnce("looking_away", 10000);
          }
          return;
        } catch {}
      }
      // Fallback: brightness-based motion check
      try {
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let sum = 0;
        for (let i = 0; i < data.length; i += 16) sum += data[i] + data[i + 1] + data[i + 2];
        const avg = sum / (data.length / 16) / 3;
        if (avg < 25) fireOnce("no_face");
      } catch {}
    }, 2500);

    return () => clearInterval(interval);
  }, [active, onViolation]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-foreground shadow-elevated">
      <div className="flex items-center justify-between border-b border-background/10 px-3 py-2 text-[11px] uppercase tracking-widest text-background/70">
        <div className="flex items-center gap-1.5">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${active ? "bg-background animate-pulse" : "bg-background/30"}`} />
          {active ? "Live" : error ? "Off" : "Starting…"}
        </div>
        {faceCount !== null && (
          <div className="flex items-center gap-1 text-background/70">
            <Eye className="h-3 w-3" /> {faceCount}
          </div>
        )}
      </div>
      <div className="relative aspect-[4/3] bg-black">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-xs text-background/70">
            <CameraOff className="h-6 w-6" />
            <span>{error}</span>
          </div>
        ) : (
          <video ref={videoRef} muted playsInline className="h-full w-full scale-x-[-1] object-cover" />
        )}
      </div>
    </div>
  );
}
