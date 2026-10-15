# Jaguar Ascend: Android & iOS Apps

**Designed and created by Dr. Richard G. Clark.** Copyright © 2026. All rights reserved.

The hub ships in two ways:

## 1. Installable web app (works today on Android and iPhone)
Host the `tutoring-hub/` folder on any HTTPS site (Netlify, GitHub Pages, etc.).
- **Android (Chrome):** open the site → menu ⋮ → **Install app** / **Add to Home screen**.
- **iPhone/iPad (Safari):** open the site → Share ⬆ → **Add to Home Screen**.

It opens full-screen with the Jaguar icon and splash screen, and it works offline after the first visit.
To push an update, change `VERSION` in `tutoring-hub/sw.js`.

## 2. Native store apps (Google Play & Apple App Store)
This folder is a [Capacitor](https://capacitorjs.com) project that wraps the same web app.
- App ID: `com.drrichardclark.jaguarascend`
- Name: **Jaguar Ascend**
- Icons and launch screens for every device size are already generated in `android/` and `ios/`.

### One-time setup
```bash
cd tutoring-hub-app
npm install
```

### Every time the web app changes
```bash
npm run sync        # copies ../tutoring-hub into www/ and updates both native projects
```

### Android → Google Play
1. **Quick test APK (no computer setup):** every push to GitHub runs the
   **"Jaguar Ascend – Android build"** workflow. Open GitHub → Actions → the latest run → download
   `JaguarAscend-debug-apk`. Copy the APK to an Android phone to install it.
2. **Store release:** install [Android Studio](https://developer.android.com/studio), then run `npm run android`
   (it opens the project) → **Build → Generate Signed App Bundle** → upload the `.aab` to the
   [Google Play Console](https://play.google.com/console) ($25 one-time developer fee).

### iOS → Apple App Store
Apple requires a Mac with Xcode and an Apple Developer account ($99/year).
1. On the Mac: `npm install`, then `npm run ios` (opens Xcode).
2. In Xcode, select the **App** target → **Signing & Capabilities** → choose your team.
3. **Product → Archive → Distribute App → App Store Connect**, then submit in
   [App Store Connect](https://appstoreconnect.apple.com).

### Store listing checklist
- App name: Jaguar Ascend: Grade 9 Tutor
- Category: Education. Age rating: 4+ / Everyone.
- Privacy: no accounts and no data collection. All progress stays on the device (state this in both stores' privacy forms).
- Screenshots: dashboard, Coach J walkthrough, lesson, test, report card.
- Copyright line: © 2026 Dr. Richard G. Clark. All rights reserved.
- Before a commercial release, replace or generalize the DeSoto Central school references (name, mascot, colors,
  staff) unless you have the school's permission. Store reviewers reject apps that appear to represent
  an organization without authorization.
