import {startAuthentication} from '@simplewebauthn/browser';

import Button from '@/components/buttons/Button';
import Link from '@/components/buttons/Link';
import {useAsyncCallback} from '@/hooks/useAsyncCallback';
import HeroCard, {type HeroCardProps} from './HeroCard';

export default function Login({id, title, tagline}: Omit<HeroCardProps, 'children'>) {
  const [loading, handleAuthentication] = useAsyncCallback(async () => {
    try {
      const get = await fetch(`/api/auth/authenticate`, {method: 'GET'});
      const data = await get.json();
      const assertion = await startAuthentication(data);
      const post = await fetch('/api/auth/authenticate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(assertion),
      });
      if (!post.ok) throw new Error('Not OK');
      console.log('Authentication successful');
    } catch (error) {
      console.error('Authentication error', error);
    }
    console.log('Authentication complete');
  }, []);

  return (
    <HeroCard id={id} title={title} tagline={tagline}>
      <Link href="#register">Sign Up</Link>
      <Button onClick={handleAuthentication}>Login</Button>
    </HeroCard>
  );
}
