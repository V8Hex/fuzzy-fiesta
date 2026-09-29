# Fridgeful

**Less waste. A fuller life.**

Fridgeful turns supermarket receipts into a virtual kitchen. Photograph a receipt, review the detected groceries, and keep track of food in your fridge, freezer or pantry. Add the dates printed on your products, set food reminders, and record what you eat or waste.

This is a working first version built with React Native, TypeScript and Expo SDK 54. It uses one shared app for iOS and Android, with native receipt recognition on each platform.

## What works

- Receipt photos from the camera or photo picker.
- On-device English/Latin-script OCR: Apple Vision on iOS; a bundled Google ML Kit model on Android. No AI key or receipt-upload server.
- Editable receipt text and a review step before any groceries are saved.
- Category suggestions, quantities, prices and storage locations. Unrecognized foods are flagged for review and receive no invented expiration date.
- Individual purchase batches: importing more milk creates another item, rather than losing the old batch’s date.
- Manual item entry, purchase/cooking dates, opening dates and package dates.
- Separate display of package dates and estimated storage targets.
- Sorting, search, fridge/freezer/pantry filters and a use-soon view.
- Local notifications, configurable lead time and daily reminder time.
- Partial or complete food-use/waste records with undo and proportional value tracking.
- Local persistence and JSON backup export/import across phones.
- Duplicate receipt detection for the same normalized receipt text.
- An explicitly selected demo fridge and a sample receipt.

## Try the preview

1. Install the current **Node.js 22 LTS** from https://nodejs.org/ (22.13 or newer).
2. Extract this project to a normal folder.
3. On Windows, double-click **OpenPreview.bat**. It installs dependencies and opens the browser preview. On macOS or Linux, open a terminal in this folder and run:

```sh
npm ci
npm run web
```

The browser preview supports inventory, receipt-text parsing, sample receipts, dates, food-use history, backup export/import and persistence. Native photo OCR and phone notifications require an installed app. The app tells you this clearly in the preview.

Use **Try a demo fridge** on the empty fridge screen, or choose **Add food → Try a sample → Find groceries**. Demo data is not loaded automatically.

## Run on Android

If you downloaded **Fridgeful.apk** along with this source package, it is a standalone preview installer for **64-bit ARM Android phones** (Android 7 or newer). Open it on Android and allow installation from your download app when prompted. It does not need Expo Go or a running computer. It is signed with a development/testing key, so it is intended for testing rather than store distribution. Export your data before replacing it with a differently signed build, since Android may require uninstalling it first.

For local development, install Android Studio with an SDK and Java 17 JDK, connect an Android device with USB debugging, then run:

```sh
npm ci
npm run android
```

This generates the native Android project and installs a development build containing the OCR module. The supported minimum is Android 7 / API 24.

For a standalone APK using Expo’s cloud builder:

```sh
npm ci
npx eas-cli login
npx eas-cli build:configure
npm run build:android
```

Choose/create your own Expo project when prompted. EAS manages Android signing and returns an APK download link. Do not share signing keys or credentials. Cloud build availability and pricing are controlled by Expo.

The `preview` profile produces an APK; the `production` profile produces a Play Store AAB. This project is not published in Google Play.

## Run on iPhone

For an IPA, see **[IOS-IPA.md](IOS-IPA.md)**. The included GitHub Actions workflow compiles an unsigned iPhone IPA on a macOS runner; signing is required before installation. No iOS native build has been run yet.

On a Mac with Xcode installed:

```sh
npm ci
npx expo prebuild --platform ios
npx pod-install
```

Open `ios/Fridgeful.xcworkspace` in Xcode, select your signing team and connected iPhone, then run the app. Native iOS code requires Xcode/macOS. The minimum deployment target is iOS 15.1.

For an EAS internal iPhone build, sign in to your Expo account, configure the project, and use your Apple Developer account:

```sh
npx eas-cli login
npx eas-cli build:configure
npx eas-cli device:create
npm run build:ios
```

Register the phone before building. EAS will ask for the Apple signing credentials it needs. iOS internal builds only install on registered devices in the provisioning profile. Alternatively, create a production build for TestFlight and submit it through your own App Store Connect account.

This source package does not contain a signed iPhone IPA. It is not an App Store listing. A browser preview does not test native camera recognition or notification delivery.

## Receipt tips

Photograph the entire receipt flat, upright and in good light. Keep product names and prices legible. Recognition is intended for English/Latin-script supermarket receipts, with simple decimal prices. Some stores use uncommon abbreviations or layouts; review and edit the results.

The parser understands examples such as:

```text
GREEN MARKET
09/29/2026
MILK 4.19 F
2 x GREEK YOGURT 3.98
STRAWBERRIES
4.49
```

