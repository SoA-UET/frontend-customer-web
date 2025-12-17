import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

import { consultationService, socketService } from '../services';
socketService.connect();

import type {
  Conversation,
  Message,
  ConversationStatus,
  TextStartPayload,
  TextChunkPayload,
  TextStopPayload,
  StatusSwitchPayload,
  AudioFilePayload,
} from '../types';

interface StreamingMessage {
  sender_type: 'AI_AGENT' | 'HUMAN_AGENT' | null;
  content: string;
  isStreaming: boolean;
}

interface ConversationContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  streamingMessage: StreamingMessage | null;
  loading: boolean;
  error: string | null;
  isCallActive: boolean;
  isMuted: boolean;
  
  // Actions
  fetchConversations: () => Promise<void>;
  createConversation: (title: string) => Promise<Conversation>;
  selectConversation: (conversationId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  startCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  submitAudio: (audioBlob: Blob) => Promise<void>;
  clearError: () => void;
  
  // Audio playback
  audioToPlay: ArrayBuffer | null;
  clearAudioToPlay: () => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioToPlay, setAudioToPlay] = useState<ArrayBuffer | null>(null);

  // Setup Socket.IO event handlers
  useEffect(() => {
    socketService.onTextStart((payload: TextStartPayload) => {
      console.log('text_start:', payload);
      setStreamingMessage({
        sender_type: null,
        content: '',
        isStreaming: true,
      });
    });

    socketService.onTextChunk((payload: TextChunkPayload) => {
      console.log('text_chunk:', payload);
      setStreamingMessage((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          content: prev.content + payload.content,
          sender_type: payload.sender_type,
        };
      });
    });

    socketService.onTextStop((payload: TextStopPayload) => {
      console.log('text_stop:', payload);
      setStreamingMessage((prev) => {
        if (!prev) return null;
        
        // Add the completed message to messages list
        const completedMessage: Message = {
          id: null,
          conversation_id: currentConversation?.id || '',
          sender_type: prev.sender_type || "AI_AGENT",
          content: prev.content,
          created_at: new Date().toISOString(),
        };
        setMessages((msgs) => [...msgs, completedMessage]);
        
        return null;
      });
    });

    socketService.onStatusSwitch((payload: StatusSwitchPayload) => {
      console.log('status_switch:', payload);
      setCurrentConversation((prev) => {
        if (!prev || prev.id !== payload.conversation_id) return prev;
        return { ...prev, status: payload.new_status };
      });
      
      // Update in conversations list too
      setConversations((convs) =>
        convs.map((c) =>
          c.id === payload.conversation_id
            ? { ...c, status: payload.new_status }
            : c
        )
      );

      // If call ended due to status change
      if (
        payload.old_status === 'AI_AGENT_CALLING' &&
        payload.new_status !== 'AI_AGENT_CALLING'
      ) {
        setIsCallActive(false);
      }
    });

    socketService.onAudioFile((payload: AudioFilePayload) => {
      console.log('audio_file received:', payload);
      setAudioToPlay(payload.audio);
    });

    return () => {
      socketService.removeAllListeners();
      socketService.disconnect();
    };
  }, [currentConversation?.id]);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await consultationService.getConversations();
      setConversations(response.content);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Không thể tải danh sách hội thoại');
    } finally {
      setLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (title: string): Promise<Conversation> => {
    try {
      setLoading(true);
      const response = await consultationService.createConversation({ title });
      const newConversation = response.content;
      setConversations((prev) => [newConversation, ...prev]);
      return newConversation;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const errorMessage = error.response?.data?.message || 'Không thể tạo hội thoại mới';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectConversation = useCallback(async (conversationId: string) => {
    try {
      setLoading(true);
      setMessages([]);
      setStreamingMessage(null);

      // Get conversation details
      const convResponse = await consultationService.getConversation(conversationId);
      setCurrentConversation(convResponse.content);

      // Get messages
      const msgResponse = await consultationService.getMessages(conversationId);
      setMessages(msgResponse.content);

      // Join Socket.IO room
      socketService.joinRoom(conversationId);

      // Update call state based on conversation status
      const status = convResponse.content.status as ConversationStatus;
      setIsCallActive(status === 'AI_AGENT_CALLING' || status === 'HUMAN_AGENT_CALLING');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Không thể tải hội thoại');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!currentConversation) return;

    try {
      // Add optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: currentConversation.id,
        sender_type: 'CUSTOMER',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);

      /*const response = */await consultationService.sendMessage(currentConversation.id, { content });
      
      // Replace optimistic message with real one
      // setMessages((prev) =>
      //   prev.map((m) => (m.id === optimisticMessage.id ? response.content : m))
      // );
    } catch (err: unknown) {
      // Remove optimistic message on error
      // setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Không thể gửi tin nhắn');
    }
  }, [currentConversation]);

  const startCall = useCallback(() => {
    if (!currentConversation) return;
    socketService.emitCallStart(currentConversation.id);
    setIsCallActive(true);
    setIsMuted(false);
  }, [currentConversation]);

  const endCall = useCallback(() => {
    if (!currentConversation) return;
    socketService.emitCallEnd(currentConversation.id);
    setIsCallActive(false);
    setIsMuted(false);
  }, [currentConversation]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const submitAudio = useCallback(async (audioBlob: Blob) => {
    if (!currentConversation) return;
    
    try {
      await consultationService.submitAudio(currentConversation.id, audioBlob);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Không thể gửi audio');
    }
  }, [currentConversation]);

  const clearError = useCallback(() => setError(null), []);
  const clearAudioToPlay = useCallback(() => setAudioToPlay(null), []);

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        currentConversation,
        messages,
        streamingMessage,
        loading,
        error,
        isCallActive,
        isMuted,
        fetchConversations,
        createConversation,
        selectConversation,
        sendMessage,
        startCall,
        endCall,
        toggleMute,
        submitAudio,
        clearError,
        audioToPlay,
        clearAudioToPlay,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
}
