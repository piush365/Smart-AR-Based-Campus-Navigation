import admin from 'firebase-admin';

if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS env var
    admin.initializeApp();
  }
}

export const firestore = admin.firestore();
export const firebaseAuth = admin.auth();
