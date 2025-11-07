'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  read: boolean;
}

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: string;
  };
  lastMessage?: Message;
  unreadCount: number;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = '1'; // TODO: Get from auth context

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      // TODO: Replace with actual API call
      // const data = await chatApi.getConversations();

      // Mock data
      const mockConversations: Conversation[] = [
        {
          id: '1',
          otherUser: {
            id: '2',
            firstName: 'Marc',
            lastName: 'Plombier',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marc',
            role: 'ARTISAN',
          },
          lastMessage: {
            id: '1',
            content: 'Bonjour, je peux venir demain à 14h',
            senderId: '2',
            receiverId: '1',
            createdAt: '2024-01-20T14:30:00Z',
            read: false,
          },
          unreadCount: 2,
        },
        {
          id: '2',
          otherUser: {
            id: '3',
            firstName: 'Sophie',
            lastName: 'Électricienne',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
            role: 'ARTISAN',
          },
          lastMessage: {
            id: '2',
            content: 'Merci pour votre confiance !',
            senderId: '1',
            receiverId: '3',
            createdAt: '2024-01-19T10:00:00Z',
            read: true,
          },
          unreadCount: 0,
        },
      ];

      setConversations(mockConversations);
      if (mockConversations.length > 0) {
        setSelectedConversation(mockConversations[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      // TODO: Replace with actual API call
      // const data = await chatApi.getMessages(conversationId);

      // Mock data
      const mockMessages: Message[] = [
        {
          id: '1',
          content: 'Bonjour, j\'ai besoin de réparer une fuite d\'eau',
          senderId: '1',
          receiverId: '2',
          createdAt: '2024-01-20T10:00:00Z',
          read: true,
        },
        {
          id: '2',
          content: 'Bonjour ! Je peux me déplacer aujourd\'hui ou demain. Quelle est votre disponibilité ?',
          senderId: '2',
          receiverId: '1',
          createdAt: '2024-01-20T10:15:00Z',
          read: true,
        },
        {
          id: '3',
          content: 'Demain serait parfait. Vous pouvez venir vers 14h ?',
          senderId: '1',
          receiverId: '2',
          createdAt: '2024-01-20T11:00:00Z',
          read: true,
        },
        {
          id: '4',
          content: 'Bonjour, je peux venir demain à 14h',
          senderId: '2',
          receiverId: '1',
          createdAt: '2024-01-20T14:30:00Z',
          read: false,
        },
        {
          id: '5',
          content: 'N\'oubliez pas l\'adresse: 10 Rue de la Gare, Luxembourg',
          senderId: '2',
          receiverId: '1',
          createdAt: '2024-01-20T14:31:00Z',
          read: false,
        },
      ];

      setMessages(mockMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !selectedConversation) return;

    try {
      // TODO: Replace with actual API call
      // await chatApi.sendMessage(selectedConversation, newMessage);

      // Optimistic update
      const tempMessage: Message = {
        id: Date.now().toString(),
        content: newMessage,
        senderId: currentUserId,
        receiverId: conversations.find((c) => c.id === selectedConversation)?.otherUser.id || '',
        createdAt: new Date().toISOString(),
        read: false,
      };

      setMessages([...messages, tempMessage]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
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
      return 'Aujourd\'hui';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Aucune conversation
              </div>
            ) : (
              <div>
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                      selectedConversation === conv.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <img
                      src={conv.otherUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                      alt={conv.otherUser.firstName}
                      className="w-12 h-12 rounded-full flex-shrink-0"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 truncate">
                          {conv.otherUser.firstName} {conv.otherUser.lastName}
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
                  src={selectedConv.otherUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                  alt={selectedConv.otherUser.firstName}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedConv.otherUser.firstName} {selectedConv.otherUser.lastName}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {selectedConv.otherUser.role === 'ARTISAN' ? 'Artisan' : 'Client'}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                  const isOwn = message.senderId === currentUserId;
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
                    placeholder="Tapez votre message..."
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newMessage.trim()}>
                    Envoyer
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Sélectionnez une conversation pour commencer
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
