import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';
import { useRoles } from '@/hooks/useRoles';
import { useToast } from '@/hooks/use-toast'; // Corrected import path

type UserWithRole = Tables<'users'> & {
  roles: Tables<'roles'> | null;
};

interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserWithRole;
  onSuccess: () => void;
}

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  role_id: z.string().uuid({ message: 'Invalid role selected.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }).optional().or(z.literal('')),
});

export const UserFormDialog: React.FC<UserFormDialogProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { data: roles, isLoading: isLoadingRoles } = useRoles();
  const { toast: shadcnToast } = useToast(); // Renamed to avoid conflict with sonner.toast

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      role_id: user?.role_id || '',
      password: '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        role_id: user.role_id || '',
        password: '',
      });
    } else {
      form.reset({
        name: '',
        email: '',
        role_id: '',
        password: '',
      });
    }
  }, [user, form]);

  const createUserMutation = useMutation({
    mutationFn: async (newUser: z.infer<typeof formSchema>) => {
      const { password, ...userData } = newUser;
      const { data, error: edgeFunctionError } = await supabase.functions.invoke('create-user', {
        body: JSON.stringify({ ...userData, password }),
      });

      if (edgeFunctionError) throw edgeFunctionError;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User Created', {
        description: 'The new user has been successfully added.',
      });
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to Create User', {
        description: error.message,
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (updatedUser: z.infer<typeof formSchema>) => {
      if (!user?.id) throw new Error('User ID is missing for update.');
      const { password, ...userData } = updatedUser;

      // Update user in public.users table
      const { error: userUpdateError } = await supabase
        .from('users')
        .update(userData)
        .eq('id', user.id);

      if (userUpdateError) throw userUpdateError;

      // If password is provided, update auth user password via edge function
      if (password) {
        const { data, error: edgeFunctionError } = await supabase.functions.invoke('update-user-password', {
          body: JSON.stringify({ userId: user.id, newPassword: password }),
        });
        if (edgeFunctionError) throw edgeFunctionError;
        if (data.error) throw new Error(data.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User Updated', {
        description: 'The user details have been successfully updated.',
      });
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to Update User', {
        description: error.message,
      });
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (user) {
      updateUserMutation.mutate(values);
    } else {
      createUserMutation.mutate(values);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogDescription>
            {user
              ? 'Make changes to the user profile here. Click save when you\'re done.'
              : 'Create a new user account. Fill in the details below.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john.doe@example.com" {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingRoles ? (
                        <SelectItem value="loading" disabled>
                          Loading roles...
                        </SelectItem>
                      ) : (
                        roles?.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password {user && '(Leave blank to keep current)'}</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••••" {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={createUserMutation.isPending || updateUserMutation.isPending}
            >
              {user
                ? updateUserMutation.isPending
                  ? 'Saving...'
                  : 'Save Changes'
                : createUserMutation.isPending
                ? 'Creating...'
                : 'Create User'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
