import {useHasPasskey} from '@/hooks/useHasPasskey';
import Alert from './Alert';

export default function AlertPasskeyRequired() {
  const hasPasskey = useHasPasskey();
  if (hasPasskey) return null;

  return (
    <Alert
      icon="warning"
      content={
        <span>
          This site requires Passkeys. Please use a{' '}
          <a
            rel="noopener noreferrer"
            className="link link-primary"
            href="https://www.passkeys.io/compatible-devices">
            compatible device
          </a>{' '}
          to continue.
        </span>
      }
    />
  );
}
