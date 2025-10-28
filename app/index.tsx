import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';

export default function RootIndex() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // No dev-only behavior here — simply mark ready so we redirect to login.
    setReady(true);
  }, []);

  if (!ready) return null;

  return <Redirect href="/login" />;
}
