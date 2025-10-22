import React, { useState } from 'react';
import { X, User, Mail, Lock, Briefcase, CheckCircle, Phone, ChevronDown } from 'lucide-react';
import { supabaseAdmin } from '../lib/supabaseClient';

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

const NewUserModal: React.FC<NewUserModalProps> = ({ isOpen, onClose, onUserCreated }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Employee');
  const [status, setStatus] = useState('Active');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!fullName || !email || !password) {
      setError('Full Name, Email, and Password are required.');
      setLoading(false);
      return;
    }

    try {
      console.log('[NewUserModal] Attempting to create user with email:', email);

      // Check if user with this email already exists
      console.log('[NewUserModal] Checking for existing user with email:', email);
      const { data: existingUsers, error: fetchError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 100,
        search: email,
      });

      if (fetchError) {
        console.error('[NewUserModal] Error checking for existing user:', fetchError);
        setError('Failed to check for existing user: ' + fetchError.message);
        setLoading(false);
        return;
      }

      console.log('[NewUserModal] Existing users check result:', existingUsers);

      const exactMatchUser = existingUsers.users.find(user => user.email === email);

      if (exactMatchUser) {
        console.error(`[NewUserModal] A user with this EXACT email already exists. Found user ID: ${exactMatchUser.id}`);
        setError(`A user with this email already exists. (Found ID: ${exactMatchUser.id.substring(0, 8)}...)`);
        setLoading(false);
        return;
      }

      // 1. Create user in Supabase Auth using supabaseAdmin
      console.log('[NewUserModal] Creating user in Supabase Auth...');
      console.log(`[NewUserModal] Email: ${email}, Password length: ${password.length}`);
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
      });

      if (authError) {
        console.error('[NewUserModal] Supabase Auth User Creation Error:', authError);
        console.error('[NewUserModal] Supabase Auth User Creation Error Details:', JSON.stringify(authError, null, 2));
        
        let errorMessage = authError.message || 'Failed to create user.';
        if (authError.code === 'unexpected_failure') {
          errorMessage += ' Please check your Supabase project logs for more details on this server-side error.';
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        throw new Error('User creation failed, no user data returned from auth.admin.createUser.');
      }

      console.log('[NewUserModal] Auth user created successfully with ID:', authData.user.id);

      // 2. Create profile in public.profiles table
      console.log('[NewUserModal] Creating profile in public.profiles for user ID:', authData.user.id);
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: fullName,
          role: role,
          status: status,
          phone: phone || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('[NewUserModal] Supabase Profile Insertion Error:', profileError);
        // If profile creation fails, consider deleting the auth user to prevent orphaned users
        console.log('[NewUserModal] Deleting auth user due to profile creation failure:', authData.user.id);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw profileError;
      }

      setSuccess('User created successfully!');
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('Employee');
      setStatus('Active');
      setPhone('');
      onUserCreated();
      setTimeout(onClose, 1500);
    } catch (err: any) {
      console.error('[NewUserModal] Caught error during user creation process:', err.message);
      setError(err.message || 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
        >
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-6">Create New User</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
                placeholder="john.doe@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
                placeholder="********"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200 appearance-none"
              >
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Employee">Employee</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <div className="relative">
              <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200 appearance-none"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">Pending</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone (Optional)
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-background-light dark:bg-gray-700 text-text-light dark:text-text-dark focus:ring-primary focus:border-primary transition-colors duration-200"
                placeholder="e.g., +1234567890"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          {success && <p className="text-green-500 text-sm mt-2">{success}</p>}

          <button
            type="submit"
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Creating User...' : 'Create User'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewUserModal;
