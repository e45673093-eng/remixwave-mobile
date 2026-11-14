# RemixWave Mobile

A working, touch-friendly audio effects studio built with plain web technologies and packaged for Android/iOS with Capacitor. Choose an audio file on your device, then play it with Original, Bass Boost, Slow Motion, Dream Echo, or Lo-fi processing.

## Run it in a browser

Requires Node.js 18 or newer.

```sh
npm install
npm run build
```

Serve the `www/` directory from an HTTPS host to install it as a PWA. (Service workers do not work from a `file://` URL.)

## Android phone (Android Studio)

Install Android Studio and the Android SDK, then:

```sh
npm install
npx cap add android
npm run cap:sync
npx cap open android
```

In Android Studio, enable USB debugging on your phone, connect it, choose it as the run target, and press **Run**. To build a debug APK from a machine with the Android SDK installed:

```sh
npm run android:debug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

## iPhone / iPad (requires macOS and Xcode)

```sh
npm install
npx cap add ios
npm run cap:sync
npx cap open ios
```

In Xcode, select your Apple development team under **Signing & Capabilities**, connect the device, choose it as the run target, and press **Run**. A free Apple ID can be used for personal device testing; provisioning and signing are managed by Xcode.

## Build and update workflow

The native `android/` and `ios/` projects are generated locally by Capacitor (`npx cap add ...`) and are intentionally not checked in. Once generated, update the bundled web app after changes with:

```sh
npm run cap:sync
```

Run `npx cap add android` or `npx cap add ios` only once per platform in a working copy. These commands create the native project files; `cap sync` copies the app from `www/` and installs native dependencies.

## What the app currently does

- Loads audio files selected through the phone's system file picker; audio is decoded and processed locally in the WebView.
- Plays, pauses, seeks, adjusts output volume, and applies five real-time Web Audio presets.
- Includes a small offline PWA shell cache. The user's audio files are not uploaded or cached.

The app does not currently record microphone audio, export a remixed audio file, or guarantee background playback after the app is suspended. Those features need additional native implementation and device testing.

## Troubleshooting

- If Android cannot find `./gradlew`, open the generated `android/` project with Android Studio once, or regenerate it with `npx cap add android`.
- iOS builds require macOS, Xcode, and a valid signing team. Windows/Linux cannot build an iOS app.
- Audio decode support depends on the phone OS/WebView and source file codec. If a format fails, try a standard MP3 or WAV file.
- Capacitor 6 is used in this starter. If using a newer Capacitor major, upgrade all Capacitor packages together and follow its migration guide.
