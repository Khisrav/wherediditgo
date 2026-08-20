# Google Play Console Submission Checklist

Follow these steps to submit **WhereDidItGo** to the Google Play Store.

---

## Phase 1: Build Release Bundle (.aab)

1. **Verify strict compilation**:
   ```bash
   npm run typecheck
   npm run build
   ```
2. **Sync native Android directory**:
   ```bash
   npm run sync
   ```
3. **Build signed Android App Bundle (.aab)**:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   *Output file*: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Phase 2: Play Console App Creation

1. Open [Google Play Console](https://play.google.com/console).
2. Click **Create app**:
   * **App name**: `WhereDidItGo — Personal Finance`
   * **Default language**: English (US)
   * **App or game**: App
   * **Free or paid**: Free (with In-App Purchases)
3. Accept Developer Declarations and click **Create app**.

---

## Phase 3: Complete App Content Declarations

1. **Privacy Policy**:
   * Paste URL to hosted [`PRIVACY_POLICY.md`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/PRIVACY_POLICY.md).
2. **App Access**:
   * Select *"All functionality is available without special access restrictions"*.
3. **Ads**:
   * Select *"No, my app does not contain ads"*.
4. **Content Rating**:
   * Fill out questionnaire (Select Utility / Productivity, No Violence, No Public User Content).
5. **Target Audience**:
   * Target age: **18 and over** (Finance category requirement).
6. **Data Safety**:
   * Fill in answers from [`PLAY_STORE_DATA_SAFETY.md`](file:///c:/Users/JA/Documents/Projects_2026/wherediditgo/PLAY_STORE_DATA_SAFETY.md).
7. **Financial Features Declaration**:
   * Select *"Manual financial management tracker — no banking connections"*.

---

## Phase 4: In-App Products Setup

1. Under **Monetize → In-app products**:
   * Click **Create product**.
   * **Product ID**: `com.wherediditgo.pro`
   * **Name**: `WhereDidItGo Pro (Lifetime)`
   * **Price**: `$4.99` (or local equivalent).
   * Status: **Active**.

---

## Phase 5: Internal Testing & Production Release

1. Navigate to **Testing → Internal testing**.
2. Create a new release and upload `app-release.aab`.
3. Add internal tester email accounts and test purchase flow with test license accounts.
4. Once verified, promote release to **Production** and submit for Google Play Review!
