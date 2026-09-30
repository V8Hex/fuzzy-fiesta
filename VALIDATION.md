# Validation

This first version was checked with:

- TypeScript strict type checking: passed.
- Thirteen behavior tests for dates, quantities, receipt parsing, backups and reminder planning: passed. Incomplete date input is covered so typing in the editor cannot crash a live estimate.
- Browser interaction checks at a 390 × 844 phone viewport: passed. Receipt review/edit/import, partial/full use, undo, totals, persistence after reload, storage filters, search and duplicate receipt detection were verified without page errors.
- Visual inspection of fridge, receipt and impact screens, including a 320 × 700 small-phone viewport: passed after fixing a crowded hero label.
- Expo iOS, Android and web JavaScript/Hermes bundle export: passed.
- Native Android ARM64 release APK assembly: passed. Includes the native ML Kit receipt-recognition module.
- Native iOS arm64 Release compilation and unsigned IPA packaging on GitHub's macOS runner: passed on September 29, 2026. The downloaded IPA was independently checked for archive integrity, the iPhone platform, Before It Goes display name, bundled JavaScript, bundle ID and native receipt scanner.
- Android resource verification: passed. A config plugin repairs empty splash outputs if an image conversion fails during prebuild and preserves complete linked resources in the release APK.

The Android preview uses a testing signing key. It is not a Google Play release. The iPhone IPA is unsigned and must be signed and provisioned before installation. Native camera/OCR quality and local notification delivery have not been tested on a physical phone. The successful iOS build is available at https://github.com/V8Hex/fuzzy-fiesta/actions/runs/36650280103. Review these device flows before public release.
