<div align="center">

  <img src="public/logo.png" alt="WhereDidItGo Logo" width="120" style="border-radius: 24px; margin-bottom: 16px;" />

  # WhereDidItGo

  **A modern, local-first personal finance tracker built for Web & Android.**  
  *Data stays 100% on your device. Beautiful Material 3 Expressive UI with Liquid Glass translucency.*

  [![Vue 3](https://img.shields.io/badge/Vue-3.5-4fc08d?style=for-the-badge&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-7.3-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Capacitor](https://img.shields.io/badge/Capacitor-8.5-119eee?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)
  [![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
  [![License](https://img.shields.io/badge/License-MIT-blue.style=for-the-badge)](#license)

  [**Live Web Demo**](https://wherediditgo.vercel.app) • [**Features**](#-features) • [**Tech Stack**](#-tech-stack) • [**Getting Started**](#-getting-started) • [**Deployment**](#-deployment)

</div>

---

## ✨ Highlights

* 🔒 **100% Local-First Privacy**: All transactions, accounts, and financial data are stored strictly on your device using Dexie IndexedDB. Zero cloud telemetry or external servers.
* 🎨 **Material 3 Expressive & Translucent Glass**: Designed with vibrant dynamic color roles, accessible touch targets, and Liquid Glass backdrop blur overlays.
* ⚡ **Lightning Fast & Offline-First**: Works seamlessly without network access with built-in offline status banners and instant reactive queries.
* 📊 **Smart Financial Insights**: Visual breakdown of spending rhythm, category share, month-over-month comparisons, and savings pace.
* 💸 **Debts & Loans Management**: Track money lent or borrowed, partial payments, and settled statuses separately from daily budgets.
* 🌐 **Multi-Language Support (i18n)**: Full localization in **English**, **Русский**, and **Тоҷикӣ**.
* 🔐 **PIN Lock & Biometric Security**: Safeguard app access with a 4-digit security PIN and native fingerprint/Face ID shortcuts.
* 📦 **Full Backup & Export**: Export/Import complete JSON backups and export transactions as CSV files anytime.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | [Vue 3](https://vuejs.org/) (Composition API, `<script setup lang="ts">`) |
| **State Management** | [Pinia 4](https://pinia.vuejs.org/) |
| **Local Database** | [Dexie.js 4](https://dexie.org/) (IndexedDB wrapper) |
| **Native Runtime** | [Capacitor 8](https://capacitorjs.com/) (Android / iOS / PWA) |
| **Build Tool** | [Vite 7](https://vitejs.dev/) + `vue-tsc` strict TypeScript checking |
| **Icons & Visuals** | [Lucide Vue](https://lucide.dev/) + [Chart.js](https://www.chartjs.org/) |
| **Localization** | [vue-i18n 11](https://vue-i18n.intlify.dev/) |

---

## 🚀 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) `>= 18.0.0`
* `npm` `>= 9.0.0`

### Installation & Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Khisrav/wherediditgo.git
   cd wherediditgo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

4. **Run TypeScript typecheck**:
   ```bash
   npm run typecheck
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🚀 Deployment & Installation

### 🌐 Deploy on Vercel

This repository includes a pre-configured [`vercel.json`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/vercel.json) for 1-click single-page application deployment:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FKhisrav%2Fwherediditgo)

### 📲 Install as a PWA (Web App)

When hosted on Vercel or any HTTPS server, WhereDidItGo includes a full [Web App Manifest](public/manifest.json):
* **Android**: Open the web app in Chrome and tap **"Install App"**.
* **iOS**: Open in Safari and tap **Share → Add to Home Screen**.

### 🤖 Android Native APK

To build a standalone native Android package:

```bash
# Build web app and sync with Capacitor Android
npm run sync

# Generate release APK
cd android
./gradlew assembleRelease
```
The APK will be generated at `android/app/build/outputs/apk/release/app-release-unsigned.apk`.

---

## 📂 Project Structure

```text
wherediditgo/
├── android/                   # Capacitor Android native project
├── public/                    # PWA manifest, logos, favicons
├── src/
│   ├── app/                   # AppShell, MobileBottomNav, layouts
│   ├── components/            # Reusable UI primitives (BottomSheet, Buttons, Keypad)
│   ├── composables/           # Reusable logic (useNetworkStatus, useDebouncedSearch)
│   ├── db/                    # Dexie database schemas & tables
│   ├── features/              # Feature modules (activity, budgets, debts, home, insights, settings)
│   ├── i18n/                  # Localization bundles (en, ru, tj)
│   ├── lib/                   # Utilities (dates, money, platform detection)
│   ├── services/              # Native plugins & backup engine
│   ├── stores/                # Pinia state stores (accounts, categories, transactions, settings)
│   └── styles/                # Tokens, glass styling, global CSS
├── vercel.json                # Vercel SPA routing configuration
└── vite.config.ts             # Vite configuration
```

---

## 🔒 Privacy & Security

WhereDidItGo was built with a strict **Privacy-First** philosophy:
* **No Telemetry**: No tracking scripts, analytics, or external API dependencies.
* **Local Storage**: All data remains on the user's physical device in IndexedDB.
* **Encrypted Security**: App locking with PIN hash and optional biometric authentication.
* **Full Data Ownership**: Export your entire dataset anytime as JSON or CSV.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.

<div align="center">
  Crafted with ❤️ by Khisrav Kh. & Contributors
</div>
