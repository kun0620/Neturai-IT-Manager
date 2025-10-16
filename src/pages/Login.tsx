import React from 'react';
import { Mail, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const Login: React.FC = () => {
  // Placeholder for future Supabase authentication logic
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login form submitted (Supabase auth placeholder)');
    // Here you would typically call a Supabase sign-in function
    // e.g., supabase.auth.signInWithPassword({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
      <div className="bg-card-light dark:bg-card-dark p-8 rounded-xl shadow-lg dark:shadow-md-dark w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-primary mb-2">Neturai</h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">IT Manager Login</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-200">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-primary hover:text-indigo-500">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
            >
              Sign in
            </button>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-300">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:text-indigo-500">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
