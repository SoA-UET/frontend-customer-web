import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useConversation } from '../../contexts';
import {
  MessageSquare,
  Plus,
  Search,
  ChevronRight,
  Bot,
  User,
  Clock,
  Loader2,
} from 'lucide-react';
import type { Conversation, ConversationStatus } from '../../types';

const statusLabels: Record<ConversationStatus, string> = {
  AI_AGENT_TEXTING: 'AI - Tin nhắn',
  AI_AGENT_CALLING: 'AI - Đang gọi',
  FORWARDING: 'Đang chuyển tiếp',
  HUMAN_AGENT_TEXTING: 'Nhân viên - Tin nhắn',
  HUMAN_AGENT_CALLING: 'Nhân viên - Đang gọi',
};

const statusColors: Record<ConversationStatus, string> = {
  AI_AGENT_TEXTING: 'bg-blue-100 text-blue-700',
  AI_AGENT_CALLING: 'bg-green-100 text-green-700',
  FORWARDING: 'bg-yellow-100 text-yellow-700',
  HUMAN_AGENT_TEXTING: 'bg-purple-100 text-purple-700',
  HUMAN_AGENT_CALLING: 'bg-purple-100 text-purple-700',
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    conversations,
    currentConversation,
    fetchConversations,
    createConversation,
    selectConversation,
    loading,
  } = useConversation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateConversation = async () => {
    if (!newTitle.trim()) return;

    try {
      const newConv = await createConversation(newTitle.trim());
      setNewTitle('');
      setIsCreating(false);
      await selectConversation(newConv.id);
      navigate('/chat');
    } catch {
      // Error handled by context
    }
  };

  const handleSelectConversation = async (conv: Conversation) => {
    await selectConversation(conv.id);
    navigate('/chat');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Hôm qua';
    } else if (days < 7) {
      return `${days} ngày trước`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  const getStatusIcon = (status: ConversationStatus) => {
    if (status.includes('AI_')) {
      return <Bot className="w-3 h-3" />;
    }
    return <User className="w-3 h-3" />;
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-primary text-white flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-primary-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Telcenter</h1>
            <p className="text-xs text-primary-200">Tư vấn viễn thông</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm hội thoại..."
            className="w-full pl-9 pr-4 py-2 bg-primary-700 text-white placeholder-primary-300 rounded-button text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
      </div>

      {/* New Conversation Button */}
      <div className="px-4 mb-2">
        {isCreating ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Tiêu đề hội thoại..."
              className="w-full px-3 py-2 bg-primary-700 text-white placeholder-primary-300 rounded-button text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateConversation();
                if (e.key === 'Escape') setIsCreating(false);
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateConversation}
                disabled={!newTitle.trim() || loading}
                className="flex-1 py-1.5 bg-white text-primary text-sm font-medium rounded-button hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tạo
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewTitle('');
                }}
                className="flex-1 py-1.5 bg-primary-700 text-white text-sm font-medium rounded-button hover:bg-primary-600"
              >
                Hủy
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-primary font-medium rounded-button hover:bg-primary-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo hội thoại mới
          </button>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="px-2 py-2 text-xs font-semibold text-primary-300 uppercase tracking-wider">
          Hội thoại gần đây
        </div>

        {loading && conversations.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-300" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-primary-300 text-sm">
            {searchQuery ? 'Không tìm thấy hội thoại' : 'Chưa có hội thoại nào'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full p-3 rounded-button text-left transition-all group ${
                  currentConversation?.id === conv.id && location.pathname === '/chat'
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{conv.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          statusColors[conv.status]
                        }`}
                      >
                        {getStatusIcon(conv.status)}
                        {statusLabels[conv.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-primary-300 text-xs">
                      <Clock className="w-3 h-3" />
                      {formatDate(conv.updated_at)}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-primary-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-primary-700">
        <p className="text-xs text-primary-300 text-center">
          © 2024 Telcenter
        </p>
      </div>
    </aside>
  );
}
