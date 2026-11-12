# تحديث 2026-09-22 — صور حقيقية لكل إعلان

## شنو تبدّل
- 18 إعلان ولّات عندهم صور حقيقية (4 صور لكل واحد) من المعاينة المباشرة لصفحة الإعلان الأصلية:
  casa-valfleuri-106، rabat-agdal-135، marrakech-semlalia-100، tanger-valfleuri-85،
  tanger-assalam-179، tanger-hassani-76، tanger-malabata-75، agadir-houda-80،
  meknes-hamria-160، kenitra-centre-108، mohammedia-mansouria-70، jadida-najd-75،
  oujda-mohammedv-104، sale-tabriquet-100، temara-wifak-192، tanger-mesnana-88،
  tanger-balia-64، tanger-n1-55
- الصور محفوظة فـ assets/ بصيغة webp (عرض أقصى 1200px، جودة 80)، ومرجّعة فـ حقل photos ديال data/listings.js، و photo_real: true.
- 11 إعلان تحيّدو حيث صفحاتهم الأصلية ما بقاتش خدامة (redirect لصفحة البحث فـ Avito أو «Cette page n'est plus disponible» فـ Mubawab):
  fes-montfleuri-130، tetouan-ceuta-63، tanger-mesnana-golf-118، tanger-n1-asila،
  tanger-balia-50، tanger-balia-74، tanger-balia-48، tanger-balia-56، tanger-balia-60،
  tanger-n1-50، tanger-gueznaya-46
- المجموع دابا: 25 إعلان (20 بصور حقيقية، 5 بـ «لا توجد صورة للعقار» حيث الإعلان غير متاح/قيد المراجعة).
- sitemap.xml تجدّد على حساب الإعلانات الـ25.
- روابط canonical و og:url و robots.txt ولّات بالرابط الحقيقي للموقع.

## للمصمم
- ما تبدّل والو فـ التصميم أو الألوان أو الوظائف — غير البيانات والصور.
- الصور خاصها تبان من assets/ بنفس البنية ديال المجلد (مثلاً assets/tanger-valfleuri-85-01.webp).

# تحديث 2026-09-22 — العرض ثلاثي الأبعاد (3D Showcase)

## شنو تبدّل
- بطاقة الـ hero ولات تفاعلية ثلاثية الأبعاد: بطاقة داكنة-ذهبية فاخرة للعقار المميز (ستوديو الوكالة بملابطا) تميل مع حركة المؤشر/الإصبع، مع لمعان يتبع المؤشر و3 رقائق عائمة (اسم الوكالة، عدد الهمزات، عدد المدن) باختلاف منظر خفيف.
- خانة جديدة «✨ الهمزات بتجربة ثلاثية الأبعاد» (id: showcase3d) بعد قسم الهمزات: أفضل 3 همزات حالياً ببطاقات 3D مستقلة، كل واحدة تربط لصفحة التفاصيل.
- ملف جديد `showcase3d.js` (Vanilla JS، بدون مكتبات خارجية): يقرأ من `LISTINGS` و`SOUQ_CONFIG` مباشرة، يحترم `prefers-reduced-motion`.
- تنسيقات جديدة في `styles.css` (قسم "العرض ثلاثي الأبعاد").
- رابط جديد في القائمة: «✨ تجربة 3D».
- عنوان تبويب صفحة التفاصيل ولى: «عقار | كاب إيمو طنجة — سوق بيع العقار المغربي».

## للمصمم
- طبّق نفس التغييرات على نسخة الـ artifact: انسخ `showcase3d.js` الجديد، وأضف كتلة CSS الجديدة لآخر `styles.css`، وعدّل `index.html` (aside الـ hero + القسم الجديد + رابط القائمة + وسم script) و`listing.html` (العنوان).
- ما تبدّل والو آخر: نفس البيانات، الصور، الألوان، والوظائف.
