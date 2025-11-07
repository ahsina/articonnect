'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: Date;
  read: boolean;
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    newSocket.on('new_message', (message: Message) => {
      setMessages((prev) => [...prev, message]);

      // Show notification
      if (Notification.permission === 'granted') {
        new Notification('Nouveau message', {
          body: message.content.substring(0, 50),
          icon: '/icon-192x192.png',
        });
      }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const sendMessage = (receiverId: string, content: string, missionId?: string) => {
    if (!socket) return;

    socket.emit('send_message', {
      receiverId,
      content,
      missionId,
      tempId: Date.now().toString(),
    });
  };

  const markAsRead = (messageId: string) => {
    if (!socket) return;
    socket.emit('mark_read', { messageId });
  };

  const setTyping = (receiverId: string, isTyping: boolean) => {
    if (!socket) return;
    socket.emit('typing', { receiverId, isTyping });
  };

  return {
    socket,
    connected,
    messages,
    sendMessage,
    markAsRead,
    setTyping,
  };
}
