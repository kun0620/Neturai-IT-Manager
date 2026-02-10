import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { notifyError, notifySuccess } from '@/lib/notify';
import { createFadeSlideUp } from '@/lib/motion';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
});

const ForgotPasswordPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      notifyError('Password Reset Failed', error.message);
    } else {
      notifySuccess(
        'Password Reset Email Sent',
        'Please check your email for instructions to reset your password.'
      );
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
        <motion.div className="w-full space-y-6" {...createFadeSlideUp(0)}>
          <motion.div className="space-y-2 text-center" {...createFadeSlideUp(0.04)}>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Neturai IT Manager
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Reset Your Password
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to receive a secure reset link.
            </p>
          </motion.div>

          <motion.div {...createFadeSlideUp(0.08)}>
            <Card className="border-muted/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Forgot Password</CardTitle>
          <CardDescription className="text-sm">
            We will send a reset link if the email exists in our system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted && (
            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              If this email is registered, a reset link has been sent. Please
              check your inbox.
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      We will never share your email with anyone.
                    </p>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="btn-motion-primary w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Remember your password?{' '}
            <Link to="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
          </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