It handles simple price-on-next-line layouts, quantity lines such as `2 lb @ 1.00`, common tax flags and many non-food/payment lines. It does not promise correct results for every store, discounts, returns, OCR errors, weighed lines or bundled products. Correct quantities, per-item line totals and exclusions during review. It assumes MM/DD/YYYY for slash-formatted receipt dates; change the purchase date during review if necessary.

## How date targets work

- The printed package date is retained exactly as entered and labeled with its meaning.
- The storage estimate starts from the purchase date. For cooked leftovers, enter the cooking date as the purchase/cooking date.
- Some categories use a shorter after-opening planning window.
- The **earliest of the package date and storage estimate** becomes the planning target. A later package date does not override a shorter storage window.
- Changing the storage location preserves the original purchase date. It cannot certify that food was frozen promptly or thawed safely. Freezer estimates are quality targets.
- Foods without a suitable estimate need a manually entered date and specific product guidance.

The short end of official refrigerated ranges is used for raw poultry, ground meat, raw meat cuts, fin fish and cooked leftovers. Shell eggs use the FDA’s 3-week quality recommendation. Dairy, bread, fruit and vegetables use conservative **heuristics**, not an official product-level shelf-life database. Those estimates are identified in item details and can vary substantially by product and handling. Raw/cooked, deli meat, seafood, shell eggs, shelf-stable and after-opening distinctions matter. Infant formula receives no generic estimate; use its labeled use-by date.

**These are planning targets, not proof of safety or predictions of the actual day food spoils.** Storage temperature, handling, thawing, power outages, recalls and individual product instructions can matter before any date. Many U.S. product dates relate to quality rather than safety; label meanings differ by region and product. Check the in-app guidance links.

Official references:

- https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts
- https://www.fda.gov/food/buy-store-serve-safe-food/what-you-need-know-about-egg-safety
- https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/food-product-dating

## Reminders, data and prices

Reminders are requested only when you turn them on. The app schedules at most 30 grouped daily notifications, then refreshes the schedule when the app opens or inventory changes. Open the app occasionally to refresh the horizon. A passed target remains in the notification roundup for 7 days. Unknown dates are excluded. Phone settings and power management may affect delivery.

Groceries and activity are stored locally with AsyncStorage. Receipt photos are used transiently for recognition and are not copied into inventory. The app has no login, advertising, AI billing or backend sync. Export a backup before reinstalling or clearing app data. Backups contain purchase information in readable JSON; save and share them intentionally. Platform-managed phone backups and third-party SDK behavior remain governed by their own settings and policies.

Food-value totals use the price you enter for the current quantity; partial use is prorated. Items without prices add zero to monetary totals. These are food-value records, not measured savings caused by the app. Changing currency changes display only and does not perform foreign-exchange conversion. Use a single currency for a kitchen.

## Verify the project

```sh
npm ci
npm run check
npm test
npx expo export --platform all
```

The logic tests cover calendar dates/DST, label-vs-storage targets, opening windows, unrecognized foods, partial quantities/undo, invalid input, receipt filtering, category distinctions, backup validation and notification planning.

For the browser interaction checks, first start the web app, then run:

```sh
npx playwright install chromium
FRIDGEFUL_TEST_URL=http://localhost:8081 npm run test:ui
```

On Windows PowerShell, set `$env:FRIDGEFUL_TEST_URL = 'http://localhost:8081'` on a separate line before `npm run test:ui`. The test script uses a fresh browser profile and its own sample groceries. It checks receipt review/edit/import, usage/undo, persistence, duplicates and filters.

Native OCR, native notifications, camera/photo permission flows and iOS signing need device verification before a public release.

The `screenshots` folder contains the reviewed browser preview at 390 px and 320 px widths. The web-only emoji font is Noto Color Emoji, distributed by Fontsource under the included `assets/emoji-LICENSE.txt`; native apps use their platform emoji fonts.

## Project map

| File | Purpose |
| --- | --- |
| `App.tsx` | Fridge, scan, impact and settings screens |
| `src/model.ts` | Inventory, dates, quantities, state and backup validation |
| `src/receipt.ts` | Receipt parsing and category suggestions |
| `src/ItemEditor.tsx` | Manual entry and date editing |
| `src/reminderPlan.ts` | Grouped daily reminder planning |
| `src/reminders.native.ts` | Native notification scheduling |
| `src/backup.ts` | Backup import/export |
| `src/ui.tsx` | UI components and single-host sheet flow |
| `modules/fridgeful-ocr` | Native Apple Vision / Google ML Kit OCR |
| `app.json` | App name, icons, IDs and permission descriptions |
| `eas.json` | Development, preview and store build profiles |

Before publishing, use your own unique app IDs, verify real receipts and phone flows, and prepare store assets and privacy disclosures. No store publication or account creation was performed.
