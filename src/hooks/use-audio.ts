"use client";

import { useCallback } from "react";

/**
 * Provides audio utilities for the app.
 *
 * snap.mp3: plays a short click/snap sound.
 * Asset: /public/snap.mp3 required — add a short CC0 click/snap sound
 */
export function useAudio() {
  const playSnap = useCallback(() => {
    // Asset: /public/snap.mp3 required — add a short CC0 click/snap sound
    try {
      if (typeof window === "undefined") return;
      const audio = new Audio("/snap.mp3");
      audio.volume = 0.4;
      audio.play().catch(() => {
        // Ignore autoplay policy errors silently
      });
    } catch {
      // Ignore missing file or unsupported browser silently
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.9;
      utter.pitch = 1.1;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech errors silently
    }
  }, []);

  return { playSnap, speak };
}
