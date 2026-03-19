import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { WsEvents } from "@streamguard/shared";

export function useSocket(channelId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const currentChannelRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const socket = io({ path: "/ws" });
    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    return () => {
      socket.disconnect();
    };
  }, []);

  // Join/leave channel rooms when channelId changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    if (currentChannelRef.current) {
      socket.emit("leave:channel", currentChannelRef.current);
    }

    if (channelId) {
      socket.emit("join:channel", channelId);
    }

    currentChannelRef.current = channelId;
  }, [channelId]);

  function on<K extends keyof WsEvents>(event: K, handler: (data: WsEvents[K]) => void) {
    socketRef.current?.on(event as string, handler);
    return () => {
      socketRef.current?.off(event as string, handler);
    };
  }

  function emit<K extends keyof WsEvents>(event: K, data: WsEvents[K]) {
    socketRef.current?.emit(event as string, data);
  }

  return { on, emit, isConnected };
}
