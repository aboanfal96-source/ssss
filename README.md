# 🚀 TADAWUL US PRO — دليل النشر والتشغيل

## هيكل المشروع

```
tadawul-us-pro/
├── index.html          ← الصفحة الرئيسية (سطح المكتب)
├── mobile.html         ← نسخة الجوال
├── mobile-app.js       ← كود الجوال
├── vercel.json         ← إعدادات Vercel
├── package.json        ← معلومات المشروع
├── .env.example        ← نموذج المتغيرات البيئية
├── .gitignore
├── README.md
└── api/                ← الخوادم (Serverless Functions)
    ├── ai.js           ← Claude AI proxy
    ├── earnings.js     ← بيانات الأرباح
    ├── options.js      ← سلسلة الأوبشنز
    ├── recommend.js    ← محرك ترشيح العقود
    ├── stock.js        ← بيانات الأسهم من Yahoo
    └── test.js         ← تشخيص المنصة
```

## الطريقة 1: النشر عبر GitHub + Vercel (مُوصى بها)

### الخطوة 1: رفع المشروع على GitHub

1. اذهب إلى https://github.com/new
2. سمّ المستودع: `tadawul-us-pro`
3. اجعله **Private** (خاص)
4. اضغط **Create repository**
5. افتح Terminal في مجلد المشروع ونفّذ:

```bash
cd tadawul-us-pro
git init
git add .
git commit -m "TADAWUL US PRO v2"
git branch -M main
git remote add origin https://github.com/USERNAME/tadawul-us-pro.git
git push -u origin main
```

### الخطوة 2: النشر على Vercel

1. اذهب إلى https://vercel.com واسجل دخول بحساب GitHub
2. اضغط **Add New → Project**
3. اختر مستودع `tadawul-us-pro`
4. Framework Preset: اتركه **Other**
5. اضغط **Deploy**

### الخطوة 3: إضافة مفتاح Claude API

1. في لوحة Vercel → اختر مشروعك
2. اذهب إلى **Settings → Environment Variables**
3. أضف:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** مفتاحك من https://console.anthropic.com/settings/keys
4. اضغط **Save**
5. اذهب إلى **Deployments → أحدث نشر → ⋮ → Redeploy**

### الخطوة 4: تأكد من التشغيل

افتح: `https://YOUR-PROJECT.vercel.app/api/test`

يجب أن ترى:
- ✅ Stock data works
- ✅ aiConfigured: true

## الطريقة 2: النشر المباشر بدون GitHub

```bash
# تثبيت Vercel CLI
npm i -g vercel

# في مجلد المشروع
cd tadawul-us-pro
vercel login
vercel --prod
```

ثم أضف المفتاح:
```bash
vercel env add ANTHROPIC_API_KEY
```

وأعد النشر:
```bash
vercel --prod
```

## تشغيل محلي للتطوير

```bash
cd tadawul-us-pro

# أنشئ ملف .env.local
echo "ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY" > .env.local

# شغّل السيرفر المحلي
npx vercel dev
```

المنصة ستعمل على: http://localhost:3000

## كيف تعمل المنصة

### بيانات الأسهم
- `api/stock.js` يجلب بيانات الشموع من Yahoo Finance
- يشمل بيانات ما قبل السوق (Pre-Market) وبعده (Post-Market)
- يدعم جميع الفريمات الزمنية (5 دقائق حتى سنتين)

### تحليل فني متقدم
- Sniper Score: نظام تقييم استباقي متعدد العوامل
- 13 استراتيجية: كلاسيك، هارمونيك، إيليوت، بولنجر، VWAP...
- كشف Spring/Upthrust (ويكوف)
- Squeeze Detection (بولنجر + كلتنر)
- Multi-Timeframe Analysis
- Volume/RSI Divergence

### ترشيح العقود
- `api/recommend.js` يحسب Score لكل عقد بناءً على:
  - التحليل الفني (35%)
  - Delta المثالية (الحلوة)
  - IV Rank
  - السيولة (OI + Volume)
  - Spread (فرق العرض/الطلب)
  - الحركة المتوقعة
- يدعم Yahoo options chain أو Black-Scholes synthetic كـ fallback

### الذاكرة التكيفية (AI)
- تسجل كل توصية وتتتبع نتائجها
- تعدّل أوزان الاستراتيجيات بناءً على الأداء
- Kelly Criterion لحجم المركز المثالي

### Claude AI
- `api/ai.js` يرسل التحليل الفني الكامل لـ Claude
- يحصل على تحليل احترافي + رأي في العقود المرشحة

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| "ANTHROPIC_API_KEY غير مضبوط" | أضف المفتاح في Vercel Settings → Environment Variables ثم أعد النشر |
| Options blocked | Yahoo يحجب الطلبات من datacenter → النظام يستخدم Black-Scholes تلقائياً |
| بيانات الأسهم لا تظهر | تحقق من /api/test — قد تحتاج تغيير Region في Vercel |
| الصفحة فارغة | افتح Developer Console (F12) وتحقق من الأخطاء |

## تغيير الدومين

1. Vercel → Settings → Domains
2. أضف دومينك (مثل: trading.yourdomain.com)
3. حدّث DNS عند مسجّل الدومين

---

⚠️ **تنبيه مهم:** هذه المنصة أداة تحليلية تعليمية وليست نصيحة مالية. التداول ينطوي على مخاطر خسارة رأس المال.
