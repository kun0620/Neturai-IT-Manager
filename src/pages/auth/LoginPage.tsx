import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  TimerOff,
  UserRound,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { notifySuccess } from '@/lib/notify';
import { createFadeSlideUp } from '@/lib/motion';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' }),
});

const passwordResetSchema = z
  .object({
    password: z
      .string()
      .min(12, { message: 'Password must be at least 12 characters.' })
      .regex(/[A-Z]/, { message: 'At least one uppercase letter is required.' })
      .regex(/[^\w\s]/, { message: 'At least one symbol is required.' }),
    confirmPassword: z
      .string()
      .min(12, { message: 'Confirm password must be at least 12 characters.' }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

const getPasswordStrength = (value: string) => {
  const checks = [
    value.length >= 12,
    /[A-Z]/.test(value),
    /[a-z]/.test(value),
    /[^\w\s]/.test(value),
  ];

  const score = checks.filter(Boolean).length;
  const label = score >= 4 ? 'Strong' : score >= 3 ? 'Good' : score >= 2 ? 'Fair' : 'Weak';

  return { checks, score, label };
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPassword, setShowPassword] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = React.useState(false);
  const [showResetPasswordConfirm, setShowResetPasswordConfirm] = React.useState(false);
  const [isFirstTimeModalOpen, setIsFirstTimeModalOpen] = React.useState(false);
  const [isSessionExpiredModalOpen, setIsSessionExpiredModalOpen] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const resetPasswordForm = useForm<z.infer<typeof passwordResetSchema>>({
    resolver: zodResolver(passwordResetSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const isFormInvalid = !form.formState.isValid;
  const resetPasswordValue = resetPasswordForm.watch('password') ?? '';
  const passwordStrength = getPasswordStrength(resetPasswordValue);

  React.useEffect(() => {
    const subscription = form.watch(() => {
      if (authError) {
        setAuthError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, authError]);

  React.useEffect(() => {
    const isExpired = searchParams.get('session') === 'expired';
    if (isExpired) {
      setIsSessionExpiredModalOpen(true);
    }
  }, [searchParams]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setAuthError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      const normalizedMessage = error.message.toLowerCase();
      const isInvalidCredential =
        normalizedMessage.includes('invalid login credentials') ||
        normalizedMessage.includes('invalid credentials') ||
        normalizedMessage.includes('email not confirmed');

      setAuthError(
        isInvalidCredential
          ? 'Invalid email or password. Please verify your credentials and try again. Multiple failed attempts may lock this terminal.'
          : error.message
      );
    } else {
      notifySuccess(
        'Login Successful',
        'You have been logged in successfully.'
      );
      navigate('/'); // Redirect to dashboard
    }
  };

  const onSubmitFirstTimePasswordReset = async (
    values: z.infer<typeof passwordResetSchema>
  ) => {
    notifySuccess(
      'Password Policy Updated',
      'Security requirements passed. You can now sign in with your new password.'
    );
    setIsFirstTimeModalOpen(false);
    resetPasswordForm.reset(values);
  };

  const handleSessionSignInAgain = () => {
    setIsSessionExpiredModalOpen(false);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('session');
    setSearchParams(nextParams, { replace: true });
  };

  const handleSwitchAccount = () => {
    form.reset({ email: '', password: '' });
    setAuthError(null);
    handleSessionSignInAgain();
  };

  return (
    <div className="min-h-screen bg-[#f9f9fb] text-[#1a1c1d] antialiased">
      <div className="flex min-h-screen items-stretch">
        <aside className="relative hidden w-7/12 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#25006d] to-[#3b1e8a] p-16 lg:flex">
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="mb-12 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                <ShieldCheck className="h-5 w-5 text-[#25006d]" />
              </div>
              <span className='font-["Manrope"] text-2xl font-extrabold uppercase tracking-tight text-white'>
                Neturai IT
              </span>
            </div>

            <div className="max-w-xl">
              <h1 className='mb-6 font-["Manrope"] text-5xl font-extrabold leading-tight tracking-tight text-white'>
                Secure Global Infrastructure Management
              </h1>
              <p className="text-lg font-medium leading-relaxed text-[#a68efc]">
                The single source of truth for your enterprise network. Manage
                assets, verify compliance, and monitor security protocols across
                six continents from a unified Neturai console.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap gap-8">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-5 py-3 backdrop-blur-md">
              <ShieldCheck className="h-5 w-5 text-[#ffb68f]" />
              <span className="text-sm font-medium tracking-wide text-white">
                SOC2 Type II Compliant
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-5 py-3 backdrop-blur-md">
              <Lock className="h-5 w-5 text-[#ffb68f]" />
              <span className="text-sm font-medium tracking-wide text-white">
                AES-256 Multi-layer Encryption
              </span>
            </div>
          </div>
        </aside>

        <main className="relative flex w-full flex-col items-center justify-center bg-[#f9f9fb] p-8 lg:w-5/12 lg:p-24">
          <div className="absolute top-12 flex items-center gap-2 lg:hidden">
            <ShieldCheck className="h-7 w-7 text-[#25006d]" />
            <span className='font-["Manrope"] text-xl font-extrabold uppercase tracking-tight text-[#25006d]'>
              Neturai IT
            </span>
          </div>

          <motion.div
            className="w-full max-w-md rounded-xl bg-white p-10 shadow-[0px_20px_50px_rgba(31,0,95,0.08)]"
            {...createFadeSlideUp(0)}
          >
            <header className="mb-10 text-center lg:text-left">
              <h2 className='mb-2 font-["Manrope"] text-3xl font-bold tracking-tight text-[#1a1c1d]'>
                Admin Console
              </h2>
              <p className="text-sm font-medium text-[#484552]">
                Enter your credentials to access the secure gateway.
              </p>
            </header>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {authError ? (
                  <div className="flex items-start gap-3 rounded-lg border-l-4 border-[#ba1a1a] bg-[#ffdad6]/40 p-4">
                    <ShieldAlert className="mt-0.5 h-5 w-5 text-[#ba1a1a]" />
                    <div className="space-y-1">
                      <h4 className='font-["Manrope"] text-xs font-bold uppercase tracking-wider text-[#93000a]'>
                        Access Denied
                      </h4>
                      <p className="text-xs leading-relaxed text-[#93000a]">
                        {authError}
                      </p>
                    </div>
                  </div>
                ) : null}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <FormItem className="space-y-2">
                      <FormLabel
                        htmlFor="email"
                        className={cn(
                          'ml-1 block text-xs font-bold uppercase tracking-widest',
                          fieldState.error ? 'text-[#ba1a1a]' : 'text-[#484552]'
                        )}
                      >
                        Work Email
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            id="email"
                            type="email"
                            placeholder="name@company.com"
                            required
                            disabled={isSubmitting}
                            className={cn(
                              'h-14 rounded-lg border-b-2 bg-[#f3f3f5] px-4 pr-12 text-[#1a1c1d] placeholder:text-[#797583] focus:bg-white focus-visible:ring-0',
                              isSubmitting && 'cursor-not-allowed opacity-60',
                              fieldState.error
                                ? 'border-[#ba1a1a] bg-white focus:border-[#ba1a1a]'
                                : 'border-transparent focus:border-[#25006d]'
                            )}
                            {...field}
                          />
                          {fieldState.error ? (
                            <AlertCircle className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#ba1a1a]" />
                          ) : null}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <FormItem className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FormLabel
                          htmlFor="password"
                          className={cn(
                            'ml-1 block text-xs font-bold uppercase tracking-widest',
                            fieldState.error ? 'text-[#ba1a1a]' : 'text-[#484552]'
                          )}
                        >
                          Password
                        </FormLabel>
                        <Link
                          to="/forgot-password"
                          className="text-xs font-semibold text-[#25006d] transition-colors hover:text-[#3b1e8a]"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            required
                            disabled={isSubmitting}
                            className={cn(
                              'h-14 rounded-lg border-b-2 bg-[#f3f3f5] px-4 pr-12 text-[#1a1c1d] placeholder:text-[#797583] focus:bg-white focus-visible:ring-0',
                              isSubmitting && 'cursor-not-allowed opacity-60',
                              fieldState.error
                                ? 'border-[#ba1a1a] bg-white focus:border-[#ba1a1a]'
                                : 'border-transparent focus:border-[#25006d]'
                            )}
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#797583] transition-colors hover:text-[#25006d]"
                            aria-label={
                              showPassword ? 'Hide password' : 'Show password'
                            }
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-3">
                  <input
                    id="remember"
                    type="checkbox"
                    className="h-5 w-5 cursor-pointer rounded border-[#cac4d4] text-[#25006d] focus:ring-[#25006d]/20"
                  />
                  <label
                    htmlFor="remember"
                    className="cursor-pointer select-none text-sm font-medium text-[#484552]"
                  >
                    Remember this session for 30 days
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFirstTimeModalOpen(true)}
                  className="w-fit text-xs font-bold uppercase tracking-wider text-[#25006d] transition-colors hover:text-[#3b1e8a] hover:underline"
                >
                  First-time password reset
                </button>

                <Button
                  type="submit"
                  disabled={isSubmitting || isFormInvalid}
                  className='btn-motion-primary h-14 w-full rounded-lg bg-gradient-to-br from-[#25006d] to-[#3b1e8a] font-["Manrope"] text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-[#25006d]/20 disabled:cursor-not-allowed disabled:opacity-80'
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying Session...
                    </span>
                  ) : (
                    'Establish Connection'
                  )}
                </Button>
              </form>
            </Form>

            <div className="relative my-10">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#cac4d4]/40" />
              </div>
              <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
                <span className="bg-white px-4 text-[#797583]">
                  or authenticate with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#cac4d4]/60 py-3.5 transition-all hover:bg-[#f3f3f5] active:scale-[0.98]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.6-5.4 3.6-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3.1.8 3.8 1.4l2.6-2.5C16.7 3 14.6 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6.9 0 9.1-4.8 9.1-7.3 0-.5 0-.9-.1-1.3H12Z"
                  />
                </svg>
                <span className="text-sm font-semibold text-[#1a1c1d]">
                  Continue with Google
                </span>
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#cac4d4]/60 py-3.5 transition-all hover:bg-[#f3f3f5] active:scale-[0.98]"
              >
                <svg className="h-5 w-5" viewBox="0 0 23 23" aria-hidden="true">
                  <path d="M0 0h23v23H0z" fill="#f3f3f3" />
                  <path d="M1 1h10v10H1z" fill="#f35325" />
                  <path d="M12 1h10v10H12z" fill="#81bc06" />
                  <path d="M1 12h10v10H1z" fill="#05a6f0" />
                  <path d="M12 12h10v10H12z" fill="#ffba08" />
                </svg>
                <span className="text-sm font-semibold text-[#1a1c1d]">
                  Continue with Microsoft
                </span>
              </button>
            </div>

            <footer className="mt-10 text-center">
              <p className="text-sm font-medium text-[#484552]">
                Don&apos;t have an account?{' '}
                <Link
                  to="/register"
                  className="font-bold text-[#25006d] hover:underline"
                >
                  Request access
                </Link>
              </p>
            </footer>
          </motion.div>

          <div className="mt-12 flex gap-8 text-xs font-bold uppercase tracking-widest text-[#797583]">
            <a className="transition-colors hover:text-[#25006d]" href="#">
              Privacy
            </a>
            <a className="transition-colors hover:text-[#25006d]" href="#">
              Terms
            </a>
            <a className="transition-colors hover:text-[#25006d]" href="#">
              Contact Support
            </a>
          </div>
        </main>
      </div>

      <Dialog open={isFirstTimeModalOpen} onOpenChange={setIsFirstTimeModalOpen}>
        <DialogContent className="max-h-[95vh] max-w-5xl overflow-y-auto rounded-xl border border-[#cac4d4]/20 bg-[#ffffff] p-0 shadow-[0px_20px_50px_rgba(31,0,95,0.08)]">
          <DialogTitle className="sr-only">First-time password reset</DialogTitle>
          <DialogDescription className="sr-only">
            Secure your identity by replacing temporary credentials.
          </DialogDescription>
          <section className="flex flex-col md:flex-row">
            <div className="flex w-full flex-col justify-between border-r border-[#cac4d4]/15 bg-[#f3f3f5] p-10 md:w-[35%]">
              <div>
                <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-[#25006d]">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <h2 className='font-["Manrope"] text-2xl font-extrabold tracking-tight text-[#25006d]'>
                  Secure Your Identity
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-[#484552]">
                  As a first-time user of Neturai IT, update your temporary credentials to comply with enterprise security policies.
                </p>
              </div>
              <div className="mt-12">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-[#25006d]" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#1a1c1d]">
                      Zero Trust Policy
                    </p>
                    <p className="text-[11px] text-[#484552]">
                      Your password is encrypted locally and never stored in plain text.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full bg-white p-12 md:w-[65%]">
              <Form {...resetPasswordForm}>
                <form
                  onSubmit={resetPasswordForm.handleSubmit(onSubmitFirstTimePasswordReset)}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={resetPasswordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="block text-xs font-bold uppercase tracking-widest text-[#1a1c1d]">
                            New Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showResetPassword ? 'text' : 'password'}
                                placeholder="••••••••••••"
                                className="h-12 rounded-none border-0 border-b-2 border-[#e2e2e4] bg-transparent px-0 pr-10 text-[#1a1c1d] placeholder:text-[#cac4d4] focus-visible:border-[#25006d] focus-visible:ring-0"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setShowResetPassword((prev) => !prev)
                                }
                                className="absolute right-0 top-1/2 -translate-y-1/2 text-[#797583] transition-colors hover:text-[#25006d]"
                                aria-label={
                                  showResetPassword
                                    ? 'Hide new password'
                                    : 'Show new password'
                                }
                              >
                                {showResetPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <div className="pt-2">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-tight text-[#484552]">
                                Password Strength
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-tight text-[#25006d]">
                                {passwordStrength.label}
                              </span>
                            </div>
                            <div className="flex h-1 gap-1">
                              {[0, 1, 2, 3].map((index) => (
                                <div
                                  key={index}
                                  className={cn(
                                    'flex-1 rounded-full',
                                    passwordStrength.score > index
                                      ? 'bg-[#25006d]'
                                      : 'bg-[#e2e2e4]'
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={resetPasswordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="block text-xs font-bold uppercase tracking-widest text-[#1a1c1d]">
                            Confirm New Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showResetPasswordConfirm ? 'text' : 'password'}
                                placeholder="••••••••••••"
                                className="h-12 rounded-none border-0 border-b-2 border-[#e2e2e4] bg-transparent px-0 pr-10 text-[#1a1c1d] placeholder:text-[#cac4d4] focus-visible:border-[#25006d] focus-visible:ring-0"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setShowResetPasswordConfirm((prev) => !prev)
                                }
                                className="absolute right-0 top-1/2 -translate-y-1/2 text-[#797583] transition-colors hover:text-[#25006d]"
                                aria-label={
                                  showResetPasswordConfirm
                                    ? 'Hide confirm password'
                                    : 'Show confirm password'
                                }
                              >
                                {showResetPasswordConfirm ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-3 rounded-lg bg-[#f3f3f5] p-6">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[#484552]">
                      Compliance Requirements
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      {passwordStrength.checks[0] ? (
                        <CheckCircle2 className="h-4 w-4 text-[#25006d]" />
                      ) : (
                        <Circle className="h-4 w-4 text-[#cac4d4]" />
                      )}
                      <span className={passwordStrength.checks[0] ? 'text-[#1a1c1d]' : 'text-[#484552]'}>
                        Minimum 12 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {passwordStrength.checks[1] && passwordStrength.checks[3] ? (
                        <CheckCircle2 className="h-4 w-4 text-[#25006d]" />
                      ) : (
                        <Circle className="h-4 w-4 text-[#cac4d4]" />
                      )}
                      <span
                        className={
                          passwordStrength.checks[1] && passwordStrength.checks[3]
                            ? 'text-[#1a1c1d]'
                            : 'text-[#484552]'
                        }
                      >
                        At least one uppercase and one symbol
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <Circle className="h-4 w-4 text-[#cac4d4]" />
                      <span className="text-[#484552]">
                        Does not match previous 3 passwords
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={!resetPasswordForm.formState.isValid}
                      className='btn-motion-primary rounded-md bg-gradient-to-br from-[#25006d] to-[#3b1e8a] px-8 py-3 font-["Manrope"] text-[11px] font-bold uppercase tracking-[0.05em] text-white shadow-lg hover:shadow-[#25006d]/20 disabled:cursor-not-allowed disabled:opacity-70'
                    >
                      Initialize Account
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </section>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSessionExpiredModalOpen}
        onOpenChange={setIsSessionExpiredModalOpen}
      >
        <DialogContent className="max-w-[500px] overflow-hidden rounded-xl border border-[#cac4d4]/20 bg-white p-0 shadow-[0px_20px_50px_rgba(31,0,95,0.08)]">
          <DialogTitle className="sr-only">Session Expired</DialogTitle>
          <DialogDescription className="sr-only">
            Your session has expired and requires re-authentication.
          </DialogDescription>
          <section>
            <div className="space-y-8 p-12 text-center">
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 scale-150 rounded-full bg-[#25006d]/5 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#f3f3f5]">
                  <TimerOff className="h-8 w-8 text-[#25006d]" />
                </div>
              </div>
              <div className="space-y-3">
                <h2 className='font-["Manrope"] text-2xl font-extrabold tracking-tight text-[#1a1c1d]'>
                  Session Expired
                </h2>
                <p className="mx-auto max-w-[320px] text-sm leading-relaxed text-[#484552]">
                  For your protection, your session has timed out after 30 minutes of inactivity. Re-authentication is required.
                </p>
              </div>
              <div className="inline-flex items-center gap-4 rounded-full bg-[#f3f3f5] px-6 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#ccbdff] shadow-sm">
                  <UserRound className="h-4 w-4 text-[#25006d]" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-tight text-[#484552]">
                    Logged in as
                  </p>
                  <p className="text-xs font-semibold text-[#25006d]">
                    alex.v@neturai-it.com
                  </p>
                </div>
              </div>
              <div className="w-full pt-4">
                <button
                  type="button"
                  onClick={handleSessionSignInAgain}
                  className='btn-motion-primary w-full rounded-lg bg-gradient-to-br from-[#25006d] to-[#3b1e8a] py-4 text-xs font-bold uppercase tracking-[0.08em] text-white shadow-md transition-all hover:shadow-[#25006d]/30 active:scale-[0.98]'
                >
                  Sign in again
                </button>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  className="mt-4 text-[10px] font-bold uppercase tracking-widest text-[#484552] transition-colors hover:text-[#25006d]"
                >
                  Switch Account
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[#cac4d4]/20 bg-[#f3f3f5] px-12 py-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-medium uppercase tracking-tight text-[#484552]">
                  System Secure
                </span>
              </div>
              <span className="text-[10px] text-[#797583]">v2.4.1-LTS</span>
            </div>
          </section>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
