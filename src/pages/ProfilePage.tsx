
import React, { useState, type FormEvent } from 'react';
import {
  User,
  Mail,
  Lock,
  Save,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfilePage: React.FC = () => {
  const {
    user,
    updateProfile,
    updateEmail,
    updatePassword,
    signOut,
  } = useAuth();

  const [name, setName] = useState(
    user?.user_metadata?.full_name ?? ''
  );
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const runAction = async (
    action: () => Promise<{ error: string | null }>,
    successMessage: string,
  ) => {
    setBusy(true);
    setMessage('');
    setError('');

    try {
      const result = await action();

      if (result.error) {
        setError(result.error);
      } else {
        setMessage(successMessage);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleProfileSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runAction(
      () => updateProfile(name),
      'Your profile has been updated.',
    );
  };

  const handleEmailSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runAction(
      () => updateEmail(email),
      'Check your inbox to confirm your new email address.',
    );
  };

  const handlePasswordSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    void runAction(
      () => updatePassword(password),
      'Your password has been updated.',
    );

    setPassword('');
    setConfirmPassword('');
  };

  const inputClass =
    'mt-2 w-full rounded-xl border border-[var(--color-border-medium)] bg-[var(--color-bg-base)] px-4 py-3 text-sm text-[var(--color-text-main)] outline-none transition focus:border-[var(--color-accent-primary)]';

  const labelClass =
    'text-sm font-semibold text-[var(--color-text-main)]';

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-main)]">
          Account Profile
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Manage your personal information and account security.
        </p>
      </div>

      <div className="glass-panel rounded-2xl border border-[var(--color-border-subtle)] p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-accent-glow)] text-[var(--color-accent-primary)]">
            <User size={24} />
          </div>
          <div>
            <h2 className="font-bold text-[var(--color-text-main)]">
              Personal Information
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Update your display name.
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="profile-name">
              Full name
            </label>
            <input
              id="profile-name"
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={80}
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-5 py-3 text-sm font-semibold text-[var(--color-accent-contrast)] transition hover:brightness-110 disabled:opacity-50"
          >
            <Save size={16} />
            Save Profile
          </button>
        </form>
      </div>

      <div className="glass-panel rounded-2xl border border-[var(--color-border-subtle)] p-6">
        <div className="mb-6 flex items-center gap-3">
          <Mail size={23} className="text-[var(--color-accent-primary)]" />
          <div>
            <h2 className="font-bold text-[var(--color-text-main)]">
              Email Address
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Current email: {user?.email ?? 'Unavailable'}
            </p>
          </div>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="profile-email">
              New email address
            </label>
            <input
              id="profile-email"
              type="email"
              className={inputClass}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy || email === user?.email}
            className="rounded-xl border border-[var(--color-border-medium)] px-5 py-3 text-sm font-semibold text-[var(--color-text-main)] transition hover:border-[var(--color-accent-primary)] disabled:opacity-50"
          >
            Update Email
          </button>
        </form>
      </div>

      <div className="glass-panel rounded-2xl border border-[var(--color-border-subtle)] p-6">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck size={23} className="text-[var(--color-accent-primary)]" />
          <div>
            <h2 className="font-bold text-[var(--color-text-main)]">
              Account Security
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Change your account password.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="profile-password">
              New password
            </label>
            <input
              id="profile-password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="profile-confirm">
              Confirm new password
            </label>
            <input
              id="profile-confirm"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="rounded-xl border border-[var(--color-border-medium)] px-5 py-3 text-sm font-semibold text-[var(--color-text-main)] transition hover:border-[var(--color-accent-primary)] disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <Lock size={16} />
              Update Password
            </span>
          </button>
        </form>
      </div>

      {message && (
        <p role="status" className="flex items-center gap-2 text-sm text-[var(--color-status-success)]">
          <CheckCircle2 size={17} />
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-[var(--color-status-danger)]">
          <AlertCircle size={17} />
          {error}
        </p>
      )}

      <div className="glass-panel rounded-2xl border border-[var(--color-border-subtle)] p-6">
        <h2 className="font-bold text-[var(--color-text-main)]">
          Sign Out
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Sign out of your MemoryFlow account on this device.
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={busy}
          className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--color-status-danger)] px-5 py-3 text-sm font-semibold text-[var(--color-status-danger)] transition hover:bg-[var(--color-status-danger)] hover:text-white disabled:opacity-50"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
};
