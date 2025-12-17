import { useRef, useEffect } from 'react';
import type { Message } from '../../types';
import { Bot, User, Users } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isCustomer = message.sender_type === 'CUSTOMER';
  const isAI = message.sender_type === 'AI_AGENT';
  const isSenderTypeUnknown = message.sender_type == null;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSenderIcon = () => {
    if (isCustomer) {
      return <User className="w-4 h-4 text-white" />;
    }
    if (isAI) {
      return <Bot className="w-4 h-4 text-white" />;
    }
    return <Users className="w-4 h-4 text-white" />;
  };

  const getSenderName = () => {
    if (isCustomer) return 'Bạn';
    if (isAI) return 'AI Tư vấn';
    if (isSenderTypeUnknown) return 'Đang nhập...';
    return 'Nhân viên hỗ trợ';
  };

  const getAvatarColor = () => {
    if (isCustomer) return 'bg-primary';
    if (isAI) return 'bg-gradient-to-br from-blue-500 to-purple-500';
    return 'bg-purple-500';
  };

  return (
    <div
      className={`flex gap-3 message-enter ${isCustomer ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getAvatarColor()}`}>
        {getSenderIcon()}
      </div>

      {/* Message Content */}
      <div className={`max-w-[70%] ${isCustomer ? 'items-end' : 'items-start'}`}>
        {/* Sender Name */}
        <div className={`text-xs text-text-muted mb-1 ${isCustomer ? 'text-right' : 'text-left'}`}>
          {getSenderName()}
        </div>

        {/* Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl ${
            isCustomer
              ? 'bg-primary text-white rounded-tr-md'
              : 'bg-white text-text-main shadow-card rounded-tl-md'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
            {isStreaming && (
              <span className="inline-flex ml-1">
                <span className="w-1.5 h-1.5 bg-current rounded-full typing-dot"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full typing-dot mx-0.5"></span>
                <span className="w-1.5 h-1.5 bg-current rounded-full typing-dot"></span>
              </span>
            )}
          </p>
        </div>

        {/* Timestamp & Emotion */}
        <div className={`flex items-center gap-2 mt-1 text-xs text-text-muted ${isCustomer ? 'justify-end' : 'justify-start'}`}>
          <span>{formatTime(message.created_at)}</span>
          {message.emotion && (
            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">
              {message.emotion}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface StreamingMessageProps {
  sender_type: 'AI_AGENT' | 'HUMAN_AGENT' | null;
  content: string;
}

export function StreamingMessage({ sender_type, content }: StreamingMessageProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [content]);

  const isAI = sender_type === 'AI_AGENT';

  return (
    <div ref={containerRef} className="flex gap-3 message-enter">
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isAI ? 'bg-gradient-to-br from-blue-500 to-purple-500' : 'bg-purple-500'
      }`}>
        {isAI ? <Bot className="w-4 h-4 text-white" /> : <Users className="w-4 h-4 text-white" />}
      </div>

      {/* Message Content */}
      <div className="max-w-[70%]">
        {/* Sender Name */}
        <div className="text-xs text-text-muted mb-1">
          {isAI ? 'AI Tư vấn' : 'Nhân viên hỗ trợ'}
        </div>

        {/* Bubble */}
        <div className="px-4 py-3 bg-white text-text-main shadow-card rounded-2xl rounded-tl-md">
          <p className="text-sm whitespace-pre-wrap break-words">
            {content || ''}
            <span className="inline-flex ml-1">
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full typing-dot"></span>
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full typing-dot mx-0.5"></span>
              <span className="w-1.5 h-1.5 bg-text-muted rounded-full typing-dot"></span>
            </span>
          </p>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-text-muted mt-1">
          Đang nhập...
        </div>
      </div>
    </div>
  );
}
