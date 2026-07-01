declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          start_param?: string;
        };
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        BackButton: {
          isVisible: boolean;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
          setParams: (params: {
            text?: string;
            color?: string;
            text_color?: string;
            is_active?: boolean;
            is_visible?: boolean;
          }) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        expand: () => void;
        close: () => void;
        ready: () => void;
        sendData: (data: string) => void;
      };
    };
  }
}

export const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

export const getTelegramUser = () => {
  return tg?.initDataUnsafe?.user;
};

export const getTelegramTheme = () => {
  return tg?.themeParams || {};
};

let _mainButtonCallback: (() => void) | null = null;
let _backButtonCallback: (() => void) | null = null;

export const showMainButton = (text: string, onClick: () => void) => {
  if (!tg?.MainButton) return;

  if (_mainButtonCallback) {
    tg.MainButton.offClick(_mainButtonCallback);
  }
  _mainButtonCallback = onClick;
  tg.MainButton.setText(text);
  tg.MainButton.onClick(onClick);
  tg.MainButton.show();
};

export const hideMainButton = () => {
  if (!tg?.MainButton) return;
  tg.MainButton.hide();
};

export const showBackButton = (onClick: () => void) => {
  if (!tg?.BackButton) return;

  if (_backButtonCallback) {
    tg.BackButton.offClick(_backButtonCallback);
  }
  _backButtonCallback = onClick;
  tg.BackButton.onClick(onClick);
  tg.BackButton.show();
};

export const hideBackButton = () => {
  if (!tg?.BackButton) return;
  if (_backButtonCallback) {
    tg.BackButton.offClick(_backButtonCallback);
    _backButtonCallback = null;
  }
  tg.BackButton.hide();
};

// ─── Low-level haptic wrappers ─────────────────────────────────────────────

const impact = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
  if (!tg?.HapticFeedback) return;
  tg.HapticFeedback.impactOccurred(style);
};

const notification = (type: 'error' | 'success' | 'warning') => {
  if (!tg?.HapticFeedback) return;
  tg.HapticFeedback.notificationOccurred(type);
};

const selectionChanged = () => {
  if (!tg?.HapticFeedback) return;
  tg.HapticFeedback.selectionChanged();
};

// ─── Semantic haptic API (use these in UI) ────────────────────────────────

export const haptic = {
  /** Добавление товара в корзину — мягкая вибрация */
  addToCart: () => impact('light'),

  /** Удаление товара из корзины/избранного — мягкая вибрация */
  remove: () => impact('light'),

  /** Выбор опции (размер, цвет) — тактильный отклик */
  select: () => selectionChanged(),

  /** Подтверждение действия — средняя вибрация */
  confirm: () => impact('medium'),

  /** Оплата — средняя вибрация */
  pay: () => impact('medium'),

  /** Успешное действие — уведомление об успехе */
  success: () => notification('success'),

  /** Предупреждение — уведомление-предупреждение */
  warning: () => notification('warning'),

  /** Ошибка — жёсткая вибрация + уведомление об ошибке */
  error: () => {
    impact('heavy');
    notification('error');
  },

  /** Навигация — лёгкая вибрация */
  navigate: () => impact('light'),
};

// ─── Legacy (deprecated — use haptic.* instead) ───────────────────────────

/** @deprecated Use haptic.addToCart() / haptic.confirm() / haptic.pay() instead */
export const hapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
  impact(type);
};

/** @deprecated Use haptic.success() / haptic.error() / haptic.warning() instead */
export const hapticNotification = (type: 'error' | 'success' | 'warning') => {
  notification(type);
};

export const expandApp = () => {
  if (!tg) return;
  tg.expand();
};

export const closeApp = () => {
  if (!tg) return;
  tg.close();
};

export const readyApp = () => {
  if (!tg) return;
  tg.ready();
};

export const isTelegramWebApp = () => {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp;
};
