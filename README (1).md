# Graduation Project Supervision Platform

منصة للإشراف على مشاريع التخرج باستخدام Google Workspace وGoogle Apps Script، مع دعم مراجعة أكاديمية بالذكاء الاصطناعي.

## Architecture

- **Frontend:** `Index.html`
- **Backend:** `Code.gs`
- **Database:** Google Sheets
- **File storage:** Google Drive
- **Web runtime:** Google Apps Script Web App
- **AI review:** OpenAI API عبر Script Properties

## Core Google Sheets

- `Students`
- `Submissions`
- `Reviews`
- `Milestones`
- `Users`

## Access Roles

يتم التحكم في الدخول من ورقة `Users`.

| Email | Role | StudentID | Active |
|---|---|---|---|
| supervisor@example.com | Supervisor |  | TRUE |
| student@example.com | Student | ST001 | TRUE |

- `Supervisor`: إدارة الطلاب، المراجعات، القرارات، والتقييم بالذكاء الاصطناعي.
- `Student`: الوصول إلى مشروعه وملفاته فقط.

## Deployment

1. افتح مشروع Google Apps Script المرتبط بحساب العمل.
2. ضع محتوى `Code.gs` في ملف `Code.gs`.
3. ضع محتوى `Index.html` في ملف HTML باسم `Index`.
4. تأكد من تفعيل **Advanced Google Drive Service** عند الحاجة لاستخراج Word/PDF.
5. ضع مفتاح OpenAI داخل:
   **Project Settings → Script Properties**
   باسم:
   `OPENAI_API_KEY`
6. لا تضع مفتاح API داخل GitHub أو داخل ملفات المصدر.
7. من Apps Script اختر:
   **Deploy → Manage deployments → New version → Deploy**
8. استخدم رابط Web App للطلاب والمشرفين.

## Security

- المستودع يفضل أن يبقى **Private**.
- لا ترفع بيانات الطلاب أو ملفات مشاريعهم إلى GitHub.
- لا ترفع مفاتيح API أو أي أسرار.
- تبقى بيانات الطلاب داخل Google Sheets وGoogle Drive المؤسسي.
- يجب اختبار الدخول بحساب مشرف ثم بحساب طالب واحد قبل الإطلاق.

## Repository Purpose

GitHub هنا لإدارة **الكود والإصدارات والنسخ الاحتياطية** فقط.

التشغيل الفعلي للمنصة يبقى على **Google Apps Script Web App**.

## Main Files

```text
graduation-project-supervision-platform/
├── Index.html
├── Code.gs
├── README.md
└── .gitignore
```

## Academic Review

يستخدم التقييم الذكي قواعد مرتبطة بدليل كتابة الرسائل والأطروحات بجامعة السودان للعلوم والتكنولوجيا.

ملاحظة مهمة: لا يُعامل وجود توثيق Harvard كشرط إلزامي مستقل في الفصل الأول، بينما يطبق التوثيق حيث ترتبط الكتابة بالمصادر والأدبيات، خصوصًا الفصل الثاني والمراجع والمراجعة الشاملة.

## Status

المنصة في مرحلة الاختبار التشغيلي والتحقق من الصلاحيات قبل الاستخدام الفعلي مع الطلاب.
