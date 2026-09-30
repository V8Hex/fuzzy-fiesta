# Before It Goes privacy note

This first version has no account system, receipt-upload backend, advertising service or AI API integration.

- Receipt photos are processed locally by Apple Vision on iOS or Google ML Kit on Android. Before It Goes does not upload receipt photos or extracted receipt text to its own server.
- Grocery names, dates, quantities, prices, grocery-trip summaries, preferences and food-use records are saved locally on the device.
- Receipt images are not copied into the persistent inventory. The operating system and photo picker may retain camera or image-picker files according to their normal behavior.
- Camera access is requested when you choose to take a receipt photo. Notification access is requested when you enable reminders.
- Backup files contain grocery and purchase information as readable JSON. You choose where to save or share them.
- Uninstalling the app or clearing its storage removes local app data. Device-level backup behavior is controlled by your operating system.
- External food-guidance links open official websites under those sites’ own privacy policies. Dependencies and platform services have their own policies and telemetry behavior.

Before a public release, the publisher should review dependency behavior, platform backup settings, notification exposure on lock screens, and App Store / Google Play disclosure requirements, and provide their own contact information and published policy.
