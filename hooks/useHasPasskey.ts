import {useEffect, useState} from 'react';
import {platformAuthenticatorIsAvailable} from '@simplewebauthn/browser';

export function useHasPasskey() {
  const [hasPasskey, setHasPasskey] = useState(true);

  useEffect(() => {
    (async () => {
      const isAvailable = await platformAuthenticatorIsAvailable();
      setHasPasskey(isAvailable);
    })();
  }, []);

  return hasPasskey;
}
