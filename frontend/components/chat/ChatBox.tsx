'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useSocket } from '@/lib/hooks/useSocket';
import apiClient from '@/lib/api/client';
import { Skeleton } from '../ui/skeleton';

interface ChatBoxProps {
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  missionId?: string;
}

export function ChatBox({ otherUser, missionId }: ChatBoxProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { connected, sendMessage, setTyping } = useSocket();

  useEffect(() => {
    loadMessages();
  }, [otherUser.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await apiClient.get(`/chat/conversation/${otherUser.id}`);
      setMessages(response.data.reverse());
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Optimistic update
    const tempMessage = {
      id: Date.now().toString(),
      senderId: 'me',
      content: newMessage,
      createdAt: new Date(),
      read: false,
    };

    setMessages((prev) => [...prev, tempMessage]);
    sendMessage(otherUser.id, newMessage, missionId);
    setNewMessage('');
    setTyping(otherUser.id, false);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (e.target.value.length > 0) {
      setTyping(otherUser.id, true);
    } else {
      setTyping(otherUser.id, false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-[600px] bg-card rounded-lg shadow" role="status" aria-label="Chargement de la conversation">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        {/* Messages skeleton */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Received message */}
          <div className="flex justify-start">
            <div className="max-w-[70%] space-y-2">
              <Skeleton className="h-12 w-48 rounded-lg" />
            </div>
          </div>
          {/* Sent message */}
          <div className="flex justify-end">
            <div className="max-w-[70%] space-y-2">
              <Skeleton className="h-16 w-56 rounded-lg" />
            </div>
          </div>
          {/* Received message */}
          <div className="flex justify-start">
            <div className="max-w-[70%] space-y-2">
              <Skeleton className="h-10 w-40 rounded-lg" />
            </div>
          </div>
        </div>
        {/* Input skeleton */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Skeleton className="flex-1 h-10" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-card rounded-lg shadow">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
          {otherUser.firstName[0]}
          {otherUser.lastName[0]}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">
            {otherUser.firstName} {otherUser.lastName}
          </h3>
          <p className="text-sm text-muted-foreground">
            {connected ? (
              <span className="text-green-600">● En ligne</span>
            ) : (
              <span className="text-muted-foreground">○ Hors ligne</span>
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8">
            Aucun message. Commencez la conversation !
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  msg.senderId === 'me'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.senderId === 'me' ? 'text-blue-100' : 'text-muted-foreground'
                  }`}
                >
                  {formatTime(msg.createdAt)}
                  {msg.senderId === 'me' && (
                    <span className="ml-1">{msg.read ? '✓✓' : '✓'}</span>
                  )}
                </p>
              </div>
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Tapez votre message..."
            value={newMessage}
            onChange={handleTyping}
            disabled={!connected}
            className="flex-1"
          />
          <Button type="submit" disabled={!connected || !newMessage.trim()}>
            Envoyer
          </Button>
        </div>
      </form>
    </div>
  );
}
