'use client';

import { Send, ArrowLeft, Lock } from 'lucide-react';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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

function MessagesContent() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  // Deep-link : ?userId ouvre directement la conversation avec cet utilisateur
  const targetUserId = searchParams.get('userId');
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

  // Deep-link ?userId : présélectionne la conversation ciblée (même si aucune
  // n'existe encore → conversation vide pour écrire directement à cet utilisateur).
  useEffect(() => {
    if (targetUserId) {
      setSelectedConversation(targetUserId);
    }
  }, [targetUserId]);

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
      // Fallback « 1re conversation » uniquement si aucun deep-link ?userId n'est demandé.
      if (data.length > 0 && !selectedConversation && !targetUserId) {
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

  // Si une conversation ciblée (deep-link) n'existe pas encore, on synthétise une
  // conversation vide pour afficher la zone de chat et pouvoir écrire directement.
  // Dès le 1er message échangé, la vraie conversation (avec infos utilisateur) la remplace.
  const selectedConv =
    conversations.find((c) => c.userId === selectedConversation) ||
    (selectedConversation
      ? {
          userId: selectedConversation,
          user: { id: selectedConversation, firstName: '', lastName: '' },
          unreadCount: 0,
        }
      : undefined);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-background flex flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 overflow-hidden px-0 sm:px-6 sm:pb-5">
        <div className="flex w-full overflow-hidden border-border bg-card sm:rounded-2xl sm:border sm:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.05)]">
          {/* Conversations List */}
          <div
            className={`${
              selectedConversation ? 'hidden lg:flex' : 'flex'
            } w-full lg:w-80 flex-col border-r border-border`}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h1 className="font-display text-lg font-extrabold tracking-tight text-foreground">
                {t('common', 'messages')}
              </h1>
              <div className="flex items-center gap-1.5">
                <div
                  className={`h-2 w-2 rounded-full ${
                    connected ? 'bg-success' : 'bg-muted-foreground/40'
                  }`}
                  title={connected ? t('common', 'connected') : t('common', 'disconnected')}
                />
                <span className="text-xs text-muted-foreground">
                  {connected ? t('common', 'online') : t('common', 'offline')}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {t('common', 'noConversations')}
                </div>
              ) : (
                <div>
                  {conversations.map((conv) => (
                    <button
                      key={conv.userId}
                      onClick={() => setSelectedConversation(conv.userId)}
                      className={`flex w-full items-start gap-3 border-b border-border p-4 text-left transition-colors hover:bg-muted ${
                        selectedConversation === conv.userId ? 'bg-muted' : ''
                      }`}
                    >
                      <img
                        src={conv.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                        alt={conv.user?.firstName}
                        className="h-11 w-11 flex-shrink-0 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          <span className="truncate font-semibold text-foreground">
                            {conv.user?.firstName || ""} {conv.user?.lastName || ""}
                          </span>
                          {conv.lastMessage && (
                            <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                              {formatDate(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {conv.lastMessage && (
                            <p className="truncate text-sm text-muted-foreground">
                              {conv.lastMessage.content}
                            </p>
                          )}
                          {conv.unreadCount > 0 && (
                            <span className="flex h-[19px] min-w-[19px] flex-shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div
            className={`${
              selectedConversation ? 'flex' : 'hidden lg:flex'
            } min-w-0 flex-1 flex-col bg-background`}
          >
            {selectedConv ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 border-b border-border bg-card p-3.5">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    aria-label={t('common', 'back')}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full hover:bg-muted lg:hidden"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <img
                    src={selectedConv.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                    alt={selectedConv.user?.firstName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <h2 className="font-display font-bold text-foreground">
                      {selectedConv.user?.firstName || ""} {selectedConv.user?.lastName || ""}
                    </h2>
                    <p className="text-[13px] text-muted-foreground">
                      {selectedConv.user?.role === 'ARTISAN' ? t('auth', 'artisan') : t('auth', 'client')}
                    </p>
                  </div>
                </div>

                {/* Messages (bulles façon WhatsApp/Uber) */}
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-muted/40 p-4">
                  {/* Bandeau protection anti-désintermédiation (informatif) */}
                  <div className="mx-auto flex max-w-[90%] items-center gap-1.5 self-center rounded-full bg-warning/15 px-3 py-1.5 text-center text-[11.5px] font-semibold text-warning">
                    <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Les coordonnées personnelles (téléphone, e-mail) sont masquées avant le paiement pour votre protection.</span>
                  </div>

                  {messages.map((message) => {
                    const isOwn = message.senderId === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] px-3.5 py-2 text-[14.5px] leading-snug shadow-sm ${
                            isOwn
                              ? 'rounded-2xl rounded-br-md bg-foreground text-background'
                              : 'rounded-2xl rounded-bl-md bg-card text-foreground'
                          }`}
                        >
                          <p className="break-words">{message.content}</p>
                          <p className={`mt-1 text-[10.5px] ${isOwn ? 'text-background/55' : 'text-muted-foreground'}`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Composer (pilule + bouton rond, façon messagerie) */}
                <div className="border-t border-border bg-card p-3">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={t('common', 'typeMessage')}
                      className="flex-1 rounded-full bg-muted px-4 py-3 text-[14.5px] outline-none focus:ring-2 focus:ring-foreground/10"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      aria-label={t('common', 'send')}
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                {t('common', 'selectConversation')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessagesLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-muted-foreground">Chargement...</div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesLoadingFallback />}>
      <MessagesContent />
    </Suspense>
  );
}
