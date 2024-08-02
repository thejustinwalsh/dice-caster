import React, {useEffect, useRef} from 'react';
import {startRegistration} from '@simplewebauthn/browser';

import Button from '@/components/buttons/Button';
import {useAsyncCallback} from '@/hooks/useAsyncCallback';
import HeroCard, {type HeroCardProps} from './HeroCard';

export type RegisterProps = Omit<HeroCardProps, 'children'> & {
  disabled?: boolean;
};

export default function Register({id, title, tagline, disabled}: RegisterProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  const [loading, handleRegister] = useAsyncCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      console.log(e.currentTarget.user);
      const user: string = e.currentTarget.user?.value ?? '';
      try {
        const get = await fetch(`/api/auth/register?user=${user}`, {method: 'GET'});
        const data = await get.json();
        const assertion = await startRegistration(data);
        const post = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(assertion),
        });
        if (!post.ok) throw new Error('Not OK');
        console.log('Registration successful');
      } catch (error) {
        console.error('Registration error', error);
      }
    },
    [],
  );

  return (
    <HeroCard id={id} title={title} tagline={tagline}>
      <form className="flex flex-col flex-grow gap-1" onSubmit={handleRegister}>
        <fieldset className="flex flex-col flex-grow gap-1" disabled={disabled || loading}>
          <input
            ref={ref}
            name="user"
            type="text"
            className="input input-bordered"
            placeholder="Account Name"
            required
            minLength={3}
            maxLength={64}
          />
          <Button type="submit">Register</Button>
        </fieldset>
      </form>
    </HeroCard>
  );
}
