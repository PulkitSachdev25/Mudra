import { useState, useEffect, useRef, useCallback } from 'react';

export function useSpeechRecognition({ active = true } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcriptBuffer, setTranscriptBuffer] = useState([]);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[Speech] Web Speech API not supported in this browser environment.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        console.log('[Speech] Listening started.');
      };

      recognition.onresult = (event) => {
        let finalChunk = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript + ' ';
          }
        }

        if (finalChunk.trim()) {
          const now = Date.now();
          setTranscriptBuffer((prev) => [
            ...prev.filter((item) => now - item.timestamp < 120000), // Keep last 2 minutes
            { text: finalChunk.trim(), timestamp: now },
          ]);
        }
      };

      recognition.onerror = (err) => {
        // Silently restart on no-speech or network glitches
        if (err.error !== 'no-speech') {
          console.warn('[Speech] Recognition error:', err.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // Automatically restart to keep speech buffer fresh during presentations
        if (active) {
          try {
            recognition.start();
          } catch {
            // Already active or denied
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('[Speech] Could not start speech recognition:', err);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [active]);

  const getRecentTranscript = useCallback((windowSeconds = 60) => {
    const cutoff = Date.now() - windowSeconds * 1000;
    const recent = transcriptBuffer.filter((item) => item.timestamp >= cutoff);
    if (recent.length === 0) return '';
    return recent.map((item) => item.text).join(' ');
  }, [transcriptBuffer]);

  return { isListening, getRecentTranscript };
}
