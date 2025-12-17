import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts';
import {
  Phone,
  Lock,
  User,
  MapPin,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    phone_number: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    address: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    // Phone validation (Vietnamese format)
    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
    if (!phoneRegex.test(formData.phone_number)) {
      errors.push('Số điện thoại không hợp lệ');
    }

    // Password validation
    if (formData.password.length < 8) {
      errors.push('Mật khẩu phải có ít nhất 8 ký tự');
    }
    if (!/[A-Z]/.test(formData.password)) {
      errors.push('Mật khẩu phải có ít nhất 1 chữ hoa');
    }
    if (!/[0-9]/.test(formData.password)) {
      errors.push('Mật khẩu phải có ít nhất 1 số');
    }
    if (!/[!@#$%^&*]/.test(formData.password)) {
      errors.push('Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*)');
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      errors.push('Xác nhận mật khẩu không khớp');
    }

    // Full name validation
    if (formData.full_name.trim().length < 2) {
      errors.push('Họ tên phải có ít nhất 2 ký tự');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationErrors([]);
    
    if (!validateForm()) return;

    try {
      await register({
        phone_number: formData.phone_number,
        password: formData.password,
        full_name: formData.full_name,
        address: formData.address,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      // Error is handled by context
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-surface rounded-card shadow-card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-semibold text-text-main mb-2">Đăng ký thành công!</h2>
          <p className="text-text-muted mb-4">
            Tài khoản của bạn đã được tạo. Đang chuyển hướng đến trang đăng nhập...
          </p>
          <Link
            to="/login"
            className="text-primary font-medium hover:underline"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-card flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-main">Telcenter</h1>
          <p className="text-text-muted mt-2">Tạo tài khoản mới</p>
        </div>

        {/* Register Form Card */}
        <div className="bg-surface rounded-card shadow-card p-8">
          <h2 className="text-xl font-semibold text-text-main mb-6">Đăng ký</h2>

          {/* Error Messages */}
          {(error || validationErrors.length > 0) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-button">
              <div className="flex items-center gap-2 text-error mb-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Vui lòng kiểm tra lại:</span>
              </div>
              <ul className="text-sm text-error space-y-1 ml-7">
                {error && <li>{error}</li>}
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Number Input */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">
                Số điện thoại <span className="text-error">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => handleChange('phone_number', e.target.value)}
                  placeholder="0912345678"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Full Name Input */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">
                Họ và tên <span className="text-error">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Address Input */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">
                Địa chỉ
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="TP. Hồ Chí Minh"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">
                Mật khẩu <span className="text-error">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Ít nhất 8 ký tự, bao gồm chữ hoa, số và ký tự đặc biệt
              </p>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">
                Xác nhận mật khẩu <span className="text-error">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary text-white font-medium rounded-button hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Đăng ký'
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-sm text-text-muted mt-6">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
