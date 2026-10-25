import React, { useState, useEffect, useRef } from 'react';

const ASCII_GLYPHS = '!<>-_\\/[]{}—=+*^?#________0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default function ScrambleText({ text, className = '', hoverOnly = true }) {
  const [displayText, setDisplayText] = useState(text);
  const intervalRef = useRef(null);

  const startScramble = () => {
    let iteration = 0;
    const maxIterations = text.length;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText(
        text
          .split('')
          .map((char, index) => {
            if (char === ' ' || char === '/' || char === '[' || char === ']') return char;
            if (index < iteration) {
              return text[index];
            }
            return ASCII_GLYPHS[Math.floor(Math.random() * ASCII_GLYPHS.length)];
          })
          .join('')
      );

      if (iteration >= maxIterations) {
        clearInterval(intervalRef.current);
        setDisplayText(text);
      }

      iteration += 1 / 2;
    }, 25);
  };

  useEffect(() => {
    setDisplayText(text);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text]);

  return (
    <span
      onMouseEnter={startScramble}
      className={`inline-block cursor-default ${className}`}
    >
      {displayText}
    </span>
  );
}
