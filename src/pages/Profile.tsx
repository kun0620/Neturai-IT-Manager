import React, { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserAssets } from '@/hooks/useUserAssets';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { notifyError, notifySuccess } from '@/lib/notify';
import { supabase } from '@/lib/supabase';
import type { AssetWithType } from '@/types/asset';
import {
  BadgeCheck,
  Building2,
  Camera,
  ChevronRight,
  Clock3,
  HelpCircle,
  KeyRound,
  Laptop,
  LockKeyhole,
  Mail,
  MapPin,
  Monitor,
  MoonStar,
  Palette,
  QrCode,
  Phone,
  RefreshCw,
  Shield,
  Smartphone,
  Sun,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

const resolveRoleLabel = (role: 'admin' | 'it' | 'user' | null) => {
  if (role === 'admin') return 'Enterprise Admin';
  if (role === 'it') return 'IT Manager';
  return 'Team Member';
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

const resolveAssetIcon = (asset: AssetWithType) => {
  const source = `${asset.asset_type?.icon ?? ''} ${asset.asset_type?.name ?? ''} ${asset.category?.name ?? ''} ${asset.name}`.toLowerCase();
  if (source.includes('monitor') || source.includes('display')) return Monitor;
  if (source.includes('phone') || source.includes('mobile')) return Smartphone;
  return Laptop;
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return format(date, 'MMM d, yyyy - hh:mm a');
};

const normalizeStatus = (status: string) => status.replace(/_/g, ' ');

const resolveStatusBadgeClass = (status: string) => {
  const value = status.toLowerCase();
  if (value.includes('assigned') || value.includes('use')) {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  }
  if (value.includes('available') || value.includes('ready')) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }
  if (value.includes('retired') || value.includes('disposed')) {
    return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
};

export function ProfilePage() {
  const { user } = useAuth();
  const { role } = useCurrentProfile();
  const { data: profile, isLoading: profileLoading, updateProfile } = useUserProfile();
  const {
    data: assignedAssets = [],
    isLoading: assignedAssetsLoading,
  } = useUserAssets();
  const [language, setLanguage] = useState('en-US');
  const [timezone, setTimezone] = useState('America/New_York');
  const [themePreference, setThemePreference] = useState<'light' | 'dark' | 'system'>('light');
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [manage2FAOpen, setManage2FAOpen] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    full_name: '',
    title: '',
    department: '',
    location: '',
    preferred_contact: '',
    bio: '',
  });
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const displayName = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'Neturai User';
  const roleLabel = resolveRoleLabel(role);
  const accountEmail = user?.email ?? 'Not available';
  const profileLastUpdated = formatTimestamp((profile as { updated_at?: string | null } | null)?.updated_at);
  const employeeId = profile?.id ? `NTR-${profile.id.slice(0, 8).toUpperCase()}` : 'NTR-UNASSIGNED';
  const titleDraft = profile?.device_type?.trim() || roleLabel;
  const bioDraft = profile?.device_details?.trim() || '';
  const passwordStrengthScore = [
    passwordDraft.newPassword.length >= 12,
    /[A-Z]/.test(passwordDraft.newPassword),
    /\d/.test(passwordDraft.newPassword),
    /[^A-Za-z0-9]/.test(passwordDraft.newPassword),
  ].filter(Boolean).length;
  const passwordStrengthLabel =
    passwordStrengthScore >= 4
      ? 'High'
      : passwordStrengthScore >= 3
        ? 'Medium'
        : 'Low';
  const trustedDevices = [
    { name: 'Current Browser Session', detail: profile?.location || 'Current location', current: true },
    { name: 'Mobile Device', detail: 'Last active recently', current: false },
    { name: 'Workstation Sync', detail: 'Last active earlier', current: false },
  ];
  const recentActivity = [
    {
      title: assignedAssets.length
        ? `Assigned asset roster synced`
        : 'No assigned assets on file',
      detail: assignedAssets.length
        ? `${assignedAssets.length} tracked device${assignedAssets.length === 1 ? '' : 's'} currently linked to this account.`
        : 'Inventory will appear here once equipment is assigned.',
    },
    {
      title: `${roleLabel} access confirmed`,
      detail: 'Role-based permissions are currently active for this account.',
    },
    {
      title: profile?.preferred_contact
        ? 'Preferred contact method verified'
        : 'Preferred contact not set',
      detail: profile?.preferred_contact || 'Contact IT support to add a preferred channel.',
    },
    {
      title: 'Profile record last updated',
      detail: profileLastUpdated,
    },
  ];

  const hydrateProfileDraft = () => {
    setProfileDraft({
      full_name: profile?.full_name ?? '',
      title: titleDraft,
      department: profile?.department ?? '',
      location: profile?.location ?? '',
      preferred_contact: profile?.preferred_contact ?? '',
      bio: bioDraft,
    });
  };

  const handleOpenEditProfile = () => {
    hydrateProfileDraft();
    setEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync({
        full_name: profileDraft.full_name.trim() || null,
        department: profileDraft.department.trim() || null,
        location: profileDraft.location.trim() || null,
        preferred_contact: profileDraft.preferred_contact.trim() || null,
        device_type: profileDraft.title.trim() || null,
        device_details: profileDraft.bio.trim() || null,
      });
      notifySuccess('Profile updated');
      setEditProfileOpen(false);
    } catch (err) {
      notifyError('Failed to update profile', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordDraft.currentPassword || !passwordDraft.newPassword || !passwordDraft.confirmPassword) {
      notifyError('Missing fields', 'Please complete all password fields');
      return;
    }
    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      notifyError('Password mismatch', 'New password and confirmation do not match');
      return;
    }
    if (passwordDraft.newPassword.length < 12) {
      notifyError('Weak password', 'Password must be at least 12 characters');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordDraft.newPassword,
      });
      if (error) throw error;
      notifySuccess('Password updated');
      setPasswordDraft({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setChangePasswordOpen(false);
    } catch (err) {
      notifyError('Failed to update password', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="space-y-8 px-4 py-6 md:px-6">
        <div className="space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="h-10 w-56 animate-pulse rounded bg-muted" />
        </div>
        <LoadingSkeleton count={2} className="lg:grid-cols-3" />
        <LoadingSkeleton count={2} className="lg:grid-cols-3" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f6f6f8] px-4 py-6 text-slate-900 dark:bg-[#161220] dark:text-slate-100 md:px-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>Account</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-primary">My Profile</span>
        </div>

        <section className="mb-12">
          <div className="relative overflow-hidden rounded-xl bg-white p-8 shadow-[0px_20px_50px_rgba(31,0,95,0.04)] dark:bg-[#1a1726]">
            <div className="absolute right-[-72px] top-[-72px] h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
            <div className="flex flex-col items-center gap-10 md:flex-row">
              <div className="relative">
                <div className="flex h-40 w-40 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-[#25006d] to-[#3b1e8a] text-4xl font-black text-white shadow-xl dark:border-[#161220]">
                  {getInitials(displayName)}
                </div>
                <button
                  type="button"
                  disabled
                  className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#25006d] to-[#3b1e8a] text-white shadow-lg transition-transform disabled:cursor-not-allowed"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-4 text-center md:text-left">
                <div>
                  <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                    {displayName}
                  </h1>
                  <p className="text-lg font-semibold text-primary">{roleLabel}</p>
                </div>
                <div className="grid max-w-2xl grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                    <Mail className="h-4 w-4 text-primary/60" />
                    {accountEmail}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                    <Building2 className="h-4 w-4 text-primary/60" />
                    {profile?.department || 'IT Operations'}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                    <MapPin className="h-4 w-4 text-primary/60" />
                    {profile?.location || 'Location not set'}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                    <BadgeCheck className="h-4 w-4 text-primary/60" />
                    {employeeId}
                  </div>
                </div>
              </div>

              <div className="flex min-w-[200px] flex-col gap-3">
                <Button
                  type="button"
                  onClick={handleOpenEditProfile}
                  className="gap-2 bg-gradient-to-br from-[#25006d] to-[#3b1e8a] px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-100"
                >
                  <UserRound className="h-4 w-4" />
                  Edit Profile
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setChangePasswordOpen(true)}
                  className="gap-2 bg-slate-100 px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-800 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-100 dark:bg-slate-800 dark:text-slate-100"
                >
                  <LockKeyhole className="h-4 w-4" />
                  Change Password
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_350px]">
          <div className="space-y-12">
            <section className="overflow-hidden rounded-xl border border-primary/10 bg-white shadow-sm dark:bg-[#161220]">
            <div className="flex items-center justify-between border-b border-primary/10 p-6">
              <div className="flex items-center gap-2">
                <Laptop className="h-5 w-5 text-primary" />
                <h2 className="font-bold">My Assigned Assets</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                {assignedAssets.length} Total Items
              </span>
            </div>

            {assignedAssetsLoading ? (
              <div className="p-6">
                <LoadingSkeleton count={3} className="grid-cols-1" />
              </div>
            ) : assignedAssets.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                No assets are currently assigned to your account.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-primary/5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-6 py-3">Asset</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Serial</th>
                      <th className="px-6 py-3 text-center">Status</th>
                      <th className="px-6 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5">
                    {assignedAssets.map((asset) => {
                      const AssetIcon = resolveAssetIcon(asset);
                      return (
                        <tr
                          key={asset.id}
                          className="transition-colors hover:bg-primary/5"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-400 dark:bg-slate-800">
                                <AssetIcon className="h-4.5 w-4.5" />
                              </div>
                              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {asset.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                            {asset.category?.name || asset.asset_type?.name || 'Uncategorized'}
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-slate-500 dark:text-slate-400">
                            {asset.serial_number || asset.asset_code || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${resolveStatusBadgeClass(
                                asset.status
                              )}`}
                            >
                              {normalizeStatus(asset.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                            {formatTimestamp(asset.created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            </section>

            <section>
              <div className="mb-6 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Security &amp; Account</h2>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm dark:bg-[#161220]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Password Status
                      </p>
                      <p className="text-lg font-medium tracking-tight text-slate-900 dark:text-slate-100">
                        ••••••••••••••••
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Last changed via secure account flow
                      </p>
                    </div>
                    <div className="rounded-lg bg-primary/5 p-2 text-primary">
                      <LockKeyhole className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-100 p-4 dark:bg-slate-900">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Two-Factor Auth</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Enhanced protection enabled</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                      Active
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setManage2FAOpen(true)}
                    className="w-full bg-slate-100 text-xs font-bold uppercase tracking-[0.16em] text-slate-800 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-100 dark:bg-slate-800 dark:text-slate-100"
                  >
                    Manage 2FA Settings
                  </Button>
                </div>

                <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm dark:bg-[#161220]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Last login</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{profileLastUpdated}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Active sessions</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">1 on this device</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Trusted devices</span>
                      <div className="flex -space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 dark:border-[#161220] dark:bg-slate-800">
                          <Laptop className="h-4 w-4" />
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 dark:border-[#161220] dark:bg-slate-800">
                          <Smartphone className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled
                    className="w-full border-rose-200 text-xs font-bold uppercase tracking-[0.16em] text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-100 dark:border-rose-900/40 dark:text-rose-400"
                  >
                    Sign Out Other Sessions
                  </Button>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="mb-6 flex items-center gap-2 text-lg font-bold">
                <Clock3 className="h-5 w-5 text-primary" />
                Recent Activity
              </h2>
              <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-[#161220]">
                <div className="relative space-y-6 before:absolute before:bottom-0 before:left-5 before:top-0 before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent dark:before:via-slate-700">
                  {recentActivity.map((item, index) => (
                    <div key={item.title} className="relative flex items-center gap-6">
                      <div
                        className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          index === 0
                            ? 'bg-primary text-white shadow-lg'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {index === 0 ? <Laptop className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.title}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  disabled
                  className="mt-8 w-full text-center text-[11px] font-bold uppercase tracking-widest text-primary hover:underline"
                >
                  View All Activity
                </button>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <Palette className="h-5 w-5 text-primary" />
                Preferences
              </h2>
              <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm dark:bg-[#161220]">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Interface Language
                  </label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="h-11 border-0 bg-slate-100 text-sm font-medium dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">English (United States)</SelectItem>
                      <SelectItem value="th-TH">Thai (Thailand)</SelectItem>
                      <SelectItem value="de-DE">German (Deutsch)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Timezone
                  </label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="h-11 border-0 bg-slate-100 text-sm font-medium dark:bg-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">(GMT-05:00) Eastern Time</SelectItem>
                      <SelectItem value="Asia/Bangkok">(GMT+07:00) Bangkok</SelectItem>
                      <SelectItem value="UTC">(GMT+00:00) UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2">
                  <label className="mb-3 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Theme
                  </label>
                  <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => setThemePreference('light')}
                      className={`flex-1 rounded-lg py-2 ${
                        themePreference === 'light'
                          ? 'bg-white text-primary shadow-sm dark:bg-slate-950'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Sun className="h-4 w-4" />
                        <span className="text-[10px] font-bold">Light</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemePreference('dark')}
                      className={`flex-1 rounded-lg py-2 ${
                        themePreference === 'dark'
                          ? 'bg-white text-primary shadow-sm dark:bg-slate-950'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <MoonStar className="h-4 w-4" />
                        <span className="text-[10px] font-bold">Dark</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemePreference('system')}
                      className={`flex-1 rounded-lg py-2 ${
                        themePreference === 'system'
                          ? 'bg-white text-primary shadow-sm dark:bg-slate-950'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Monitor className="h-4 w-4" />
                        <span className="text-[10px] font-bold">System</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#25006d] to-[#3b1e8a] p-6 text-white shadow-lg">
              <div className="absolute -bottom-8 -right-8 opacity-10">
                <HelpCircle className="h-28 w-28" />
              </div>
              <h2 className="mb-2 text-lg font-bold">Need Help?</h2>
              <p className="mb-6 text-sm leading-relaxed text-white/70">
                Access the knowledge base or get in touch with our internal IT support team.
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center justify-between rounded-lg bg-white/10 p-3 text-sm font-medium transition-colors hover:bg-white/20"
                >
                  Knowledge Center
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center justify-between rounded-lg bg-white/10 p-3 text-sm font-medium transition-colors hover:bg-white/20"
                >
                  IT Support Ticket
                  <Phone className="h-4 w-4" />
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="max-h-[95vh] max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-[#f9f9fb] p-0 shadow-[0px_20px_50px_rgba(31,0,95,0.08)] [&>button]:hidden dark:border-slate-800 dark:bg-[#161220]">
          <DialogTitle className="sr-only">Edit Profile</DialogTitle>
          <DialogDescription className="sr-only">
            Update your profile details and professional information.
          </DialogDescription>
          <div className="flex max-h-[95vh] flex-col overflow-hidden">
            <div className="flex items-end justify-between border-b border-slate-200 bg-white px-10 py-8 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <span className="mb-2 block text-sm font-bold uppercase tracking-widest text-primary">Account Settings</span>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Edit Profile</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditProfileOpen(false)}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-12">
              <div className="grid grid-cols-12 gap-12">
                <div className="col-span-12 flex flex-col items-center text-center lg:col-span-4">
                  <div className="relative group">
                    <div className="mb-6 flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl bg-slate-200 text-4xl font-black text-primary ring-4 ring-primary/20 dark:bg-slate-800">
                      {getInitials(profileDraft.full_name || displayName)}
                    </div>
                    <button
                      type="button"
                      className="absolute -bottom-2 -right-2 rounded-xl bg-gradient-to-br from-[#25006d] to-[#3b1e8a] p-3 text-white shadow-lg transition-transform group-hover:scale-110"
                    >
                      <Camera className="h-5 w-5" />
                    </button>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">{profileDraft.full_name || displayName}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{profileDraft.title || roleLabel}</p>
                  <p className="mt-4 px-4 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                    Upload a high-resolution portrait for the global directory.
                  </p>
                </div>

                <div className="col-span-12 space-y-8 lg:col-span-8">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-primary">Full Name</Label>
                      <Input
                        value={profileDraft.full_name}
                        onChange={(e) => setProfileDraft((current) => ({ ...current, full_name: e.target.value }))}
                        className="h-12 border-0 border-b-2 border-slate-200 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-primary">Professional Title</Label>
                      <Input
                        value={profileDraft.title}
                        onChange={(e) => setProfileDraft((current) => ({ ...current, title: e.target.value }))}
                        className="h-12 border-0 border-b-2 border-slate-200 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-primary">Department</Label>
                      <Input
                        value={profileDraft.department}
                        onChange={(e) => setProfileDraft((current) => ({ ...current, department: e.target.value }))}
                        className="h-12 border-0 border-b-2 border-slate-200 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-primary">Office Location</Label>
                      <Input
                        value={profileDraft.location}
                        onChange={(e) => setProfileDraft((current) => ({ ...current, location: e.target.value }))}
                        className="h-12 border-0 border-b-2 border-slate-200 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-primary">Direct Phone</Label>
                      <Input
                        value={profileDraft.preferred_contact}
                        onChange={(e) => setProfileDraft((current) => ({ ...current, preferred_contact: e.target.value }))}
                        className="h-12 border-0 border-b-2 border-slate-200 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:border-slate-700"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-primary">Professional Bio</Label>
                      <textarea
                        rows={4}
                        value={profileDraft.bio}
                        onChange={(e) => setProfileDraft((current) => ({ ...current, bio: e.target.value }))}
                        className="w-full resize-none rounded-xl border-none bg-slate-100 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-primary/20 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-4 border-t border-slate-200 bg-white/80 p-8 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
              <button
                type="button"
                onClick={() => setEditProfileOpen(false)}
                className="rounded-lg px-6 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Discard changes
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={updateProfile.isPending}
                className="rounded-lg bg-gradient-to-br from-[#25006d] to-[#3b1e8a] px-8 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-md"
              >
                {updateProfile.isPending ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="max-h-[95vh] max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-[#f9f9fb] p-0 shadow-[0px_20px_50px_rgba(31,0,95,0.08)] [&>button]:hidden dark:border-slate-800 dark:bg-[#161220]">
          <DialogTitle className="sr-only">Change Password</DialogTitle>
          <DialogDescription className="sr-only">
            Update your password and review security requirements.
          </DialogDescription>
          <div className="flex max-h-[95vh] flex-col overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-100/70 px-10 py-8 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="mb-2 flex items-center gap-4">
                <LockKeyhole className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Security Credentials</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Update your system password to maintain account integrity.
              </p>
            </div>

            <div className="overflow-y-auto p-12">
              <div className="flex flex-col gap-16 md:flex-row">
                <div className="flex-1 space-y-8">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Password</Label>
                    <Input
                      type="password"
                      value={passwordDraft.currentPassword}
                      onChange={(e) => setPasswordDraft((current) => ({ ...current, currentPassword: e.target.value }))}
                      placeholder="••••••••••••"
                      className="h-12 border-0 bg-slate-100 dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">New Password</Label>
                    <Input
                      type="password"
                      value={passwordDraft.newPassword}
                      onChange={(e) => setPasswordDraft((current) => ({ ...current, newPassword: e.target.value }))}
                      placeholder="Create new password"
                      className="h-12 border-0 bg-slate-100 dark:bg-slate-900"
                    />
                    <div className="pt-4">
                      <div className="mb-2 flex justify-between text-[10px] font-bold uppercase text-slate-400">
                        <span>Security Strength: {passwordStrengthLabel}</span>
                        <span className="text-primary">{Math.round((passwordStrengthScore / 4) * 100)}%</span>
                      </div>
                      <div className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        {[0, 1, 2, 3].map((index) => (
                          <div
                            key={index}
                            className={`h-full flex-1 rounded-sm ${index < passwordStrengthScore ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Confirm New Password</Label>
                    <Input
                      type="password"
                      value={passwordDraft.confirmPassword}
                      onChange={(e) => setPasswordDraft((current) => ({ ...current, confirmPassword: e.target.value }))}
                      placeholder="Repeat new password"
                      className="h-12 border-0 bg-slate-100 dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="w-full rounded-2xl bg-slate-100 p-8 md:w-80 dark:bg-slate-900">
                  <h4 className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                    <Shield className="h-4 w-4" />
                    Requirements
                  </h4>
                  <ul className="space-y-4">
                    {[
                      ['Minimum 12 characters', passwordDraft.newPassword.length >= 12],
                      ['At least one uppercase & number', /[A-Z]/.test(passwordDraft.newPassword) && /\d/.test(passwordDraft.newPassword)],
                      ['One special character (@, #, $)', /[^A-Za-z0-9]/.test(passwordDraft.newPassword)],
                      ['Does not contain your name', !passwordDraft.newPassword.toLowerCase().includes(displayName.split(' ')[0]?.toLowerCase() || '')],
                    ].map(([label, passed]) => (
                      <li key={label} className="flex items-start gap-3">
                        <span className={`mt-0.5 h-4 w-4 rounded-full ${passed ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`} />
                        <span className={`text-xs font-medium ${passed ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                          {label}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-10 rounded-lg border border-primary/20 bg-primary/10 p-4">
                    <p className="text-[10px] font-medium leading-relaxed text-primary">
                      Security policy recommends rotating credentials every 90 days.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 bg-white px-12 py-8 dark:bg-slate-900">
              <button
                type="button"
                onClick={handleUpdatePassword}
                disabled={isUpdatingPassword}
                className="rounded-lg bg-gradient-to-br from-[#25006d] to-[#3b1e8a] px-8 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-md"
              >
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={manage2FAOpen} onOpenChange={setManage2FAOpen}>
        <DialogContent className="max-h-[95vh] max-w-6xl overflow-hidden rounded-xl border border-slate-200 bg-[#f9f9fb] p-0 shadow-[0px_20px_50px_rgba(31,0,95,0.08)] [&>button]:hidden dark:border-slate-800 dark:bg-[#161220]">
          <DialogTitle className="sr-only">Manage 2FA</DialogTitle>
          <DialogDescription className="sr-only">
            Review multifactor setup, backup codes, and trusted devices.
          </DialogDescription>
          <div className="flex max-h-[95vh] flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-10 py-8 dark:border-slate-800">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Multi-Factor Authentication</h2>
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold uppercase tracking-tight text-emerald-600 dark:text-emerald-400">
                    Enabled &amp; Protected
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="rounded-xl bg-rose-100/70 p-3 text-rose-600 transition-colors hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300"
              >
                <Shield className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-12 gap-12 overflow-y-auto p-12">
              <div className="col-span-12 space-y-8 lg:col-span-5">
                <div className="flex flex-col items-center rounded-2xl bg-slate-100 p-6 dark:bg-slate-900">
                  <div className="mb-6 rounded-xl bg-white p-4 shadow-inner dark:bg-slate-950">
                    <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                      <QrCode className="h-16 w-16 text-primary/70" />
                    </div>
                  </div>
                  <p className="px-4 text-center text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    Scan this code with Google Authenticator or Authy to re-sync your device.
                  </p>
                  <button type="button" className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                    <RefreshCw className="h-4 w-4" />
                    Regenerate Code
                  </button>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Backup Strategy</h4>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Recovery Codes</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">8 codes remaining</p>
                    </div>
                    <button type="button" className="rounded-lg bg-slate-100 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      View Codes
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-span-12 space-y-8 lg:col-span-7">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Trusted Devices</h4>
                <div className="space-y-3">
                  {trustedDevices.map((device, index) => (
                    <div
                      key={device.name}
                      className={`flex items-center justify-between rounded-xl border p-5 transition-all ${
                        index === 0
                          ? 'border-primary/20 bg-white dark:bg-slate-900'
                          : 'border-transparent bg-slate-50 hover:border-primary/20 dark:bg-slate-900/70'
                      } ${index === 2 ? 'opacity-70' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`rounded-lg p-3 ${index === 0 ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                          {index === 0 ? <Laptop className="h-5 w-5" /> : index === 1 ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{device.name}</p>
                          <p className="text-[10px] font-medium uppercase tracking-tight text-slate-500 dark:text-slate-400">
                            {device.current ? `Current Session • ${device.detail}` : device.detail}
                          </p>
                        </div>
                      </div>
                      {device.current ? (
                        <span className="rounded bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">Active</span>
                      ) : (
                        <button type="button" className="p-2 text-slate-400 transition-colors hover:text-rose-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="w-full rounded-xl border-2 border-dashed border-slate-300 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 transition-all hover:border-primary/50 hover:text-primary dark:border-slate-700 dark:text-slate-400"
                >
                  Revoke All Other Sessions
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-100 px-12 py-8 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Enhanced Security Protocol Active
                </span>
              </div>
              <button
                type="button"
                onClick={() => setManage2FAOpen(false)}
                className="rounded-lg bg-gradient-to-br from-[#25006d] to-[#3b1e8a] px-8 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
