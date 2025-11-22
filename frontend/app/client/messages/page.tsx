'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { chatApi } from '@/lib/api/chat';
import { useSocket } from '@/lib/hooks/useSocket';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/hooks/useToast';
import { useLanguage } from '@/contexts/LanguageContext';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  read: boolean;
}

interface Conversation {
  userId: string; // ID de l'autre utilisateur
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role?: string;
  };
  lastMessage?: Message;
  unreadCount: number;
}

export default function MessagesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Socket.IO pour temps réel
  const { socket, connected, messages: socketMessages, sendMessage: socketSendMessage } = useSocket();

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Gérer les nouveaux messages du socket
  useEffect(() => {
    if (socketMessages.length > 0) {
      const latestSocketMessage = socketMessages[socketMessages.length - 1];

      // Vérifier si le message est pour la conversation actuelle
      if (
        selectedConversation &&
        (latestSocketMessage.senderId === selectedConversation ||
          latestSocketMessage.receiverId === selectedConversation)
      ) {
        // Ajouter le message s'il n'existe pas déjà
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === latestSocketMessage.id);
          if (!exists) {
            return [...prev, { ...latestSocketMessage, createdAt: new Date(latestSocketMessage.createdAt).toISOString() }];
          }
          return prev;
        });
      }
    }
  }, [socketMessages, selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const data = await chatApi.getConversations();

      setConversations(data);
      if (data.length > 0) {
        setSelectedConversation(data[0].userId);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (userId: string) => {
    try {
      const data = await chatApi.getConversation(userId, 100);
      setMessages(data);

      // Mark conversation as read
      await chatApi.markAsRead(userId);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      if (connected && socketSendMessage) {
        // Optimistic update
        const tempMessage: Message = {
          id: `temp-${Date.now()}`,
          content: newMessage,
          senderId: user.id,
          receiverId: selectedConversation,
          createdAt: new Date().toISOString(),
          read: false,
        };

        setMessages([...messages, tempMessage]);

        // Envoyer via Socket.IO
        socketSendMessage(selectedConversation, newMessage);
        setNewMessage('');
      } else {
        toast({
          title: t('common', 'error'),
          description: t('common', 'error'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: t('common', 'error'),
        description: t('common', 'error'),
        variant: 'destructive',
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('common', 'today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('common', 'yesterday');
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  const selectedConv = conversations.find((c) => c.userId === selectedConversation);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">{t('common', 'loading')}</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900">{t('common', 'messages')}</h1>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connected ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                  title={connected ? t('common', 'connected') : t('common', 'disconnected')}
                />
                <span className="text-xs text-gray-500">
                  {connected ? t('common', 'online') : t('common', 'offline')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {t('common', 'noConversations')}
              </div>
            ) : (
              <div>
                {conversations.map((conv) => (
                  <button
                    key={conv.userId}
                    onClick={() => setSelectedConversation(conv.userId)}
                    className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                      selectedConversation === conv.userId ? 'bg-blue-50' : ''
                    }`}
                  >
                    <img
                      src={conv.user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                      alt={conv.user.firstName}
                      className="w-12 h-12 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 truncate">
                          {conv.user.firstName} {conv.user.lastName}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 flex-shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 truncate">
                            {conv.lastMessage.content}
                          </p>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatDate(conv.lastMessage.createdAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3">
                <img
                  src={selectedConv.user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                  alt={selectedConv.user.firstName}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedConv.user.firstName} {selectedConv.user.lastName}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selectedConv.user.role === 'ARTISAN' ? t('auth', 'artisan') : t('auth', 'client')}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                  const isOwn = message.senderId === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isOwn
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="break-words">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="bg-white border-t border-gray-200 p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('common', 'typeMessage')}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newMessage.trim()}>
                    {t('common', 'send')}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              {t('common', 'selectConversation')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
