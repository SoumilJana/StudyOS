import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { X, Lock, Mail, User, Sparkles, AlertCircle, Check } from 'lucide-react';
import { storage } from '../../services/storage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        const redirectUrl =
          typeof window !== 'undefined' && window.location.origin
            ? `${window.location.origin}/`
            : 'https://study-os-app.vercel.app/';

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || 'Scholar',
            },
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) throw error;

        if (data.user) {
          if (!data.session) {
            setSuccessMessage(
              `Confirmation email sent to ${email}! If the link in your email redirects to localhost, you can sign in directly below with your password, or ensure your Supabase Auth Site URL is configured to ${window.location.origin}.`
            );
          } else {
            setSuccessMessage('Account created successfully! You are now logged in.');
            storage.updateSettings({ userName: fullName || email.split('@')[0] });
            storage.addXP(100, 'Created Study OS Cloud Account');
            setTimeout(() => {
              onSuccess(data.user);
              onClose();
            }, 1200);
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          setSuccessMessage('Signed in successfully! Syncing your study kernel...');
          storage.updateSettings({
            userName: data.user.user_metadata?.full_name || email.split('@')[0],
          });
          setTimeout(() => {
            onSuccess(data.user);
            onClose();
          }, 1000);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isSignUp ? 'Create Study OS Account' : 'Sign in to Study OS'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Backed by Supabase PostgreSQL & Row Level Security
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {isSignUp && (
            <div>
              <label className="text-xs font-semibold text-slate-300">Full Name</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="scholar@university.edu"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up & Synchronize' : 'Sign In'}
          </button>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-indigo-400 hover:underline"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300"
            >
              Continue as Guest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
