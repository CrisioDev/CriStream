import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { WsEvents } from "@streamguard/shared";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io({ path: "/ws" });
    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    return () => {
      socket.disconnect();
    };
  }, []);

  function on<K extends keyof WsEvents>(event: K, handler: (data: WsEvents[K]) => void) {
    socketRef.current?.on(event as string, handler);
    return () => {
      socketRef.current?.off(event as string, handler);
    };
  }

  return { on, isConnected };
}
