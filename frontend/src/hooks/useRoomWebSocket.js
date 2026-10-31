import { useState, useEffect, useRef, useCallback } from 'react';
import { getWebSocketUrl } from '../config/api';

export function useRoomWebSocket({ roomCode, clientType, onMessage }) {
  const [isConnected, setIsConnected] = useState(false);
  const [audienceCount, setAudienceCount] = useState(0);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!roomCode) return;

    const wsUrl = getWebSocketUrl(roomCode, clientType);

    console.log(`[WebSocket] Connecting to room ${roomCode} as ${clientType} via ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log(`[WebSocket] Connected to room ${roomCode} as ${clientType}`);
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = jsonParse(event.data);
        if (!data) return;

        if (data.type === 'AUDIENCE_COUNT') {
          setAudienceCount(data.count);
        } else if (data.type === 'INIT_STATE') {
          setAudienceCount(data.audience_count || 0);
        }

        if (onMessageRef.current) {
          onMessageRef.current(data);
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse message', err);
      }
    };

    ws.onclose = () => {
      console.log('[WebSocket] Connection closed. Retrying in 2.5s...');
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 2500);
    };

    ws.onerror = (err) => {
      console.warn('[WebSocket] Error encountered', err);
      ws.close();
    };
  }, [roomCode, clientType]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((msg) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    } else {
      console.warn('[WebSocket] Cannot send message, socket not open', msg);
    }
  }, []);

  return { isConnected, audienceCount, sendMessage };
}

function jsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
