'use client';

import {useEffect, useState} from 'react';

import AlertPasskeyRequired from '@/components/alerts/AlertPasskeyRequired';
import HeroCardLogin from '@/components/hero-cards/Login';
import HeroCardRegister from '@/components/hero-cards/Register';

export default function Home() {
  const [registering, setRegistering] = useState(false);

  // TODO: Use the router to scroll the login and register cards into view.
  // !HACK: Coordinating the disabled state of the input field to prevent autofill from scrolling it into view.

  useEffect(() => {
    const listener = (event: HashChangeEvent) => {
      const url = new URL(event.newURL);
      if (url.pathname === '/') {
        switch (url.hash) {
          case '#login':
            document.getElementById('login')?.scrollIntoView();
            break;
          case '#register':
            document.getElementById('register')?.scrollIntoView();
            break;
          default:
            document.getElementById('login')?.scrollIntoView();
        }
      }
    };
    window.addEventListener('hashchange', listener);
    return () => {
      window.removeEventListener('hashchange', listener);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setRegistering(entry.target.id === 'register');
            observer.disconnect();
          }
        });
      },
      {
        root: document.getElementById('carousel'),
        rootMargin: '0px',
        threshold: 0.1,
      },
    );
    observer.observe(document.getElementById('register')!);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div data-theme="dark" className="flex flex-col h-screen justify-between">
      <header>
        <AlertPasskeyRequired />
        <div className="hero min-h-screen bg-base-200 hero-gradient text-slate-50">
          <div id="carousel" className="carousel flex-row">
            <HeroCardLogin
              id="login"
              title="Dice Caster"
              tagline="Naturally critical dice as a service."
            />
            <HeroCardRegister
              id="register"
              title="Dice Caster"
              tagline="What should we call you?"
              disabled={!registering}
            />
          </div>
        </div>
      </header>
      <main></main>
      {/* <Footer /> */}
    </div>
  );
}
