'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface Message {
  id: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM' | 'VOICE_NOTE';
  content: string;
  sender: User;
  replyTo?: {
    id: string;
    content: string;
    sender: { firstName: string; lastName: string };
  };
  attachments: any[];
  mentions: string[];
  reactions: Record<string, string[]>;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
}

interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: 'DIRECT' | 'GROUP' | 'TEAM' | 'MISSION' | 'ANNOUNCEMENT';
  avatar?: string;
  companyId?: string;
  missionId?: string;
  isArchived: boolean;
  isPinned: boolean;
  isMuted: boolean;
  myRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  members: {
    id: string;
    role: string;
    user: User;
  }[];
  unreadCount?: number;
  lastMessage?: Message;
  lastMessageAt?: string;
}

interface InternalChatProps {
  companyId: string;
  currentUserId: string;
}

export function InternalChat({ companyId, currentUserId }: InternalChatProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [companyMembers, setCompanyMembers] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch rooms
  useEffect(() => {
    fetchRooms();
    fetchCompanyMembers();
  }, [companyId]);

  // Fetch messages when room is selected
  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom.id);
    }
  }, [selectedRoom?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchRooms = async () => {
    try {
      const response = await fetch(`/api/internal-chat/rooms/company/${companyId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyMembers = async () => {
    try {
      const response = await fetch(`/api/internal-chat/company/${companyId}/members`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCompanyMembers(data);
      }
    } catch (error) {
      console.error('Failed to fetch company members:', error);
    }
  };

  const fetchMessages = async (roomId: string) => {
    try {
      const response = await fetch(`/api/internal-chat/rooms/${roomId}/messages`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || sendingMessage) return;

    setSendingMessage(true);
    try {
      const response = await fetch(`/api/internal-chat/rooms/${selectedRoom.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (response.ok) {
        const message = await response.json();
        setMessages((prev) => [...prev, message]);
        setNewMessage('');
        messageInputRef.current?.focus();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateRoom = async (memberIds: string[], name?: string) => {
    try {
      const response = await fetch('/api/internal-chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: memberIds.length === 1 ? 'DIRECT' : 'GROUP',
          companyId,
          memberIds,
          name: memberIds.length > 1 ? name : undefined,
        }),
      });

      if (response.ok) {
        const room = await response.json();
        setRooms((prev) => [room, ...prev]);
        setSelectedRoom(room);
        setShowNewChatModal(false);
      }
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Hier';
    } else if (days < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  const getRoomIcon = (type: string) => {
    switch (type) {
      case 'DIRECT':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'GROUP':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'TEAM':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'MISSION':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] bg-card rounded-xl shadow-lg overflow-hidden">
      {/* Sidebar - Room List */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Messages</h2>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <p>Aucune conversation</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-2 text-primary hover:underline"
              >
                Commencer une conversation
              </button>
            </div>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={`w-full p-3 flex items-start gap-3 hover:bg-accent transition-colors ${
                  selectedRoom?.id === room.id ? 'bg-primary/10' : ''
                }`}
              >
                <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                  {room.avatar ? (
                    <img src={room.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getRoomIcon(room.type)
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground truncate">{room.name}</p>
                    {room.lastMessageAt && (
                      <span className="text-xs text-muted-foreground">{formatTime(room.lastMessageAt)}</span>
                    )}
                  </div>
                  {room.lastMessage && (
                    <p className="text-sm text-muted-foreground truncate">
                      {room.lastMessage.type === 'SYSTEM' ? (
                        <em>{room.lastMessage.content}</em>
                      ) : (
                        <>
                          <span className="font-medium">{room.lastMessage.sender.firstName}: </span>
                          {room.lastMessage.content}
                        </>
                      )}
                    </p>
                  )}
                </div>
                {room.unreadCount && room.unreadCount > 0 && (
                  <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {room.unreadCount > 9 ? '9+' : room.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                  {getRoomIcon(selectedRoom.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{selectedRoom.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedRoom.members.length} membre{selectedRoom.members.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-muted-foreground hover:bg-accent rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button className="p-2 text-muted-foreground hover:bg-accent rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender.id === currentUserId ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type === 'SYSTEM' ? (
                    <div className="text-center text-sm text-muted-foreground italic w-full">
                      {message.content}
                    </div>
                  ) : (
                    <div className={`flex items-end gap-2 max-w-[70%] ${message.sender.id === currentUserId ? 'flex-row-reverse' : ''}`}>
                      {message.sender.id !== currentUserId && (
                        <div className="w-8 h-8 bg-muted rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium text-muted-foreground">
                          {message.sender.avatar ? (
                            <img src={message.sender.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            `${message.sender.firstName[0]}${message.sender.lastName[0]}`
                          )}
                        </div>
                      )}
                      <div>
                        {message.sender.id !== currentUserId && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {message.sender.firstName} {message.sender.lastName}
                          </p>
                        )}
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            message.sender.id === currentUserId
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                        <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${message.sender.id === currentUserId ? 'justify-end' : ''}`}>
                          <span>{formatTime(message.createdAt)}</span>
                          {message.isEdited && <span>(modifie)</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {selectedRoom.myRole !== 'VIEWER' && (
              <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={messageInputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder="Ecrivez votre message..."
                      rows={1}
                      className="w-full px-4 py-3 border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sendingMessage ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium">Selectionnez une conversation</p>
            <p className="text-sm">ou commencez une nouvelle discussion</p>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewChatModal
          members={companyMembers.filter((m) => m.id !== currentUserId)}
          onClose={() => setShowNewChatModal(false)}
          onCreate={handleCreateRoom}
        />
      )}
    </div>
  );
}

interface NewChatModalProps {
  members: any[];
  onClose: () => void;
  onCreate: (memberIds: string[], name?: string) => void;
}

function NewChatModal({ members, onClose, onCreate }: NewChatModalProps) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = members.filter(
    (m) =>
      m.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleCreate = () => {
    if (selectedMembers.length === 0) return;
    onCreate(selectedMembers, selectedMembers.length > 1 ? groupName : undefined);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold">Nouvelle conversation</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {/* Group name (if multiple members selected) */}
          {selectedMembers.length > 1 && (
            <input
              type="text"
              placeholder="Nom du groupe"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full mt-3 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}

          {/* Selected members */}
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedMembers.map((memberId) => {
                const member = members.find((m) => m.id === memberId);
                return (
                  <span
                    key={memberId}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {member?.firstName} {member?.lastName}
                    <button onClick={() => toggleMember(memberId)} className="hover:text-primary">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Member list */}
          <div className="mt-4 max-h-64 overflow-y-auto">
            {filteredMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => toggleMember(member.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  selectedMembers.includes(member.id)
                    ? 'bg-primary/10'
                    : 'hover:bg-accent'
                }`}
              >
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                  {member.avatar ? (
                    <img src={member.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    `${member.firstName[0]}${member.lastName[0]}`
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{member.employeeRole}</p>
                </div>
                {selectedMembers.includes(member.id) && (
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={selectedMembers.length === 0}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Creer
          </button>
        </div>
      </div>
    </div>
  );
}

export default InternalChat;
