import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';

export default function RootIndex() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Populate SecureStore with dev user data if the dev toggle is enabled,
    // but DO NOT redirect to /home automatically on reload. We want reloads to
    // always show the login screen so you can edit it and use the dev controls there.
    (async () => {
      try {
        if (__DEV__) {
          const val = await SecureStore.getItemAsync('DEV_AUTO_LOGIN');
          const shouldAuto = val === 'true';
          if (shouldAuto) {
            await SecureStore.setItemAsync('userId', 'dev-user-1');
            await SecureStore.setItemAsync('userToken', 'dev-token');
            await SecureStore.setItemAsync(
              'user',
              JSON.stringify({ id: 'dev-user-1', name: 'Dev User', email: 'dev@example.com' })
            );
          }
        }
      } catch (e) {
        console.warn('Dev setup failed', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) return null;

  // Always go to the login screen on cold reload so you can edit it and use the dev buttons.
  return <Redirect href="/login" />;
}
