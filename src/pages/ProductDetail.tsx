import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingCart, Share2, Star, ChevronLeft, ChevronRight, Camera, X, Send, MessageSquare, ZoomIn } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useTranslation } from '../hooks/useTranslation';
import { useCartStore } from '../store/useCartStore';
import { useProduct, useIncrementViews, useProductReviews, useProductRating, useFavoriteIds, useToggleFavorite, useCreateReview, useUploadReviewPhoto } from '../lib/supabase/hooks';
import { useAppStore } from '../store/useAppStore';
import { formatPrice, getLocalizedValue } from '../lib/utils';
import { haptic, tg } from '../lib/telegram';
import { WishlistToggle } from '../components/WishlistToggle';
import { toast } from '../components/Toast';

export const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const addItem = useCartStore((state) => state.addItem);

  const userId = useAppStore((s) => s.getUserId());
  const { data: favoriteIds = [] } = useFavoriteIds(userId);
  const toggleFavorite = useToggleFavorite(userId);

  const { data: product, isLoading } = useProduct(slug!);
  const incrementViews = useIncrementViews();
  const { data: reviews = [] } = useProductReviews(product?.id || '');
  const { data: rating } = useProductRating(product?.id || '');

  const isFavorite = product ? favoriteIds.includes(product.id) : false;

  const createReview = useCreateReview();
  const uploadReviewPhoto = useUploadReviewPhoto();

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [selectedColor, setSelectedColor] = useState<{ name: string; hex: string } | undefined>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);
  const [reviewUploading, setReviewUploading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const reviewPhotoInput = useRef<HTMLInputElement>(null);
  const viewsIncrementedRef = useRef<string | null>(null);

  useEffect(() => {
    if (product) {
      if (product.sizes && product.sizes.length > 0) setSelectedSize(product.sizes[0]);
      if (product.colors && product.colors.length > 0) setSelectedColor(product.colors[0] as { name: string; hex: string });
      if (viewsIncrementedRef.current !== product.id) {
        viewsIncrementedRef.current = product.id;
        incrementViews.mutate(product.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const handleShare = async () => {
    if (!product) return;
    const shareUrl = `${window.location.origin}/product/${product.slug}`;
    const shareText = `${getLocalizedValue(product.name, language)} - ${formatPrice(product.price as number)}`;
    if (tg) {
      (tg as { openTelegramLink?: (url: string) => void }).openTelegramLink?.(
        `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
      );
    } else if (navigator.share) {
      try { await navigator.share({ title: getLocalizedValue(product.name, language), text: shareText, url: shareUrl }); }
      catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success(language === 'ru' ? 'Ссылка скопирована' : 'Havola nusxalandi');
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (product.sizes.length > 0 && !selectedSize) { toast.warning(t('select_size')); return; }
    if (product.colors.length > 0 && !selectedColor) { toast.warning(t('select_color')); return; }
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price as number,
      image: product.images[0] || '',
      quantity,
      size: selectedSize,
      color: selectedColor,
    });
    haptic.addToCart();
    toast.success(t('add_to_cart'));
    navigate('/cart');
  };

  const nextImage = () => {
    if (!product) return;
    setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    if (!product) return;
    setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) nextImage();
    if (distance < -50) prevImage();
    setTouchStart(0);
    setTouchEnd(0);
  };

  const handleReviewPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setReviewUploading(true);
    try {
      const remaining = 5 - reviewPhotos.length;
      const filesToUpload = Array.from(files).slice(0, remaining);
      const uploadPromises = filesToUpload.map(async (file) => {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(language === 'ru' ? 'Файл слишком большой (макс. 5 МБ)' : 'Fayl hajmi katta (maks. 5 MB)');
        }
        return uploadReviewPhoto.mutateAsync(file);
      });
      const urls = await Promise.all(uploadPromises);
      setReviewPhotos((prev) => [...prev, ...urls].slice(0, 5));
    } catch (err) {
      const msg = err instanceof Error ? err.message : (language === 'ru' ? 'Ошибка загрузки фото' : 'Fotosni yuklashda xatolik');
      toast.error(msg);
    } finally {
      setReviewUploading(false);
      if (reviewPhotoInput.current) reviewPhotoInput.current.value = '';
    }
  };

  const handleRemoveReviewPhoto = (index: number) => {
    setReviewPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async () => {
    if (!product || !reviewName.trim()) return;
    setReviewSubmitting(true);
    try {
      await createReview.mutateAsync({
        product_id: product.id,
        telegram_user_id: userId,
        user_name: reviewName.trim(),
        rating: reviewRating,
        comment: reviewComment.trim() || null,
        photos: reviewPhotos,
        images: reviewPhotos,
        is_verified_purchase: false,
        admin_reply: null,
        is_approved: false,
      });
      setReviewSubmitted(true);
      setShowReviewForm(false);
      setReviewRating(5);
      setReviewName('');
      setReviewComment('');
      setReviewPhotos([]);
      toast.success(language === 'ru' ? 'Отзыв отправлен! После проверки он появится на странице' : 'Sharh yuborildi!');
    } catch {
      toast.error(language === 'ru' ? 'Ошибка отправки' : 'Yuborishda xatolik');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout showBottomNav={false}>
        <div className="min-h-screen bg-surface-50 flex flex-col">
          {/* skeleton gallery */}
          <div className="w-full bg-surface-100" style={{ height: '62vh' }}>
            <div className="w-full h-full skeleton" />
          </div>
          <div className="p-6 space-y-4">
            <div className="h-6 w-2/3 skeleton rounded-lg" />
            <div className="h-5 w-1/3 skeleton rounded-lg" />
            <div className="h-4 w-full skeleton rounded-lg" />
            <div className="h-4 w-4/5 skeleton rounded-lg" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout showBottomNav={false}>
        <div className="min-h-screen bg-surface-50 flex items-center justify-center">
          <div className="text-center px-8">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white border border-surface-200 flex items-center justify-center shadow-card mb-6 mx-auto transition-transform duration-150 active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-surface-700" />
            </button>
            <p className="text-surface-500 text-sm">
              {language === 'ru' ? 'Товар не найден' : 'Mahsulot topilmadi'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const images = product.images.length > 0 ? product.images : [''];

  return (
    <>
    <Layout showBottomNav={false}>
      <div className="bg-surface-50 min-h-screen pb-28">

        {/* ─── GALLERY ─── */}
        <div className="relative w-full bg-surface-100 dark:bg-surface-800" style={{ height: '62vh' }}>

          {/* Back button — always visible, always clickable */}
          <button
            onClick={() => navigate(-1)}
            aria-label="Назад"
            className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-card transition-all duration-150 active:scale-95 hover:bg-white"
          >
            <ArrowLeft className="w-5 h-5 text-surface-900" />
          </button>

          {/* Main image */}
          <div
            className="w-full h-full overflow-hidden select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {product.images.length > 0 ? (
              <img
                key={currentImageIndex}
                src={images[currentImageIndex]}
                alt={getLocalizedValue(product.name, language)}
                className="w-full h-full object-cover"
                style={{ transition: 'opacity 200ms ease' }}
                loading="eager"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-surface-300 text-sm">
                {t('no_image')}
              </div>
            )}
          </div>

          {/* Prev / Next arrows (only when >1 image) */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center shadow-sm transition-all duration-150 active:scale-95 hover:bg-white"
              >
                <ChevronLeft className="w-5 h-5 text-surface-900" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center shadow-sm transition-all duration-150 active:scale-95 hover:bg-white"
              >
                <ChevronRight className="w-5 h-5 text-surface-900" />
              </button>
            </>
          )}

          {/* Dot indicators */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20">
              {images.map((_: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setCurrentImageIndex(i)}
                  className="transition-all duration-200"
                  style={{
                    width: i === currentImageIndex ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === currentImageIndex ? 'rgba(28,28,28,0.85)' : 'rgba(28,28,28,0.25)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ─── THUMBNAIL STRIP ─── */}
        {images.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-white dark:bg-surface-800 border-b border-surface-200/60">
            {images.map((img: string, i: number) => (
              <button
                key={i}
                onClick={() => setCurrentImageIndex(i)}
                className={`flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden transition-all duration-200 ${
                  i === currentImageIndex
                    ? 'ring-2 ring-surface-900 ring-offset-1'
                    : ''
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* ─── PRODUCT INFO ─── */}
        <div className="bg-white dark:bg-surface-800 px-5 pt-5 pb-6">

          {/* Name */}
          <h1
            className="font-semibold text-surface-900 leading-snug mb-1"
            style={{ fontSize: 19, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {getLocalizedValue(product.name, language)}
          </h1>

          {/* Rating */}
          {rating && rating.count > 0 && (
            <div className="flex items-center gap-1.5 mb-2">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${i < Math.round(rating.average) ? 'text-accent fill-current' : 'text-surface-300'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-surface-500">
                {rating.average.toFixed(1)} · {rating.count} {language === 'ru' ? 'отзывов' : 'sharh'}
              </span>
            </div>
          )}

          {/* Price + stock row */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-xl font-bold text-surface-900" style={{ fontSize: 22 }}>
              {formatPrice(product.price as number)}
            </p>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${product.stock > 0 ? 'bg-success' : 'bg-danger'}`} />
              <span className={`text-xs font-medium ${product.stock > 0 ? 'text-success' : 'text-danger'}`}>
                {product.stock > 0
                  ? (product.stock < 10
                    ? `${language === 'ru' ? 'Осталось' : 'Qoldi'}: ${product.stock}`
                    : t('in_stock'))
                  : t('out_of_stock')}
              </span>
            </div>
          </div>

          {/* Sizes */}
          {product.sizes.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2.5">
                {t('select_size')}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size: string) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[44px] h-11 px-4 rounded-xl text-sm font-semibold border transition-all duration-150 active:scale-95 ${
                      selectedSize === size
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white border-surface-200 dark:border-surface-600'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Colors */}
          {product.colors.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2.5">
                {t('select_color')}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color: { name: string; hex: string }) => (
                  <button
                    key={color.hex}
                    onClick={() => setSelectedColor(color)}
                    className={`flex items-center gap-2 px-3 h-11 rounded-xl text-sm font-medium border transition-all duration-150 active:scale-95 ${
                      selectedColor?.hex === color.hex
                        ? 'bg-surface-50 dark:bg-surface-700 text-surface-900 dark:text-white border-surface-900 dark:border-surface-400'
                        : 'bg-white dark:bg-surface-700 text-surface-900 dark:text-white border-surface-200 dark:border-surface-600'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color.hex, border: '1px solid rgba(28,28,28,0.12)' }}
                    />
                    {color.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2.5">
              {t('quantity')}
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-11 h-11 rounded-xl flex items-center justify-center border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 transition-all duration-150 active:scale-95"
              >
                <Minus className="w-4 h-4 text-surface-700 dark:text-surface-300" />
              </button>
              <span className="text-xl font-bold min-w-[2rem] text-center text-surface-900 dark:text-white">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                className="w-11 h-11 rounded-xl flex items-center justify-center border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 transition-all duration-150 active:scale-95"
              >
                <Plus className="w-4 h-4 text-surface-700 dark:text-surface-300" />
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2.5">
              {t('description')}
            </h2>
            <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed whitespace-pre-line">
              {getLocalizedValue(product.description, language)}
            </p>
          </div>

          {/* Specs */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
                {t('specifications')}
              </h2>
              <div className="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-600">
                {Object.entries(product.specs).map(([key, value], i) => (
                  <div
                    key={key}
                    className={`flex justify-between py-3 px-4 text-sm ${
                      i > 0 ? 'border-t border-surface-200 dark:border-surface-600' : ''
                    } ${i % 2 === 0 ? 'bg-surface-50 dark:bg-surface-700' : 'bg-white dark:bg-surface-800'}`}
                  >
                    <span className="text-surface-500">{key}</span>
                    <span className="text-surface-900 font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="mb-2">
            <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
              {language === 'ru' ? 'Отзывы' : 'Sharhlar'} ({reviews.length})
            </h2>
            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.slice(0, 5).map((review) => {
                  const photos = review.photos?.length ? review.photos : review.images ?? [];
                  return (
                    <div
                      key={review.id}
                      className="rounded-xl p-4 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-surface-900">{review.user_name}</span>
                          {review.is_verified_purchase && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                              {language === 'ru' ? 'Покупка ✓' : 'Sotib olgan ✓'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-surface-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-surface-600 leading-relaxed">{review.comment}</p>
                      )}
                      {photos.length > 0 && (
                        <div className="flex gap-2 mt-3 overflow-x-auto">
                          {photos.map((photo: string, i: number) => (
                            <button key={i} onClick={() => setLightboxUrl(photo)} className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-surface-200 dark:bg-surface-600 group relative">
                              <img src={photo} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <ZoomIn className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {review.admin_reply && (
                        <div className="mt-3 p-3 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600">
                          <p className="text-xs font-semibold text-surface-400 mb-1">
                            {language === 'ru' ? 'Ответ магазина' : "Do'kon javobi"}
                          </p>
                          <p className="text-sm text-surface-700 dark:text-surface-300">{review.admin_reply}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : !reviewSubmitted ? (
              <p className="text-sm text-surface-400 mb-3">
                {language === 'ru' ? 'Пока нет отзывов. Будьте первым!' : "Hali sharhlar yo'q. Birinchi bo'ling!"}
              </p>
            ) : null}

            {/* Review Success */}
            {reviewSubmitted && (
              <div className="rounded-xl p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 mb-3">
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  {language === 'ru' ? 'Отзыв отправлен! После проверки модератором он появится на странице.' : "Sharh yuborildi! Moderator tekshirgandan keyin sahifada paydo bo'ladi."}
                </p>
              </div>
            )}

            {/* Write Review Button */}
            {!showReviewForm && !reviewSubmitted && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-600 text-surface-500 dark:text-surface-400 text-sm font-medium hover:border-surface-400 dark:hover:border-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                {language === 'ru' ? 'Оставить отзыв' : 'Sharh qoldirish'}
              </button>
            )}

            {/* Review Form */}
            {showReviewForm && (
              <div className="rounded-xl p-4 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-white">
                    {language === 'ru' ? 'Ваш отзыв' : 'Sizning sharhingiz'}
                  </h3>
                  <button
                    onClick={() => setShowReviewForm(false)}
                    className="text-surface-400 hover:text-surface-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Star Rating */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-surface-500 mb-2">
                    {language === 'ru' ? 'Оценка' : 'Baho'}
                  </p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-0.5 transition-transform active:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= (hoverRating || reviewRating)
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-surface-300 dark:text-surface-600'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs text-surface-400 ml-2">
                      {reviewRating}/5
                    </span>
                  </div>
                </div>

                {/* Name */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-surface-500 mb-1.5">
                    {language === 'ru' ? 'Ваше имя' : 'Ismingiz'}
                  </label>
                  <input
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    placeholder={language === 'ru' ? 'Как вас зовут?' : 'Ismingiz?'}
                    className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900"
                  />
                </div>

                {/* Comment */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-surface-500 mb-1.5">
                    {language === 'ru' ? 'Комментарий' : 'Izoh'}
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={language === 'ru' ? 'Расскажите о качестве, размере, материале...' : 'Sifat, o\'lcham, material haqida gapiring...'}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-surface-900"
                  />
                </div>

                {/* Photo Upload */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-surface-500 mb-2">
                    {language === 'ru' ? 'Фото (необязательно)' : 'Fotos (ixtiyoriy)'}
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {reviewPhotos.map((photo, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-700 flex-shrink-0">
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleRemoveReviewPhoto(i)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    {reviewPhotos.length < 5 && (
                      <button
                        onClick={() => reviewPhotoInput.current?.click()}
                        disabled={reviewUploading}
                        className="w-16 h-16 rounded-lg border-2 border-dashed border-surface-200 dark:border-surface-600 flex flex-col items-center justify-center text-surface-400 hover:border-surface-400 transition-colors"
                      >
                        {reviewUploading ? (
                          <span className="w-4 h-4 border-2 border-surface-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Camera className="w-4 h-4" />
                            <span className="text-[9px] mt-0.5">+</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <input
                    ref={reviewPhotoInput}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleReviewPhotoUpload}
                    className="hidden"
                  />
                  <p className="text-[10px] text-surface-400 mt-1">
                    {language === 'ru' ? 'Максимум 5 фото' : 'Kamida 5 ta rasm'}
                  </p>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmitReview}
                  disabled={!reviewName.trim() || reviewSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                >
                  {reviewSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {language === 'ru' ? 'Отправить отзыв' : 'Sharhni yuborish'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── FIXED BOTTOM BAR ─── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 dark:bg-surface-800/98 border-t border-surface-200 dark:border-surface-700 shadow-elevated pb-safe"
        style={{ willChange: 'transform' }}
      >
        <div className="flex items-center gap-3 px-4 py-3">

          {/* Wishlist + Notifications */}
          <WishlistToggle
            productId={product.id}
            isFavorite={isFavorite}
            onToggleFavorite={() => toggleFavorite.mutate({ productId: product.id, isFavorite })}
            language={language}
            variant="detail"
          />

          {/* Share */}
          <button
            onClick={handleShare}
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 transition-all duration-150 active:scale-95"
          >
            <Share2 className="w-5 h-5 text-surface-500" />
          </button>

          {/* Add to Cart — primary CTA */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed ${
              product.stock === 0
                ? 'bg-surface-300 dark:bg-surface-600 text-white'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>{product.stock === 0 ? t('out_of_stock') : t('add_to_cart')}</span>
          </button>
        </div>
      </div>
    </Layout>

      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
};
