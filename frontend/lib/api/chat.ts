import apiClient from './client';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  lastMessage?: Message;
  unreadCount: number;
}

export const chatApi = {
  // Get all conversations for current user
  getConversations: async () => {
    const response = await apiClient.get<Conversation[]>('/chat/conversations');
    return response.data;
  },

  // Get messages for a specific conversation
  getConversation: async (userId: string, limit?: number) => {
    const response = await apiClient.get<Message[]>(`/chat/conversation/${userId}`, {
      params: { limit },
    });
    return response.data;
  },

  // Mark conversation as read
  markAsRead: async (userId: string) => {
    const response = await apiClient.post(`/chat/conversation/${userId}/read`);
    return response.data;
  },

  // Delete a message
  deleteMessage: async (messageId: string) => {
    const response = await apiClient.delete(`/chat/message/${messageId}`);
    return response.data;
  },
};
