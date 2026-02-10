import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' }),
});

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      notifyError('Login Failed', error.message);
    } else {
      notifySuccess(
        'Login Successful',
        'You have been logged in successfully.'
      );
      navigate('/'); // Redirect to dashboard
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
              Sign In
            </h1>
            <p className="text-sm text-muted-foreground">
              Access your dashboard and manage operations securely.
            </p>
          </motion.div>

          <motion.div {...createFadeSlideUp(0.08)}>
            <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Login</CardTitle>
              <CardDescription>
                Enter your email and password to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center">
                      <FormLabel>Password</FormLabel>
                    </div>
                    <FormControl>
                      <Input
                        id="password"
                        type="password"
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Use the password provided by your administrator.
                    </p>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="btn-motion-primary w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="underline">
              Sign up
            </Link>
          </div>
          <div className="mt-2 text-center text-sm">
            <Link
              to="/forgot-password"
              className="inline-block text-sm underline"
            >
              Forgot your password?
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

export default LoginPage;
