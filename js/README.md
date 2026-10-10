# JavaScript Structure

Quero Learning Tools now uses the requested feature-file layout.

The app still uses classic browser scripts, not ES modules, because the current HTML has many inline button handlers such as `onclick="..."`. Load order still matters.

## Load order

1. `state.js`
2. `supabase-client.js`
3. `question-bank.js`
4. `create-question.js`
5. `exam-builder.js`
6. `docx-export.js`
7. `question-extractor.js`
8. `curriculum-manager.js`
9. `app.js`

## Notes

- `state.js` currently includes the live Supabase constants/client as well as state and auth setup.
- `supabase-client.js` is reserved for the next cleanup pass, where we can move Supabase setup into it once the globals are untangled.
- This split is designed to preserve behaviour first.

- `supabase-client.js` - Supabase URL, public anon key, and browser client setup.
