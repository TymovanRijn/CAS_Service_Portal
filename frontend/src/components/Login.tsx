import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await login(email, password);

    if (!result.success) {
      setError(result.message);
    }

    setIsLoading(false);
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[hsl(215_28%_97%)] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.75rem,env(safe-area-inset-top))]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(60vh,28rem)] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgb(148_163_184_/_0.35),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] max-w-md flex-col justify-center py-8">
        <div className="mx-auto mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-900/25 ring-4 ring-white/80">
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">CAS Service Portal</h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
            Security Asset Coordination · Schiphol
          </p>
        </div>

        <Card className="border-white/70 bg-white/95 shadow-card-hover ring-1 ring-slate-900/[0.06] backdrop-blur-md supports-[backdrop-filter]:bg-white/88">
          <CardHeader className="space-y-2 pb-2 text-center sm:text-left">
            <CardTitle className="text-xl font-semibold text-slate-900">Inloggen</CardTitle>
            <CardDescription className="text-slate-600">
              Gebruik je organisatie-account om incidenten en acties te beheren.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <form onSubmit={handleLogin} className="space-y-5">
              {error ? (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200/90 bg-red-50/95 px-3 py-2.5 text-sm text-red-900"
                >
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-800">
                  E-mailadres
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="naam@organisatie.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-800">
                  Wachtwoord
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <Button type="submit" variant="primary" className="h-11 w-full text-[0.9375rem] shadow-sm" disabled={isLoading}>
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Bezig met inloggen…
                  </span>
                ) : (
                  'Inloggen'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-10 text-center text-xs leading-relaxed text-slate-500">
          Officieel SAC-hulpmiddel. Geen toegang? Neem contact op met je applicatiebeheerder.
          {process.env.REACT_APP_BUILD_NUMBER ? (
            <>
              {' '}
              <span className="tabular-nums text-slate-400" title={process.env.REACT_APP_BUILD_NUMBER}>
                Build {process.env.REACT_APP_BUILD_NUMBER}
              </span>
            </>
          ) : (
            <>
              {' '}
              <span className="text-slate-400">(ontwikkelomgeving)</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
};
