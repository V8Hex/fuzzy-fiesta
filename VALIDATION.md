# Validation

This first version was checked with:

- TypeScript strict type checking: passed.
- Thirteen behavior tests for dates, quantities, receipt parsing, backups and reminder planning: passed. Incomplete date input is covered so typing in the editor cannot crash a live estimate.
- Browser interaction checks at a 390 × 844 phone viewport: passed. Receipt review/edit/import, partial/full use, undo, totals, persistence after reload, storage filters, search and duplicate receipt detection were verified without page errors.
- Visual inspection of fridge, receipt and impact screens, including a 320 × 700 small-phone viewport: passed after fixing a crowded hero label.
- Expo iOS, Android and web JavaScript/Hermes bundle export: passed.
- Native Android ARM64 release APK assembly: passed. Includes the native ML Kit receipt-recognition module.
- Android resource verification: passed. A config plugin repairs empty splash outputs if an image conversion fails during prebuild and preserves complete linked resources in the release APK.

The Android preview uses a testing signing key. It is not a Google Play release. Native camera/OCR quality and local notification delivery have not been tested on a physical phone. No iOS native binary was compiled or signed in this Linux environment; the Swift OCR module and iOS build configuration are included for Xcode/EAS builds. A GitHub Actions macOS workflow and unsigned-IPA build script are included, but have not been executed on macOS. Review these device flows before public release.
