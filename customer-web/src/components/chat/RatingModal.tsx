import { useState, useEffect } from 'react';
import { consultationService } from '../../services';
import {
  Star,
  X,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface RatingModalProps {
  conversationId: string;
  onClose: () => void;
}

export default function RatingModal({ conversationId, onClose }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing rating
  useEffect(() => {
    const loadRating = async () => {
      try {
        const existingRating = await consultationService.getRating(conversationId);
        if (existingRating) {
          setRating(existingRating.rating);
          setComment(existingRating.comment || '');
        }
      } catch {
        // No existing rating, that's fine
      } finally {
        setLoadingExisting(false);
      }
    };

    loadRating();
  }, [conversationId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Vui lòng chọn số sao đánh giá');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await consultationService.submitRating(conversationId, {
        rating,
        comment,
      });
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Không thể gửi đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const ratingLabels = [
    '',
    'Rất không hài lòng',
    'Không hài lòng',
    'Bình thường',
    'Hài lòng',
    'Rất hài lòng',
  ];

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-surface rounded-card shadow-elevated p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-semibold text-text-main mb-2">
            Cảm ơn bạn!
          </h2>
          <p className="text-text-muted">
            Đánh giá của bạn đã được ghi nhận
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-card shadow-elevated max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-main">
            Đánh giá chất lượng dịch vụ
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-main hover:bg-background rounded-button transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loadingExisting ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-button flex items-center gap-2 text-error">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Star Rating */}
              <div className="text-center mb-6">
                <p className="text-text-muted text-sm mb-3">
                  Bạn đánh giá cuộc trò chuyện này như thế nào?
                </p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          star <= (hoveredRating || rating)
                            ? 'text-warning fill-warning'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm text-text-main mt-2 h-5">
                  {ratingLabels[hoveredRating || rating]}
                </p>
              </div>

              {/* Comment */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-main mb-2">
                  Nhận xét (tùy chọn)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm của bạn..."
                  rows={4}
                  className="w-full px-4 py-3 bg-background border border-gray-200 rounded-card text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={rating === 0 || loading}
                className="w-full py-3 bg-primary text-white font-medium rounded-button hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Gửi đánh giá
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
