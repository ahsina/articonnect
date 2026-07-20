'use client';

import { Send, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role?: string;
  };
  lastMessage?: Message;
  unreadCount: number;
  missionId?: string;
  missionTitle?: string;
}

function ArtisanMessagesContent() {
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
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (socketMessages.length > 0) {
      const latestSocketMessage = socketMessages[socketMessages.length - 1];
      if (
        selectedConversation &&
        (latestSocketMessage.senderId === selectedConversation ||
          latestSocketMessage.receiverId === selectedConversation)
      ) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === latestSocketMessage.id);
          if (!exists) {
            return [...prev, { ...latestSocketMessage, createdAt: new Date(latestSocketMessage.createdAt).toISOString() }];
          }
          return prev;
        });
      }
      // Update unread count in conversations
      loadConversations();
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
      await chatApi.markAsRead(userId);
      // Update local unread count
      setConversations(prev =>
        prev.map(c => c.userId === userId ? { ...c, unreadCount: 0 } : c)
      );
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      if (connected && socketSendMessage) {
        const tempMessage: Message = {
          id: `temp-${Date.now()}`,
          content: newMessage,
          senderId: user.id,
          receiverId: selectedConversation,
          createdAt: new Date().toISOString(),
          read: false,
        };
        setMessages([...messages, tempMessage]);
        socketSendMessage(selectedConversation, newMessage);
        setNewMessage('');
      } else {
        toast({
          title: t('common', 'error'),
          description: t('messages', 'connectionError') || 'Connection error. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: t('common', 'error'),
        description: t('messages', 'sendError') || 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('common', 'today') || "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('common', 'yesterday') || 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const fullName = `${conv.user?.firstName} ${conv.user?.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) ||
           conv.missionTitle?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Si une conversation ciblée (deep-link) n'existe pas encore, on synthétise une
  // conversation vide pour afficher la zone de chat et pouvoir écrire directement.
  // Dès le 1er message envoyé, loadConversations() (déclenché par le socket) la remplace
  // par la vraie conversation avec les infos de l'utilisateur.
  const selectedConv =
    conversations.find((c) => c.userId === selectedConversation) ||
    (selectedConversation
      ? {
          userId: selectedConversation,
          user: { id: selectedConversation, firstName: '', lastName: '' },
          unreadCount: 0,
        }
      : undefined);
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common', 'loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-background flex flex-col">
      {/* Page Header */}
      <div className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-extrabold tracking-tight text-foreground">
              {t('messages', 'title') || 'Messages'}
            </h1>
            <p className="text-muted-foreground">
              {t('messages', 'subtitle') || 'Communicate with your clients'}
            </p>
          </div>
          {totalUnread > 0 && (
            <Badge className="bg-destructive/10 text-destructive">
              {totalUnread} {t('messages', 'unread') || 'unread'}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversations Sidebar */}
        <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 bg-card border-r border-border flex-col`}>
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4-4" />
              </svg>
              <Input
                placeholder={t('messages', 'searchConversations') || 'Search conversations...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9"
              />
            </div>
          </div>

          {/* Connection Status */}
          <div className="px-4 py-2 border-b bg-background flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-xs text-muted-foreground">
              {connected ? t('common', 'connected') || 'Connected' : t('common', 'connecting') || 'Connecting...'}
            </span>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchQuery
                  ? t('messages', 'noResults') || 'No conversations found'
                  : t('messages', 'noConversations') || 'No conversations yet'}
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => setSelectedConversation(conv.userId)}
                  className={`w-full p-4 flex items-start gap-3 hover:bg-muted/60 border-b border-border transition-colors text-left ${
                    selectedConversation === conv.userId ? 'bg-muted border-l-[3px] border-l-foreground' : ''
                  }`}
                >
                  <div className="relative">
                    <img
                      src={conv.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.user?.id}`}
                      alt={conv.user?.firstName}
                      className="w-12 h-12 rounded-full flex-shrink-0"
                    />
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-foreground truncate">
                        {conv.user?.firstName || ""} {conv.user?.lastName || ""}
                      </span>
                      {conv.lastMessage && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatDate(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    {conv.missionTitle && (
                      <div className="text-xs text-primary truncate mb-1">
                        {conv.missionTitle}
                      </div>
                    )}
                    {conv.lastMessage && (
                      <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {conv.lastMessage.senderId === user?.id ? 'Vous: ' : ''}
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-background`}>
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="bg-card border-b border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedConversation(null)}
                    className="lg:hidden -ml-1 mr-1 p-1 rounded-md hover:bg-accent"
                    aria-label={t('common', 'back') || 'Retour'}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <img
                    src={selectedConv.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedConv.user?.id}`}
                    alt={selectedConv.user?.firstName}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <h2 className="font-semibold text-foreground">
                      {selectedConv.user?.firstName || ""} {selectedConv.user?.lastName || ""}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t('auth', 'client') || 'Client'}
                      {selectedConv.missionTitle && ` - ${selectedConv.missionTitle}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    {t('messages', 'viewProfile') || 'View Profile'}
                  </Button>
                  {selectedConv.missionId && (
                    <Button variant="outline" size="sm">
                      {t('messages', 'viewMission') || 'View Mission'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages (bulles façon WhatsApp/Uber) */}
              <div className="flex-1 overflow-y-auto bg-muted/30 p-4 space-y-2">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {t('messages', 'startConversation') || 'Start the conversation by sending a message'}
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.senderId === user?.id;
                    return (
                      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] px-3.5 py-2 text-[14.5px] leading-snug ${
                            isOwn
                              ? 'rounded-2xl rounded-br-md bg-foreground text-background shadow-sm'
                              : 'rounded-2xl rounded-bl-md bg-card text-foreground border border-border'
                          }`}
                        >
                          <p className="break-words whitespace-pre-wrap">{message.content}</p>
                          <p className={`mt-1 text-[10.5px] ${isOwn ? 'text-background/55' : 'text-muted-foreground'}`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer (pilule + bouton rond) */}
              <div className="border-t border-border bg-card p-3">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('messages', 'typeMessage') || 'Type your message...'}
                    className="flex-1 rounded-full bg-muted px-4 py-3 text-[14.5px] outline-none focus:ring-2 focus:ring-foreground/10"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || !connected}
                    aria-label={t('common', 'send') || 'Send'}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
                {!connected && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('messages', 'reconnecting') || 'Reconnecting...'}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-7 h-7 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 5h16v11H9l-4 3v-3H4z" />
                  </svg>
                </div>
                <p>{t('messages', 'selectConversation') || 'Select a conversation to start messaging'}</p>
              </div>
            </div>
          )}
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

export default function ArtisanMessagesPage() {
  return (
    <Suspense fallback={<MessagesLoadingFallback />}>
      <ArtisanMessagesContent />
    </Suspense>
  );
}
