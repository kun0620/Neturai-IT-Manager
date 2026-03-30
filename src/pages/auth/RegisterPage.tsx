import React from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from 'lucide-react';

import { notifyError, notifySuccess } from '@/lib/notify';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  workEmail: z
    .string()
    .email('Please enter a valid work email')
    .refine((value) => !/(gmail\.com|yahoo\.com|hotmail\.com|outlook\.com)$/i.test(value), {
      message: 'Please use your company email',
    }),
  companyName: z.string().min(1, 'Company name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  teamSize: z.enum(['1-10 members', '11-50 members', '51-200 members', '201+ members'], {
    errorMap: () => ({ message: 'Please select your team size' }),
  }),
  useCase: z.string().min(10, 'Please describe your use case in at least 10 characters'),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept Terms of Service and Privacy Policy' }),
  }),
});

type FormValues = z.infer<typeof formSchema>;
type SubmissionState = 'idle' | 'loading' | 'success' | 'error';

const teamSizeOptions: FormValues['teamSize'][] = [
  '1-10 members',
  '11-50 members',
  '51-200 members',
  '201+ members',
];

const RegisterPage: React.FC = () => {
  const [submissionState, setSubmissionState] = React.useState<SubmissionState>('idle');
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      fullName: '',
      workEmail: '',
      companyName: '',
      jobTitle: '',
      teamSize: undefined,
      useCase: '',
      acceptedTerms: false,
    },
  });

  const hasValidationErrors = form.formState.submitCount > 0 && !form.formState.isValid;
  const isSubmitting = submissionState === 'loading';
  const hasFailed = submissionState === 'error';
  const hasSucceeded = submissionState === 'success';

  const submitRequestAccess = async (values: FormValues) => {
    setServerError(null);
    setSubmissionState('loading');

    try {
      await new Promise((resolve) => setTimeout(resolve, 1300));

      if (values.workEmail.toLowerCase().includes('fail')) {
        throw new Error('Network timeout or invalid server response.');
      }

      setSubmissionState('success');
      notifySuccess(
        'Request submitted',
        'Your access request is in review. We will reach out within 1 business day.'
      );
      form.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      setServerError(message);
      setSubmissionState('error');
      notifyError('Submission failed', message);
    }
  };

  const retrySubmission = () => {
    setSubmissionState('idle');
    setServerError(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f9f9fb] font-sans text-[#1a1c1d] antialiased">
      <main className="grid min-h-[calc(100vh-64px)] flex-grow grid-cols-1 overflow-hidden lg:grid-cols-12">
        <section className="relative flex flex-col justify-center overflow-hidden bg-[#25006d] px-12 py-16 text-white lg:col-span-5 lg:px-20">
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,#3b1e8a_0%,transparent_50%),radial-gradient(circle_at_80%_70%,#1f005f_0%,transparent_50%)]" />
          </div>

          <div className="relative z-10">
            <header className="mb-12">
              <h1 className='font-["Manrope"] text-3xl font-extrabold tracking-tight'>
                Neturai IT
              </h1>
              <div className="mt-2 h-1 w-12 rounded-full bg-[#a68efc]" />
            </header>

            <h2 className='mb-8 font-["Manrope"] text-4xl font-bold leading-tight lg:text-5xl'>
              The Sovereign Interface for Modern Infrastructure.
            </h2>
            <p className="mb-12 max-w-md text-lg leading-relaxed text-[#ccbdff]">
              Unify your enterprise network, security protocols, and cloud assets into
              a single, high-fidelity curation engine. Designed for the elite IT curator.
            </p>

            <div className="mb-16 space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                  <ShieldCheck className="h-5 w-5 text-[#a68efc]" />
                </div>
                <div>
                  <p className="font-semibold text-white">SOC2 Type II Certified</p>
                  <p className="text-sm text-[#ccbdff]">
                    Enterprise-grade compliance standards.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                  <Lock className="h-5 w-5 text-[#a68efc]" />
                </div>
                <div>
                  <p className="font-semibold text-white">AES-256 Encryption</p>
                  <p className="text-sm text-[#ccbdff]">
                    Zero-trust data sovereignty at every layer.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-8">
              <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-[#3b1e8a66] shadow-[0px_20px_50px_rgba(31,0,95,0.08)]">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDeYkHzQ_U9HUN8bT7P4Gkr5n_vk9gkqdRj3JcI3wh-fJMwfbIvHA7KChorcvdh_8EXg80JB8VfGeM036nWbdzpDgvJDnl3CNxGRJzmj1ADvAJEnhaDF3OiWuC2Eg2GelKyfYVBOi2Uy0HXH8tjZyYl6ysttZogJw0QMw_reo63gyV1JjK30URfCrmXlmkyv0PUQZ4Eao57kNxBy3bzp0THYETxPhunugYkg4HuqDv-LmUp8PGn_GWa2o4WW4KZxC1j9-0sdJRQkMWr"
                  alt="Abstract glowing network server rack in a dark room with violet neon lighting accents"
                  className="h-full w-full object-cover opacity-60 mix-blend-overlay"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center overflow-y-auto bg-[#f9f9fb] px-6 py-12 lg:col-span-7 lg:p-20">
          <div className="w-full max-w-2xl space-y-8">
            {hasValidationErrors ? (
              <div className="relative overflow-hidden rounded-xl border border-[#ba1a1a]/25 bg-white p-6 shadow-[0px_20px_50px_rgba(31,0,95,0.08)]">
                <div className="absolute left-0 top-0 h-1 w-full bg-[#ba1a1a]" />
                <div className="mb-4 flex items-center gap-3 text-[#ba1a1a]">
                  <AlertTriangle className="h-5 w-5" />
                  <h4 className='font-["Manrope"] text-sm font-bold'>
                    Please correct the following errors
                  </h4>
                </div>
                <ul className="space-y-1 text-sm text-[#93000a]">
                  {Object.values(form.formState.errors).map((error) =>
                    error?.message ? <li key={error.message}>• {error.message}</li> : null
                  )}
                </ul>
              </div>
            ) : null}

            <div className="rounded-xl border border-[#cac4d4]/20 bg-white p-8 shadow-[0px_20px_50px_rgba(31,0,95,0.08)] lg:p-12">
              <div className="mb-10">
                <h3 className='mb-2 font-["Manrope"] text-2xl font-bold text-[#1a1c1d]'>
                  Request Access
                </h3>
                <p className="text-[#484552]">
                  Join the waitlist for the Neturai Admin Console. We typically
                  respond within 24 hours.
                </p>
              </div>

              <form
                className="grid grid-cols-1 gap-8 md:grid-cols-2"
                onSubmit={form.handleSubmit(submitRequestAccess)}
                noValidate
              >
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#484552]">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Alex Rivera"
                    className={cn(
                      'rounded-t-lg border-b-2 bg-[#f3f3f5] p-3 text-[#1a1c1d] transition-all focus:outline-none',
                      form.formState.errors.fullName
                        ? 'border-[#ba1a1a]'
                        : 'border-transparent focus:border-[#25006d]'
                    )}
                    {...form.register('fullName')}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#484552]">
                    Work Email
                  </label>
                  <input
                    type="email"
                    placeholder="alex@company.com"
                    className={cn(
                      'rounded-t-lg border-b-2 bg-[#f3f3f5] p-3 text-[#1a1c1d] transition-all focus:outline-none',
                      form.formState.errors.workEmail
                        ? 'border-[#ba1a1a]'
                        : 'border-transparent focus:border-[#25006d]'
                    )}
                    {...form.register('workEmail')}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#484552]">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="Global Tech Corp"
                    className={cn(
                      'rounded-t-lg border-b-2 bg-[#f3f3f5] p-3 text-[#1a1c1d] transition-all focus:outline-none',
                      form.formState.errors.companyName
                        ? 'border-[#ba1a1a]'
                        : 'border-transparent focus:border-[#25006d]'
                    )}
                    {...form.register('companyName')}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#484552]">
                    Job Title
                  </label>
                  <input
                    type="text"
                    placeholder="Head of IT Operations"
                    className={cn(
                      'rounded-t-lg border-b-2 bg-[#f3f3f5] p-3 text-[#1a1c1d] transition-all focus:outline-none',
                      form.formState.errors.jobTitle
                        ? 'border-[#ba1a1a]'
                        : 'border-transparent focus:border-[#25006d]'
                    )}
                    {...form.register('jobTitle')}
                  />
                </div>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#484552]">
                    Team Size
                  </label>
                  <select
                    className={cn(
                      'appearance-none rounded-t-lg border-b-2 bg-[#f3f3f5] p-3 text-[#1a1c1d] transition-all focus:outline-none',
                      form.formState.errors.teamSize
                        ? 'border-[#ba1a1a]'
                        : 'border-transparent focus:border-[#25006d]'
                    )}
                    {...form.register('teamSize')}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select team size
                    </option>
                    {teamSizeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#484552]">
                    Primary Use Case
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe your infrastructure needs..."
                    className={cn(
                      'resize-none rounded-t-lg border-b-2 bg-[#f3f3f5] p-3 text-[#1a1c1d] transition-all focus:outline-none',
                      form.formState.errors.useCase
                        ? 'border-[#ba1a1a]'
                        : 'border-transparent focus:border-[#25006d]'
                    )}
                    {...form.register('useCase')}
                  />
                </div>

                <div className="flex items-start gap-3 py-2 md:col-span-2">
                  <input
                    id="acceptedTerms"
                    type="checkbox"
                    className="mt-1 h-5 w-5 rounded border-[#cac4d4] text-[#25006d] focus:ring-[#25006d]"
                    {...form.register('acceptedTerms')}
                  />
                  <label
                    htmlFor="acceptedTerms"
                    className="text-sm leading-relaxed text-[#484552]"
                  >
                    I agree to the{' '}
                    <a className="font-medium text-[#25006d] hover:underline" href="#">
                      Terms of Service
                    </a>{' '}
                    and acknowledge the{' '}
                    <a className="font-medium text-[#25006d] hover:underline" href="#">
                      Privacy Policy
                    </a>
                    .
                  </label>
                </div>

                <div className="flex items-center justify-between pt-4 md:col-span-2">
                  <Link
                    to="/login"
                    className="flex items-center gap-1 text-sm font-medium text-[#484552] transition-colors hover:text-[#25006d]"
                  >
                    Back to Login
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-gradient-to-br from-[#25006d] to-[#3b1e8a] px-8 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-[0px_20px_50px_rgba(31,0,95,0.08)] transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-75"
                  >
                    {isSubmitting ? 'Processing...' : 'Request Access'}
                  </button>
                </div>
              </form>
            </div>

            {submissionState === 'loading' ? (
              <div className="rounded-xl bg-white p-8 shadow-[0px_20px_50px_rgba(31,0,95,0.08)]">
                <div className="flex flex-col items-center justify-center text-center">
                  <Loader2 className="mb-4 h-12 w-12 animate-spin text-[#25006d]" />
                  <p className='font-["Manrope"] font-bold'>Processing Request</p>
                  <p className="text-sm text-[#484552]">
                    Encrypting your application data...
                  </p>
                </div>
              </div>
            ) : null}

            {hasFailed ? (
              <div className="rounded-xl border border-[#ba1a1a]/10 bg-[#ffdad6]/20 p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#ba1a1a]/10">
                  <XCircle className="h-7 w-7 text-[#ba1a1a]" />
                </div>
                <p className='font-["Manrope"] font-bold text-[#93000a]'>Submission Failed</p>
                <p className="mb-4 text-sm text-[#93000a]/80">
                  {serverError ?? 'Network timeout or invalid server response.'}
                </p>
                <button
                  type="button"
                  onClick={retrySubmission}
                  className="rounded-lg bg-[#ba1a1a] px-6 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#ba1a1a]/90"
                >
                  Retry
                </button>
              </div>
            ) : null}

            {hasSucceeded ? (
              <div className="relative overflow-hidden rounded-xl bg-[#25006d] px-8 py-12 text-center text-white shadow-[0px_20px_50px_rgba(31,0,95,0.08)]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#25006d] to-[#3b1e8a] opacity-90" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#a68efc]/20">
                    <CheckCircle2 className="h-12 w-12 text-white" />
                  </div>
                  <h3 className='mb-3 font-["Manrope"] text-2xl font-bold'>Request Submitted</h3>
                  <p className="max-w-sm leading-relaxed text-[#ccbdff]">
                    Your application is being reviewed by our security team. We&apos;ll
                    contact you at your work email within{' '}
                    <span className="font-semibold text-white">1 business day</span>.
                  </p>
                  <div className="mt-8 flex gap-4">
                    <button
                      type="button"
                      onClick={retrySubmission}
                      className="rounded-lg bg-white px-6 py-2 text-sm font-bold uppercase text-[#25006d]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <UserRoundCheck className="h-4 w-4" />
                        View Status
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 z-50 flex w-full flex-col items-center justify-center gap-4 border-t border-slate-200/15 bg-white/80 px-12 py-4 backdrop-blur-xl md:flex-row md:gap-8">
        <span className="text-xs tracking-wide text-slate-500">
          © 2024 Neturai IT. All rights reserved.
        </span>
        <div className="flex gap-6">
          <a
            href="#"
            className="text-xs tracking-wide text-slate-500 transition-all duration-150 hover:text-indigo-600 active:scale-95"
          >
            Privacy Policy
          </a>
          <a
            href="#"
            className="text-xs tracking-wide text-slate-500 transition-all duration-150 hover:text-indigo-600 active:scale-95"
          >
            Terms of Service
          </a>
          <a
            href="#"
            className="text-xs tracking-wide text-slate-500 transition-all duration-150 hover:text-indigo-600 active:scale-95"
          >
            Support
          </a>
          <a
            href="#"
            className="text-xs tracking-wide text-slate-500 transition-all duration-150 hover:text-indigo-600 active:scale-95"
          >
            Contact Us
          </a>
        </div>
      </footer>
    </div>
  );
};

export default RegisterPage;
