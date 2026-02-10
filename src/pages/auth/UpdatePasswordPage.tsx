import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' }),
  confirmPassword: z
    .string()
    .min(8, { message: 'Confirm password must be at least 8 characters.' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ['confirmPassword'],
});

const UpdatePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isValidToken, setIsValidToken] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) {
          notifyError(
            'Invalid Token',
            'The password reset link is invalid or expired.'
          );
          navigate('/forgot-password');
        } else {
          setIsValidToken(true);
        }
      });
    } else {
      notifyError(
        'Missing Token',
        'No password reset token found. Please use the link from your email.'
      );
      navigate('/forgot-password');
    }
  }, [searchParams, navigate]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      notifyError('Password Update Failed', error.message);
    } else {
      notifySuccess(
        'Password Updated',
        'Your password has been updated successfully. You can now log in.'
      );
      navigate('/login');
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
          <motion.div className="w-full space-y-6" {...createFadeSlideUp(0)}>
            <motion.div className="space-y-2 text-center" {...createFadeSlideUp(0.04)}>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Neturai IT Manager
              </p>
              <h1 className="text-2xl font-semibold text-foreground">
                Verifying Reset Link
              </h1>
              <p className="text-sm text-muted-foreground">
                Please wait while we verify your reset link.
              </p>
            </motion.div>

            <motion.div {...createFadeSlideUp(0.08)}>
              <Card className="border-muted/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Verifying Token</CardTitle>
                <CardDescription>
                  This should only take a moment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  If you are not redirected, request a new reset link.
                </p>
                <div className="mt-4 text-center text-sm">
                  <Link to="/forgot-password" className="underline">
                    Go to Forgot Password
                  </Link>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
        <motion.div className="w-full space-y-6" {...createFadeSlideUp(0)}>
          <motion.div className="space-y-2 text-center" {...createFadeSlideUp(0.04)}>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Neturai IT Manager
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Update Password
            </h1>
            <p className="text-sm text-muted-foreground">
              Create a new password to secure your account.
            </p>
          </motion.div>

          <motion.div {...createFadeSlideUp(0.08)}>
            <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Update Password</CardTitle>
              <CardDescription>
                Choose a strong password you do not reuse.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input
                            id="password"
                            type="password"
                            required
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input
                            id="confirmPassword"
                            type="password"
                            required
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="btn-motion-primary w-full"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default UpdatePasswordPage;
