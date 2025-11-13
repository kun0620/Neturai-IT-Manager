import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious, PaginationLink } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/components/theme-provider';
import { useSettings, useUpdateSetting } from '@/hooks/useSettings';
import { useCategories, useAddCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories';
import { useSLAPolicies, useUpdateSLAPolicy } from '@/hooks/useSLAPolicies';
import { useLogs } from '@/hooks/useLogs';
import { useUsersForAssignment } from '@/hooks/useUsers';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { PlusCircle, Search, Edit, Trash2, Save } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { format } from 'date-fns';

export const SettingsAndLogs: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const { data: settings, isLoading: isLoadingSettings, refetch: refetchSettings } = useSettings();
  const { mutate: updateSetting } = useUpdateSetting();

  const { data: categories, isLoading: isLoadingCategories, refetch: refetchCategories } = useCategories();
  const { mutate: addCategory } = useAddCategory();
  const { mutate: updateCategory } = useUpdateCategory();
  const { mutate: deleteCategory } = useDeleteCategory();

  const { data: slaPolicies, isLoading: isLoadingSLAPolicies, refetch: refetchSLAPolicies } = useSLAPolicies();
  const { mutate: updateSLAPolicy } = useUpdateSLAPolicy();

  const { data: usersForAssignment, isLoading: isLoadingUsersForAssignment } = useUsersForAssignment();

  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [defaultAssigneeId, setDefaultAssigneeId] = useState<string | null>(null);
  const [defaultTheme, setDefaultTheme] = useState<string>('system');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Tables<'ticket_categories'> | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState('');

  const [editingSLAPolicy, setEditingSLAPolicy] = useState<Tables<'sla_policies'> | null>(null);
  const [editedResponseTime, setEditedResponseTime] = useState<number>(0);
  const [editedResolutionTime, setEditedResolutionTime] = useState<number>(0);

  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logPage, setLogPage] = useState(1);
  const logsPerPage = 10;
  const { data: logs, isLoading: isLoadingLogs, refetch: refetchLogs } = useLogs(logPage, logsPerPage, logSearchTerm);

  useEffect(() => {
    if (settings) {
      setEmailNotificationsEnabled(settings.find(s => s.key === 'email_notifications_enabled')?.value === 'true');
      setDefaultAssigneeId(settings.find(s => s.key === 'default_assignee_id')?.value || null);
      setDefaultTheme(settings.find(s => s.key === 'theme_default')?.value || 'system');
    }
  }, [settings]);

  const handleSaveGeneralSettings = () => {
    updateSetting({ key: 'email_notifications_enabled', value: String(emailNotificationsEnabled) }, {
      onSuccess: () => toast({ title: 'Settings updated', description: 'Email notifications setting saved.' }),
      onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
    });
    updateSetting({ key: 'default_assignee_id', value: defaultAssigneeId || '' }, {
      onSuccess: () => toast({ title: 'Settings updated', description: 'Default assignee setting saved.' }),
      onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
    });
    updateSetting({ key: 'theme_default', value: defaultTheme }, {
      onSuccess: () => {
        setTheme(defaultTheme);
        toast({ title: 'Settings updated', description: 'Default theme setting saved.' });
      },
      onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
    });
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast({ title: 'Error', description: 'Category name cannot be empty.', variant: 'destructive' });
      return;
    }
    addCategory({ name: newCategoryName.trim() }, {
      onSuccess: () => {
        toast({ title: 'Success', description: 'Category added successfully.' });
        setNewCategoryName('');
        refetchCategories();
      },
      onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
    });
  };

  const handleEditCategory = (category: Tables<'ticket_categories'>) => {
    setEditingCategory(category);
    setEditedCategoryName(category.name);
  };

  const handleSaveEditedCategory = () => {
    if (!editingCategory || !editedCategoryName.trim()) {
      toast({ title: 'Error', description: 'Category name cannot be empty.', variant: 'destructive' });
      return;
    }
    updateCategory({ id: editingCategory.id, name: editedCategoryName.trim() }, {
      onSuccess: () => {
        toast({ title: 'Success', description: 'Category updated successfully.' });
        setEditingCategory(null);
        setEditedCategoryName('');
        refetchCategories();
      },
      onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
    deleteCategory(categoryId, {
      onSuccess: () => {
        toast({ title: 'Success', description: 'Category deleted successfully.' });
        refetchCategories();
      },
      onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
    });
  };

  const handleEditSLAPolicy = (policy: Tables<'sla_policies'>) => {
    setEditingSLAPolicy(policy);
    setEditedResponseTime(policy.response_time_hours);
    setEditedResolutionTime(policy.resolution_time_hours);
  };

  const handleSaveEditedSLAPolicy = () => {
    if (!editingSLAPolicy) return;
    updateSLAPolicy({
      id: editingSLAPolicy.id,
      response_time_hours: editedResponseTime,
      resolution_time_hours: editedResolutionTime,
    }, {
      onSuccess: () => {
        toast({ title: 'Success', description: 'SLA Policy updated successfully.' });
        setEditingSLAPolicy(null);
        refetchSLAPolicies();
      },
      onError: (error) => toast({ title: 'Error', description: error.message, variant: 'destructive' }),
    });
  };

  const handleLogSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLogPage(1); // Reset to first page on new search
    refetchLogs();
  };

  const totalLogPages = logs ? Math.ceil(logs.count / logsPerPage) : 0;

  if (isLoadingSettings || isLoadingCategories || isLoadingSLAPolicies || isLoadingUsersForAssignment || isLoadingLogs) {
    return <LoadingSpinner className="h-full" />;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Settings & System Logs</h1>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="sla">SLA Policies</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 p-4 border rounded-md bg-card text-card-foreground shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">General Settings</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications" className="text-base">
                Email Notifications
                <p className="text-sm text-muted-foreground">Enable or disable email notifications for ticket updates.</p>
              </Label>
              <Switch
                id="email-notifications"
                checked={emailNotificationsEnabled}
                onCheckedChange={setEmailNotificationsEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-assignee" className="text-base">
                Default Assignee
                <p className="text-sm text-muted-foreground">Automatically assign new tickets to this user.</p>
              </Label>
              <Select
                value={defaultAssigneeId || ''}
                onValueChange={setDefaultAssigneeId}
              >
                <SelectTrigger id="default-assignee" className="w-[240px]">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Default</SelectItem>
                  {usersForAssignment?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-theme" className="text-base">
                Default Theme
                <p className="text-sm text-muted-foreground">Set the default theme for the application.</p>
              </Label>
              <Select
                value={defaultTheme}
                onValueChange={setDefaultTheme}
              >
                <SelectTrigger id="default-theme" className="w-[240px]">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSaveGeneralSettings} className="mt-4">
              <Save className="mr-2 h-4 w-4" /> Save General Settings
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-4 p-4 border rounded-md bg-card text-card-foreground shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Manage Issue Categories</h2>
          <div className="flex space-x-2 mb-4">
            <Input
              placeholder="New category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddCategory}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </div>

          {categories && categories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  <TableHead className="w-[150px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {editingCategory?.id === category.id ? (
                        <Input
                          value={editedCategoryName}
                          onChange={(e) => setEditedCategoryName(e.target.value)}
                        />
                      ) : (
                        category.name
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingCategory?.id === category.id ? (
                        <Button variant="ghost" size="sm" onClick={handleSaveEditedCategory}>
                          <Save className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleEditCategory(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the category
                              <span className="font-bold"> {category.name}</span>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="No Categories Found"
              description="Start by adding new issue categories to organize your tickets."
            />
          )}
        </TabsContent>

        <TabsContent value="sla" className="mt-4 p-4 border rounded-md bg-card text-card-foreground shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">SLA Policies</h2>
          {slaPolicies && slaPolicies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Response Time (Hours)</TableHead>
                  <TableHead>Resolution Time (Hours)</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slaPolicies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">{policy.priority}</TableCell>
                    <TableCell>
                      {editingSLAPolicy?.id === policy.id ? (
                        <Input
                          type="number"
                          value={editedResponseTime}
                          onChange={(e) => setEditedResponseTime(Number(e.target.value))}
                          min="0"
                        />
                      ) : (
                        policy.response_time_hours
                      )}
                    </TableCell>
                    <TableCell>
                      {editingSLAPolicy?.id === policy.id ? (
                        <Input
                          type="number"
                          value={editedResolutionTime}
                          onChange={(e) => setEditedResolutionTime(Number(e.target.value))}
                          min="0"
                        />
                      ) : (
                        policy.resolution_time_hours
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingSLAPolicy?.id === policy.id ? (
                        <Button variant="ghost" size="sm" onClick={handleSaveEditedSLAPolicy}>
                          <Save className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleEditSLAPolicy(policy)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="No SLA Policies Found"
              description="SLA policies define response and resolution times based on ticket priority."
            />
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4 p-4 border rounded-md bg-card text-card-foreground shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">System Logs</h2>
          <form onSubmit={handleLogSearch} className="flex space-x-2 mb-4">
            <Input
              placeholder="Search logs..."
              value={logSearchTerm}
              onChange={(e) => setLogSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </form>

          {logs && logs.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.data.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                      <TableCell>{log.users?.name || log.users?.email || 'N/A'}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setLogPage(prev => Math.max(1, prev - 1))}
                      disabled={logPage === 1}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalLogPages }, (_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => setLogPage(i + 1)}
                        isActive={logPage === i + 1}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setLogPage(prev => Math.min(totalLogPages, prev + 1))}
                      disabled={logPage === totalLogPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </>
          ) : (
            <EmptyState
              title="No System Logs Found"
              description="System logs will appear here when actions are performed."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
