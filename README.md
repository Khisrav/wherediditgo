# WhereDidItGo

Local-first personal finance tracker for Android (Vue 3 + Capacitor). Data stays on your device; move phones with JSON backup export/import.

## Features

- Quick expense / income / transfer entry (amount-first keypad)
- Accounts with live balances
- Category budgets and “left to spend”
- Activity search & filters
- Insights charts (by category, daily, 6-month trend)
- Light / dark / system theme
- JSON full backup + CSV transaction export

## Develop

```bash
npm install
npm run dev
```

## Android

```bash
npm run sync
# open android/ in Android Studio and run on a device/emulator
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run sync` | Build and `cap sync android` |
| `npm run typecheck` | `vue-tsc --noEmit` |
