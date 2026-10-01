let messagingClient;
let initializationAttempted = false;

function getServiceAccount() {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawServiceAccount) return JSON.parse(rawServiceAccount);

  const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (credentialPath) {
    // Keep the service account outside the repository. This is useful for local
    // development; production should prefer its platform's encrypted secret store.
    const fs = require('fs');
    return JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
  }

  return null;
}

function getMessaging() {
  if (initializationAttempted) return messagingClient;
  initializationAttempted = true;

  try {
    const serviceAccount = getServiceAccount();
    if (!serviceAccount) {
      console.warn('[FCM] Push is disabled: configure FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH.');
      return null;
    }
    const { initializeApp, cert, getApps } = require('firebase-admin/app');
    const { getMessaging } = require('firebase-admin/messaging');
    const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount) });
    messagingClient = getMessaging(app);
    return messagingClient;
  } catch (error) {
    console.error('[FCM] Push initialization failed:', error.message);
    return null;
  }
}

exports.sendToTokens = async ({ tokens, title, message, data = {} }) => {
  const uniqueTokens = [...new Set((tokens || []).filter(Boolean))];
  const messaging = getMessaging();
  if (!messaging || !uniqueTokens.length) return { sent: 0, invalidTokens: [] };

  const response = await messaging.sendEachForMulticast({
    tokens: uniqueTokens.slice(0, 500),
    notification: { title, body: message },
    data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value ?? '')])),
    android: { priority: 'high', notification: { channelId: 'arke_academic_updates', sound: 'default' } },
    apns: { payload: { aps: { sound: 'default', contentAvailable: true } } }
  });

  const invalidTokens = response.responses
    .map((result, index) => result.success ? null : uniqueTokens[index])
    .filter(Boolean);
  return { sent: response.successCount, invalidTokens };
};
