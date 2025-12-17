import { useState, useRef, useEffect, FormEvent } from 'react';
import { useConversation } from '../../contexts';
import MessageBubble, { StreamingMessage } from './MessageBubble';
import VoiceCallModal from './VoiceCallModal';
import RatingModal from './RatingModal';
import {
  Send,
  Phone,
  MoreVertical,
  Star,
  Bot,
  Users,
  AlertCircle,
  Info,
  Loader2,
} from 'lucide-react';
import type { ConversationStatus } from '../../types';

const statusLabels: Record<ConversationStatus, string> = {
  AI_AGENT_TEXTING: 'Đang trò chuyện với AI',
  AI_AGENT_CALLING: 'Đang gọi với AI',
  FORWARDING: 'Đang chuyển tiếp đến nhân viên...',
  HUMAN_AGENT_TEXTING: 'Đang trò chuyện với nhân viên hỗ trợ',
  HUMAN_AGENT_CALLING: 'Đang gọi với nhân viên hỗ trợ',
};

const statusColors: Record<ConversationStatus, string> = {
  AI_AGENT_TEXTING: 'bg-blue-50 text-blue-700 border-blue-200',
  AI_AGENT_CALLING: 'bg-green-50 text-green-700 border-green-200',
  FORWARDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  HUMAN_AGENT_TEXTING: 'bg-purple-50 text-purple-700 border-purple-200',
  HUMAN_AGENT_CALLING: 'bg-purple-50 text-purple-700 border-purple-200',
};

export default function ChatInbox() {
  const {
    currentConversation,
    messages,
    streamingMessage,
    sendMessage,
    startCall,
    isCallActive,
    loading,
    error,
    clearError,
  } = useConversation();

  const [inputMessage, setInputMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Focus input when conversation changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentConversation?.id]);

  // Show call modal when call is active
  useEffect(() => {
    if (isCallActive) {
      setShowCallModal(true);
    }
  }, [isCallActive]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const message = inputMessage.trim();
    setInputMessage('');
    await sendMessage(message);
  };

  const handleStartCall = () => {
    if (!currentConversation) return;
    startCall();
    setShowCallModal(true);
  };

  const canSendMessage = currentConversation?.status !== 'FORWARDING' &&
    currentConversation?.status !== 'AI_AGENT_CALLING' &&
    currentConversation?.status !== 'HUMAN_AGENT_CALLING';

  const canCall = currentConversation?.status === 'AI_AGENT_TEXTING';

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background rounded-card">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="w-10 h-10 text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-main mb-2">
            Chọn một hội thoại
          </h3>
          <p className="text-text-muted text-sm">
            Chọn hội thoại từ danh sách bên trái hoặc tạo hội thoại mới
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-surface rounded-card shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            {currentConversation.status.includes('AI_') ? (
              <Bot className="w-5 h-5 text-white" />
            ) : (
              <Users className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-text-main">
              {currentConversation.title}
            </h2>
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[currentConversation.status]}`}>
              {currentConversation.status === 'FORWARDING' && (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
              {statusLabels[currentConversation.status]}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Call Button */}
          {canCall && (
            <button
              onClick={handleStartCall}
              className="flex items-center gap-2 px-4 py-2 bg-success text-white font-medium rounded-button hover:bg-green-600 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Gọi
            </button>
          )}

          {/* More Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-text-muted hover:text-text-main hover:bg-background rounded-button transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-surface rounded-card shadow-elevated border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowRatingModal(true);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-text-main hover:bg-background flex items-center gap-3 transition-colors"
                  >
                    <Star className="w-4 h-4 text-warning" />
                    Đánh giá dịch vụ
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-error">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-sm text-error hover:underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Summary Info */}
      {currentConversation.summary && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-blue-700 mb-1">Tóm tắt hội thoại</p>
            <p className="text-sm text-blue-600">{currentConversation.summary}</p>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background">
        {messages.length === 0 && !streamingMessage ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-lg font-medium text-text-main mb-2">
                Bắt đầu cuộc trò chuyện
              </h3>
              <p className="text-text-muted text-sm">
                Gửi tin nhắn đầu tiên để nhận tư vấn
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {streamingMessage && (
              <StreamingMessage
                sender_type={streamingMessage.sender_type}
                content={streamingMessage.content}
              />
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="px-6 py-4 border-t border-gray-200 bg-surface"
      >
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              canSendMessage
                ? 'Nhập tin nhắn...'
                : 'Không thể gửi tin nhắn trong trạng thái này'
            }
            disabled={!canSendMessage || loading}
            className="flex-1 px-4 py-3 bg-background border border-gray-200 rounded-card text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || !canSendMessage || loading}
            className="p-3 bg-primary text-white rounded-card hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>

      {/* Voice Call Modal */}
      {showCallModal && (
        <VoiceCallModal
          onClose={() => setShowCallModal(false)}
        />
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <RatingModal
          conversationId={currentConversation.id}
          onClose={() => setShowRatingModal(false)}
        />
      )}
    </div>
  );
}
