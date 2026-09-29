#!/usr/bin/env bash
# Compiles on macOS/Xcode. Output must be signed before installation on iPhone.
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"

if [[ "$(uname -s)" != Darwin ]] || ! command -v xcodebuild >/dev/null; then
  echo 'This build requires a Mac with full Xcode installed.' >&2
  exit 1
fi

export CI=1
export EXPO_NO_TELEMETRY=1
export NODE_BINARY="$(command -v node)"
mkdir -p build
xcodebuild -version
npx expo prebuild --platform ios --no-install
(cd ios && pod install)

xcodebuild \
  -workspace ios/Fridgeful.xcworkspace \
  -scheme Fridgeful \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath build/ios \
  ARCHS=arm64 \
  ONLY_ACTIVE_ARCH=NO \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY='' \
  build 2>&1 | tee build/ios-build.log

app="$project_root/build/ios/Build/Products/Release-iphoneos/Fridgeful.app"
test -s "$app/Info.plist"
test -s "$app/main.jsbundle"
executable="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$app/Info.plist")"
test -s "$app/$executable"
bundle_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app/Info.plist")"
[[ "$bundle_id" == com.fridgeful.mobile ]]
xcrun lipo -verify_arch arm64 "$app/$executable"
xcrun vtool -show-build "$app/$executable" | tee build/ios-platform.txt
grep -Eq 'platform[[:space:]]+IOS[[:space:]]*$' build/ios-platform.txt

staging="$(mktemp -d "$project_root/build/ipa-payload.XXXXXX")"
trap 'rm -rf "$staging"' EXIT
mkdir "$staging/Payload"
ditto "$app" "$staging/Payload/Fridgeful.app"
ipa="$project_root/build/Fridgeful-unsigned.ipa"
rm -f "$ipa"
(cd "$staging" && zip -qry "$ipa" Payload)
unzip -tq "$ipa"
shasum -a 256 "$ipa" | tee build/Fridgeful-unsigned.ipa.sha256
echo "Created: $ipa"
echo 'Unsigned device build: sign it before installing. Not a TestFlight/App Store build.'
