"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lettore QR con la fotocamera posteriore.
 * La libreria zxing viene importata solo nel browser: è pesante e inutile
 * sul server.
 */
export default function QrScanner({
  onResult,
  paused = false,
}: {
  onResult: (text: string) => void;
  paused?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  // La callback può cambiare a ogni render: teniamola in un ref per non
  // riavviare la fotocamera ogni volta.
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (paused) return;

    let controls: { stop: () => void } | undefined;
    let disposed = false;

    (async () => {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const reader = new BrowserQRCodeReader();
        const result = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current!,
          (decoded) => {
            if (decoded) onResultRef.current(decoded.getText());
          },
        );
        if (disposed) result.stop();
        else controls = result;
      } catch (cause) {
        setError(
          cause instanceof Error && cause.name === "NotAllowedError"
            ? "Accesso alla fotocamera negato. Autorizzalo dalle impostazioni del browser."
            : "Fotocamera non disponibile su questo dispositivo.",
        );
      }
    })();

    return () => {
      disposed = true;
      controls?.stop();
    };
  }, [paused]);

  if (error) {
    return (
      <p className="rounded-xl border border-danger/50 bg-danger/10 px-3 py-3 text-sm text-danger">
        {error} Puoi comunque digitare il codice a mano qui sotto.
      </p>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
      <video
        ref={videoRef}
        className="aspect-square w-full object-cover"
        muted
        playsInline
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-8 rounded-xl border-2 border-accent/80"
      />
    </div>
  );
}
