# NUANG mobile foundation

This directory is the local-asset Capacitor foundation for `app.nuang.mobile`.

- Production must not add `server.url` to `capacitor.config.json`.
- The current screen is an internal native-bridge harness, not the App Store product UI.
- Store submission remains blocked until the complete P0 NUANG journey is migrated and the release checklist in `docs/NUANG_IOS_ANDROID_STORE_RELEASE_PLAN_2026-08-11.md` passes.
- Sign in with Apple and associated-domain capabilities are attached to the iOS target; live credentials remain an account-owner release gate.
- Android App Links remain fail-closed until the Play App Signing SHA-256 fingerprint is configured.

Completed security foundation:

- Supabase OAuth uses PKCE and the exact `https://nuang.app/mobile/auth/callback` return URL.
- Sessions are stored only in iOS Keychain (`whenUnlockedThisDeviceOnly`) or Android Keystore-backed storage.
- iCloud synchronization is disabled, and a stale iOS Keychain session is cleared on the first launch after reinstall.
- OAuth intents expire after ten minutes and each callback can be exchanged only once for an app-initiated request.

## Commands

```bash
npm --prefix mobile install
npm run mobile:submission:check
npm run mobile:sync:configured
```

`mobile:sync:configured` is for development and native QA. Do not produce a
store candidate with raw `npm --prefix mobile run sync` or `npx cap sync`,
because those commands do not run the root public-credential validator.

The release sequence is intentionally split so a candidate can be built before
its signed artifacts exist:

```bash
npm run mobile:release:preflight
npm run mobile:release:prepare
# Archive and sign the iOS IPA and Android AAB, then capture QA evidence.
npm run mobile:release:check
```

The final check verifies release evidence, artifact hashes, native signatures,
real-device QA, and store screenshots. It must pass immediately before upload.

The canonical app icon and character assets live in the parent web project. Native and Google Play listing assets are generated with `npm run mobile:assets` from the parent project and checked with `npm run mobile:store-assets:check`.
