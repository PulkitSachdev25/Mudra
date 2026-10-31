import { useState, useEffect, useRef, useCallback } from 'react';

const FILLER_REGEX_MAP = {
  um: /\b(um|umm|ummm)\b/gi,
  uh: /\b(uh|uhh|uhhh|er|ah)\b/gi,
  like: /\blike\b/gi,
  basically: /\bbasically\b/gi,
  you_know: /\byou know\b/gi,
  actually: /\bactually\b/gi,
  literally: /\bliterally\b/gi,
  i_mean: /\bi mean\b/gi,
};

function countFillersInText(text) {
  const counts = {};
  let total = 0;
  for (const [key, regex] of Object.entries(FILLER_REGEX_MAP)) {
    const matches = text.match(regex);
    const count = matches ? matches.length : 0;
    counts[key] = count;
    total += count;
  }
  return { counts, total };
}

export function useSpeechRecognition({ active = true } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcriptBuffer, setTranscriptBuffer] = useState([]);
  const fullTranscriptRef = useRef([]);
  const [fillerCounts, setFillerCounts] = useState({
    um: 0,
    uh: 0,
    like: 0,
    basically: 0,
    you_know: 0,
    actually: 0,
    literally: 0,
    i_mean: 0,
    total: 0,
  });

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

        const trimmed = finalChunk.trim();
        if (trimmed) {
          const now = Date.now();
          // 1. Maintain rolling buffer for MOM snapshots
          setTranscriptBuffer((prev) => [
            ...prev.filter((item) => now - item.timestamp < 120000), // Keep last 2 minutes
            { text: trimmed, timestamp: now },
          ]);

          // 2. Accumulate full presentation session transcript
          fullTranscriptRef.current.push(trimmed);

          // 3. Count filler words purely client-side in real-time
          const { counts, total } = countFillersInText(trimmed);
          if (total > 0) {
            setFillerCounts((prev) => {
              const next = { ...prev };
              for (const [key, num] of Object.entries(counts)) {
                next[key] = (next[key] || 0) + num;
              }
              next.total = (next.total || 0) + total;
              return next;
            });
          }
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

  const getRecentTranscript = useCallback((windowSeconds = 30) => {
    const cutoff = Date.now() - windowSeconds * 1000;
    const recent = transcriptBuffer.filter((item) => item.timestamp >= cutoff);
    if (recent.length === 0) return '';
    return recent.map((item) => item.text).join(' ');
  }, [transcriptBuffer]);

  const getFullTranscript = useCallback(() => {
    return fullTranscriptRef.current.join(' ');
  }, []);

  const resetSessionTelemetry = useCallback(() => {
    fullTranscriptRef.current = [];
    setTranscriptBuffer([]);
    setFillerCounts({
      um: 0,
      uh: 0,
      like: 0,
      basically: 0,
      you_know: 0,
      actually: 0,
      literally: 0,
      i_mean: 0,
      total: 0,
    });
  }, []);

  return { 
    isListening, 
    getRecentTranscript, 
    getFullTranscript, 
    fillerCounts, 
    totalFillerWords: fillerCounts.total,
    resetSessionTelemetry
  };
}
