# בוט בן גביר

יישום עצמאי המדמה שיחה מבוססת AI עם איתמר בן גביר. הוא כולל צ׳אט כתוב ושיחה קולית בזמן אמת, ואינו דורש הרשמה.

> זוהי הדמיית AI ולא האדם האמיתי. התשובות עשויות להיות שגויות ויש לבדוק מידע חשוב מול מקורות אמינים.

## יכולות

- שיחה קולית בזמן אמת באמצעות Gemini Live.
- צ׳אט כתוב באמצעות Gemini.
- תמונה, סרטון ורקע מקומיים.
- מאגר ידע לדוגמה. לקבלת תשובות אמינות ומקיפות יותר יש להרחיב ולעדכן את מאגר המידע או את דפי המסרים.

## דרישות

- Node.js בגרסה 20 ומעלה.
- npm.
- מפתח API פעיל של Google Gemini.
- לשיחה קולית: דפדפן עדכני והרשאת מיקרופון.

## התקנה והפעלה

```bash
npm install
```

העתיקו את `.env.example` לקובץ בשם `.env.local`.

ב־Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

ב־macOS או Linux:

```bash
cp .env.example .env.local
```

הכניסו ב־`.env.local` את מפתח Gemini שלכם:

```dotenv
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_CHAT_MODEL=gemini-3.8-flash
GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview
PORT=3001
AI_BURST_LIMIT=10
```

הפעילו:

```bash
npm run dev
```

פתחו בדפדפן את `http://127.0.0.1:3000`.

## בדיקות והרצת build

```bash
npm run check
npm run build
npm start
```

לאחר `npm start` האתר זמין ב־`http://127.0.0.1:3001`.

## מאגר הידע

מאגר הדוגמה נמצא בתיקיית `server/data`. אפשר לערוך ולהרחיב אותו לפי הצורך. לחיבור מקור מידע נוסף בעתיד ניתן לממש את `loadOptionalKnowledgeExtension()` בקובץ `server/knowledge.js`. מומלץ להזין רק תוכן שנבדק ואושר.

## פרטיות ואבטחה

- הודעות הצ׳אט והאודיו מועברים ל־Gemini לצורך יצירת תשובה.
- שיחות, תמלילים והקלטות אינם נשמרים בפרויקט.
- אין להכניס מפתחות ישירות לקוד או ל־Git.
- `.env.local` מוחרג מ־Git; יש לשתף רק את `.env.example` הריק.
