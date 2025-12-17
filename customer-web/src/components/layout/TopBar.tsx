import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts';
import {
  Search,
  Bell,
  User,
  LogOut,
  Settings,
  ChevronDown,
} from 'lucide-react';

export default function TopBar() {
  const navigate = useNavigate();
  const { customer, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search functionality can be implemented here
    console.log('Search:', searchQuery);
  };

  return (
    <header className="h-16 bg-surface border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-gray-200 rounded-button text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
      </form>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-text-muted hover:text-text-main hover:bg-background rounded-button transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-3 py-2 hover:bg-background rounded-button transition-colors"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-text-main">
                {customer?.full_name || 'Người dùng'}
              </p>
              <p className="text-xs text-text-muted">
                {customer?.phone_number}
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-surface rounded-card shadow-elevated border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-text-main">
                    {customer?.full_name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {customer?.phone_number}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    // Navigate to settings if implemented
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-text-main hover:bg-background flex items-center gap-3 transition-colors"
                >
                  <Settings className="w-4 h-4 text-text-muted" />
                  Cài đặt
                </button>

                <hr className="my-2 border-gray-100" />

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-error hover:bg-red-50 flex items-center gap-3 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
