import { useState } from 'react';
import { ArrowLeft, ChevronDown, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useTranslation } from '../hooks/useTranslation';
import { cn } from '../lib/utils';

interface FAQItem {
  question: { ru: string; uz: string };
  answer: { ru: string; uz: string };
}

const faqData: FAQItem[] = [
  {
    question: { ru: 'Как оформить заказ?', uz: 'Buyurtma qanday beriladi?' },
    answer: {
      ru: 'Выберите товар в каталоге, добавьте в корзину и оформите заказ. Укажите имя, телефон и адрес доставки.',
      uz: 'Katalogdan mahsulotni tanlang, savatga qo\'shing va buyurtma bering. Ism, telefon va yetkazish manzilini kiriting.',
    },
  },
  {
    question: { ru: 'Сколько стоит доставка?', uz: 'Yetkazish narxi qancha?' },
    answer: {
      ru: 'Стоимость доставки зависит от региона. Бесплатная доставка при заказе от 500 000 сум.',
      uz: 'Yetkazish narxi hududga bog\'liq. 500 000 so\'mdan ortiq buyurtmada bepul yetkazish.',
    },
  },
  {
    question: { ru: 'Как вернуть товар?', uz: 'Mahsulotni qanday qaytarish mumkin?' },
    answer: {
      ru: 'Если товар не подошёл, вы можете оформить возврат в течение 14 дней. Перейдите в «Мои заказы» и нажмите «Возврат».',
      uz: 'Agar mahsulot mos kelmasa, 14 kun ichida qaytarish mumkin. "Mening buyurtmalarim" ga boring va "Qaytarish" tugmasini bosing.',
    },
  },
  {
    question: { ru: 'Какие способы оплаты доступны?', uz: "Qanday to'lov usullari mavjud?" },
    answer: {
      ru: 'Мы принимаем наличные при получении, а также оплату через Payme и Click.',
      uz: 'Biz naqd pul, Payme va Click orqali to\'lovni qabul qilamiz.',
    },
  },
  {
    question: { ru: 'Можно ли примерить товар перед покупкой?', uz: 'Mahsulotni sotib olishdan oldin sinab ko\'rish mumkinmi?' },
    answer: {
      ru: 'Да, при доставке вы можете примерить товар. Если не подошёл — можно вернуть курьеру.',
      uz: 'Ha, yetkazish paytida mahsulotni sinab ko\'rishingiz mumkin. Mos kelmasa — kuryerga qaytarishingiz mumkin.',
    },
  },
  {
    question: { ru: 'Как отследить статус заказа?', uz: 'Buyurtma holatini qanday kuzatish mumkin?' },
    answer: {
      ru: 'Перейдите в раздел «Заказы» в вашем профиле. Там отображается текущий статус и история изменений.',
      uz: 'Profilingizdagi "Buyurtmalar" bo\'limiga o\'ting. Hozirgi holat va o\'zgarishlar tarixi ko\'rsatiladi.',
    },
  },
];

export const FAQ = () => {
  const { language } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Layout showBottomNav={false}>
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
        <header className="sticky top-0 z-40 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
            <Link to="/" className="p-2 rounded-lg text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-700 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold text-surface-900 dark:text-white">
              {language === 'ru' ? 'Вопрос-ответ' : "Savol-javob"}
            </h1>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6 space-y-3">
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
            {language === 'ru'
              ? 'Ответы на часто задаваемые вопросы'
              : "Ko'p beriladigan savollarga javoblar"}
          </p>

          {faqData.map((item, i) => (
            <div
              key={i}
              className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-4.5 h-4.5 text-surface-600 dark:text-surface-400" />
                </div>
                <span className="flex-1 text-sm font-semibold text-surface-900 dark:text-white">
                  {item.question[language]}
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 text-surface-400 transition-transform flex-shrink-0",
                  openIndex === i && 'rotate-180'
                )} />
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4 -mt-1">
                  <div className="pl-12 text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                    {item.answer[language]}
                  </div>
                </div>
              )}
            </div>
          ))}
        </main>
      </div>
    </Layout>
  );
};
