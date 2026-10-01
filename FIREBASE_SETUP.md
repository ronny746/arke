# Firebase mobile delivery setup

The code supports FCM, Analytics, Crashlytics and persistent notification inboxes. It deliberately starts safely with push disabled until the production credentials below are supplied.

## Firebase console

1. Create/select the ARKE Firebase project and enable Google Analytics, Cloud Messaging and Crashlytics.
2. Register Android application ID `com.arkescholars.app`; download `google-services.json` into `/Users/rohitrana/WORK/lms-1/android/app/google-services.json`.
3. Register iOS bundle ID `com.arkescholars.app`; download `GoogleService-Info.plist` into `/Users/rohitrana/WORK/lms-1/ios/Runner/GoogleService-Info.plist` and add it to the Runner target in Xcode.
4. In Firebase Project settings → Cloud Messaging, upload an Apple APNs authentication key. In Xcode enable **Push Notifications** and **Background Modes → Remote notifications** for Runner.
5. Firebase Project settings → Service accounts → Generate new private key. Store its complete JSON only in the deployment secret store as `FIREBASE_SERVICE_ACCOUNT_JSON`; never commit it to Git or paste it into the app.

## FlutterFire finish step

From `/Users/rohitrana/WORK/lms-1`, run after the Android/iOS apps are registered:

```bash
dart pub global activate flutterfire_cli
flutterfire configure --project YOUR_FIREBASE_PROJECT_ID --platforms android,ios
```

This generates `lib/firebase_options.dart` and installs the required native Google Services and Crashlytics Gradle wiring. It must be done with the owner’s Firebase login because it changes the linked cloud project.

## Deployment environment

Set this server environment variable on the live API, preserving newlines inside the JSON value exactly:

```text
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

For local development only, the API can instead read a private, non-repository file:

```text
FIREBASE_SERVICE_ACCOUNT_PATH=/absolute/path/to/firebase-service-account.json
```

Restart the API after changing it. The server logs `[FCM] Push is disabled` until the variable is present.

## Acceptance test

1. Install a fresh Android/iOS build and sign in as a student or parent.
2. Confirm notification permission and verify a `PushDevice` document is created by `POST /api/v1/notifications/devices`.
3. From Admin → Announcements, send to that student or its batch.
4. Verify: visible foreground banner, background/locked-screen push, and one inbox notification.
5. Trigger a controlled non-fatal error and verify Crashlytics; verify anonymous `login` and `course_purchase_*` events in Analytics DebugView.
