# Build the iPhone IPA

An unsigned iPhone IPA was successfully compiled and packaged on September 29, 2026. Download it from the [successful GitHub build](https://github.com/V8Hex/fuzzy-fiesta/actions/runs/36642917505). The workflow checks the arm64 executable, iPhone platform, bundled JavaScript and ZIP integrity before publishing `Fridgeful-unsigned.ipa`. Signing is required before installation.

## GitHub build

1. Create a GitHub repository and put the **contents** of the `Fridgeful` folder at the repository root. `package.json`, `scripts` and `.github` must be at the root, not inside another `Fridgeful` folder. Include the `.github` directory from this ZIP.
2. Enable GitHub Actions for the repository. Ensure your account has macOS runner capacity available.
3. Open **Actions → Build unsigned iPhone IPA → Run workflow**. A push to `main` also starts a build.
4. When the build succeeds, download **Fridgeful-unsigned-IPA** from that run's artifacts. Extract that artifact ZIP to get **Fridgeful-unsigned.ipa**.

No Expo account, Apple certificate or developer account is required for this unsigned compilation. The workflow runs on `macos-15` with Xcode 16.4 and Node 22, installs native dependencies, and compiles the receipt-recognition module into a Release iPhone app.

The resulting IPA **cannot install directly while unsigned**. It must be signed and provisioned using an appropriate Apple account and installation method. Do not rename the source ZIP to `.ipa`; that does not create an app.

## Local Mac build

Install Xcode and CocoaPods, then run from the source folder:

```sh
npm ci
bash scripts/build-ios-unsigned.sh
```

The output is `build/Fridgeful-unsigned.ipa`. A failed native compilation produces no new IPA.

## Signed build for registered iPhones

Expo EAS is the configured alternative for a signed internal IPA. Sign in to your own Expo account and use an Apple Developer account with the required signing permissions:

```sh
npx eas-cli login
npx eas-cli build:configure
npx eas-cli device:create
npm run build:ios
```

EAS returns the signed IPA and install link when the build completes. Internal builds install only on iPhones included in the provisioning profile. Sign-in and signing secrets should be entered directly through the official service; do not put them in chat or commit them to the repository.

For TestFlight, use the production profile and submit the completed signed build to your own App Store Connect account. The unsigned workflow does not publish an App Store listing or a TestFlight release.
