
import { useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  Check,
  Cpu,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Palette,
  User,
  X,
} from 'lucide-react';
import { useTheme } from '../context/useTheme';

type AuthMode = 'login' | 'signup';

export function AuthPage() {
  const { theme, setTheme, themeNames } = useTheme();
  const { signIn, signUp, resetPassword } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [remember, setRemember] = useState(false);
  const [terms, setTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<
    'success' | 'error' | 'info'
  >('info');

  const [touched, setTouched] = useState(false);

  // Password strength validation
  const strength = useMemo(() => {
    const checks = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[^A-Za-z0-9]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;

    return {
      checks,
      score,
      label: ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][score],
    };
  }, [password]);

  // Switch between login and signup
  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrors({});
    setMessage('');
    setMessageType('info');
    setTouched(false);
    setPassword('');
    setConfirmPassword('');
  }

  // Handle login and signup
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setTouched(true);
    setMessage('');

    const nextErrors: Record<string, string> = {};

    if (mode === 'signup' && !name.trim()) {
      nextErrors.name = 'Please enter your full name.';
    }

    if (!email.trim()) {
      nextErrors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Please enter your password.';
    } else if (mode === 'signup' && strength.score < 5) {
      nextErrors.password =
        'Please meet all five password requirements.';
    }

    if (mode === 'signup' && password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (mode === 'signup' && !terms) {
      nextErrors.terms = 'Please accept the terms to continue.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (mode === 'signup') {
        const result = await signUp(
          name.trim(),
          normalizedEmail,
          password,
        );

        if (result.error) {
          setMessage(result.error);
          setMessageType('error');
          return;
        }

        // Successful signup: return to login.
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setTerms(false);
        setErrors({});
        setTouched(false);

        setMessage(
          result.needsEmailConfirmation
            ? 'Account created successfully! Please check your Gmail inbox and confirm your email address. After confirmation, log in using your email and password.'
            : 'Account created successfully! You can now log in using your email and password.',
        );

        setMessageType('success');
      } else {
        const result = await signIn(normalizedEmail, password);

        if (result.error) {
          setMessage(result.error);
          setMessageType('error');
          return;
        }

        setMessage('Signed in successfully!');
        setMessageType('success');

        // AuthContext updates the session.
        // App.tsx should automatically display the dashboard.
      }
    } catch (error) {
      console.error('Authentication error:', error);

      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      );

      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle forgot password
  async function handleForgotPassword() {
    if (submitting) return;

    setMessage('');

    if (
      !email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      setTouched(true);

      setErrors((current) => ({
        ...current,
        email: 'Enter a valid email address first.',
      }));

      return;
    }

    setSubmitting(true);

    try {
      const result = await resetPassword(
        email.trim().toLowerCase(),
      );

      if (result.error) {
        setMessage(result.error);
        setMessageType('error');
      } else {
        setMessage(
          'If an account exists for this email, a password reset link has been sent. Please check your inbox.',
        );
        setMessageType('success');
      }
    } catch (error) {
      console.error('Password reset error:', error);

      setMessage('Unable to send reset email. Please try again.');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] py-3 pl-11 pr-4 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-subtle)] outline-none transition focus:border-[var(--color-accent-primary)] focus:ring-2 focus:ring-[var(--color-accent-glow)]';

  const labelClass =
    'mb-2 block text-sm font-medium text-[var(--color-text-main)]';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)] px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-2xl lg:grid-cols-2">

        {/* Left branding section */}
        <section className="relative hidden min-h-[650px] flex-col justify-between overflow-hidden bg-[var(--color-bg-surface-elevated)] p-10 lg:flex">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-20 blur-3xl"
            style={{ background: 'var(--color-accent-primary)' }}
          />

          <div
            className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full opacity-10 blur-3xl"
            style={{ background: 'var(--color-accent-secondary)' }}
          />

          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-accent-primary)] text-[var(--color-accent-contrast)]">
              <Cpu size={24} />
            </span>

            <span className="text-2xl font-extrabold tracking-tight text-[var(--color-text-main)]">
              Memory
              <span className="text-[var(--color-accent-primary)]">
                Flow
              </span>
            </span>
          </div>

          <div className="relative">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-accent-tertiary)]" />
              Interactive OS Learning Studio
            </div>

            <h2 className="text-4xl font-bold leading-tight text-[var(--color-text-main)]">
              Understand memory.
              <span className="block text-[var(--color-accent-primary)]">
                Visualize everything.
              </span>
            </h2>

            <p className="mt-5 max-w-md text-base leading-7 text-[var(--color-text-muted)]">
              Explore operating system memory management through interactive
              simulations, visual explanations, and hands-on learning.
            </p>

            <div className="mt-9 grid grid-cols-2 gap-3">
              {[
                'Paging Lab',
                'Segmentation',
                'Virtual Memory',
                'Page Replacement',
                'Dynamic Allocation',
                'Learning Analytics',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)]/70 px-4 py-3 text-sm text-[var(--color-text-muted)]"
                >
                  <span className="mr-2 text-[var(--color-accent-primary)]">
                    ✦
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-xs text-[var(--color-text-subtle)]">
            Learn. Experiment. Master memory management.
          </p>
        </section>

        {/* Right authentication section */}
        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-md">

            {/* Header and theme selector */}
            <div className="mb-9 flex items-center justify-between">
              <div className="flex items-center gap-2 lg:hidden">
                <Cpu
                  className="text-[var(--color-accent-primary)]"
                  size={25}
                />

                <span className="text-xl font-extrabold text-[var(--color-text-main)]">
                  Memory
                  <span className="text-[var(--color-accent-primary)]">
                    Flow
                  </span>
                </span>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Palette
                  size={16}
                  className="text-[var(--color-text-muted)]"
                />

                <label className="sr-only" htmlFor="auth-theme">
                  Choose theme
                </label>

                <select
                  id="auth-theme"
                  value={theme}
                  onChange={(event) =>
                    setTheme(event.target.value as typeof theme)
                  }
                  className="rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] px-2 py-1.5 text-xs text-[var(--color-text-main)]"
                >
                  {themeNames.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Login / Signup tabs */}
            <div className="mb-7">
              <div className="mb-3 inline-flex rounded-xl bg-[var(--color-bg-surface-elevated)] p-1">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  aria-pressed={mode === 'login'}
                  className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
                    mode === 'login'
                      ? 'bg-[var(--color-accent-primary)] text-[var(--color-accent-contrast)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  Log in
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  aria-pressed={mode === 'signup'}
                  className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
                    mode === 'signup'
                      ? 'bg-[var(--color-accent-primary)] text-[var(--color-accent-contrast)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  Sign up
                </button>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-main)]">
                {mode === 'login'
                  ? 'Welcome back'
                  : 'Create your account'}
              </h1>

              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                {mode === 'login'
                  ? 'Continue your journey through the world of memory management.'
                  : 'Join MemoryFlow and explore operating system concepts.'}
              </p>
            </div>

            {/* Authentication form */}
            <form
              onSubmit={handleSubmit}
              noValidate
              className="space-y-4"
            >

              {/* Full name */}
              {mode === 'signup' && (
                <div>
                  <label className={labelClass} htmlFor="auth-name">
                    Full name
                  </label>

                  <div className="relative">
                    <User
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
                      size={18}
                    />

                    <input
                      id="auth-name"
                      className={inputClass}
                      placeholder="Your full name"
                      autoComplete="name"
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      aria-invalid={Boolean(touched && errors.name)}
                      aria-describedby={
                        touched && errors.name ? 'name-error' : undefined
                      }
                    />
                  </div>

                  {touched && errors.name && (
                    <p
                      id="name-error"
                      role="alert"
                      className="mt-1 text-xs text-[var(--color-status-danger)]"
                    >
                      {errors.name}
                    </p>
                  )}
                </div>
              )}

              {/* Email */}
              <div>
                <label className={labelClass} htmlFor="auth-email">
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
                    size={18}
                  />

                  <input
                    id="auth-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className={inputClass}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    aria-invalid={Boolean(touched && errors.email)}
                    aria-describedby={
                      touched && errors.email ? 'email-error' : undefined
                    }
                  />
                </div>

                {touched && errors.email && (
                  <p
                    id="email-error"
                    role="alert"
                    className="mt-1 text-xs text-[var(--color-status-danger)]"
                  >
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className={labelClass} htmlFor="auth-password">
                  Password
                </label>

                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
                    size={18}
                  />

                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={
                      mode === 'login'
                        ? 'current-password'
                        : 'new-password'
                    }
                    className={`${inputClass} pr-12`}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    aria-invalid={Boolean(touched && errors.password)}
                    aria-describedby={
                      touched && errors.password
                        ? 'password-error'
                        : undefined
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                  >
                    {showPassword
                      ? <EyeOff size={18} />
                      : <Eye size={18} />}
                  </button>
                </div>

                {touched && errors.password && (
                  <p
                    id="password-error"
                    role="alert"
                    className="mt-1 text-xs text-[var(--color-status-danger)]"
                  >
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Password strength */}
              {mode === 'signup' && password.length > 0 && (
                <div
                  className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface-elevated)] p-3"
                  aria-live="polite"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">
                      Password strength
                    </span>

                    <span className="font-semibold text-[var(--color-text-main)]">
                      {strength.label}
                    </span>
                  </div>

                  <div
                    className="mt-2 flex gap-1.5"
                    role="progressbar"
                    aria-label="Password strength"
                    aria-valuemin={0}
                    aria-valuemax={5}
                    aria-valuenow={strength.score}
                  >
                    {[1, 2, 3, 4, 5].map((level) => (
                      <span
                        key={level}
                        className="h-1.5 flex-1 rounded-full"
                        style={{
                          background:
                            level <= strength.score
                              ? 'var(--color-accent-primary)'
                              : 'var(--color-border-medium)',
                        }}
                      />
                    ))}
                  </div>

                  <ul className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--color-text-muted)]">
                    {[
                      ['length', 'At least 8 characters'],
                      ['upper', 'Uppercase letter'],
                      ['lower', 'Lowercase letter'],
                      ['number', 'A number'],
                      ['symbol', 'A symbol'],
                    ].map(([key, label]) => {
                      const passed =
                        strength.checks[
                          key as keyof typeof strength.checks
                        ];

                      return (
                        <li
                          key={key}
                          className="flex items-center gap-1.5"
                        >
                          {passed ? (
                            <Check
                              size={13}
                              className="text-[var(--color-status-success)]"
                            />
                          ) : (
                            <X
                              size={13}
                              className="text-[var(--color-text-subtle)]"
                            />
                          )}

                          {label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Confirm password */}
              {mode === 'signup' && (
                <div>
                  <label className={labelClass} htmlFor="auth-confirm">
                    Confirm password
                  </label>

                  <div className="relative">
                    <Lock
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
                      size={18}
                    />

                    <input
                      id="auth-confirm"
                      type={
                        showConfirmPassword ? 'text' : 'password'
                      }
                      autoComplete="new-password"
                      className={`${inputClass} pr-12`}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      aria-invalid={Boolean(
                        touched && errors.confirmPassword,
                      )}
                      aria-describedby={
                        touched && errors.confirmPassword
                          ? 'confirm-error'
                          : undefined
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((value) => !value)
                      }
                      aria-label={
                        showConfirmPassword
                          ? 'Hide confirm password'
                          : 'Show confirm password'
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                    >
                      {showConfirmPassword
                        ? <EyeOff size={18} />
                        : <Eye size={18} />}
                    </button>
                  </div>

                  {touched && errors.confirmPassword && (
                    <p
                      id="confirm-error"
                      role="alert"
                      className="mt-1 text-xs text-[var(--color-status-danger)]"
                    >
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              {/* Login options */}
              {mode === 'login' ? (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-muted)]">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) =>
                        setRemember(event.target.checked)
                      }
                      className="h-4 w-4 accent-[var(--color-accent-primary)]"
                    />

                    Remember me
                  </label>

                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={submitting}
                    className="text-sm font-medium text-[var(--color-accent-primary)] hover:underline disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                </div>
              ) : (
                /* Signup terms */
                <div>
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-5 text-[var(--color-text-muted)]">
                    <input
                      type="checkbox"
                      checked={terms}
                      onChange={(event) =>
                        setTerms(event.target.checked)
                      }
                      aria-invalid={Boolean(touched && errors.terms)}
                      className="mt-1 h-4 w-4 accent-[var(--color-accent-primary)]"
                    />

                    <span>
                      I agree to the{' '}
                      <span className="font-semibold text-[var(--color-accent-primary)]">
                        Terms of Service
                      </span>{' '}
                      and{' '}
                      <span className="font-semibold text-[var(--color-accent-primary)]">
                        Privacy Policy
                      </span>
                      .
                    </span>
                  </label>

                  {touched && errors.terms && (
                    <p
                      role="alert"
                      className="mt-1 text-xs text-[var(--color-status-danger)]"
                    >
                      {errors.terms}
                    </p>
                  )}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-4 text-sm font-bold text-[var(--color-accent-contrast)] shadow-lg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? 'Please wait...'
                  : mode === 'login'
                    ? 'Log in'
                    : 'Create account'}

                <ArrowRight size={18} aria-hidden="true" />
              </button>

              {/* Feedback message */}
              {message && (
                <p
                  role="status"
                  aria-live="polite"
                  className={`rounded-xl border p-3 text-sm leading-6 ${
                    messageType === 'success'
                      ? 'border-[var(--color-status-success)] text-[var(--color-status-success)]'
                      : messageType === 'error'
                        ? 'border-[var(--color-status-danger)] text-[var(--color-status-danger)]'
                        : 'border-[var(--color-border-medium)] text-[var(--color-text-muted)]'
                  } bg-[var(--color-bg-surface-elevated)]`}
                >
                  {message}
                </p>
              )}
            </form>

            {/* Switch authentication mode */}
            <p className="mt-7 text-center text-sm text-[var(--color-text-muted)]">
              {mode === 'login'
                ? "Don't have an account?"
                : 'Already have an account?'}{' '}

              <button
                type="button"
                onClick={() =>
                  switchMode(mode === 'login' ? 'signup' : 'login')
                }
                className="font-semibold text-[var(--color-accent-primary)] hover:underline"
              >
                {mode === 'login' ? 'Create one' : 'Log in'}
              </button>
            </p>

            <p className="mt-8 text-center text-xs text-[var(--color-text-subtle)]">
              MemoryFlow · Dynamic Memory Management Visualizer
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
