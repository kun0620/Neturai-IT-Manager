import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious, PaginationLink } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/components/theme-provider';
import { useSettings } from '@/hooks/useSettings';
import { useCategories } from '@/hooks/useCategories';
import { useSLAPolicies } from '@/hooks/useSLAPolicies';
import { useLogs } from '@/hooks/useLogs';
import { useUsersForAssignment } from '@/hooks/useUsers';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { Search } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { format } from 'date-fns';

export const SettingsAndLogs: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme(); // Keep setTheme for displaying current theme
  const { toast } = useToast();

  const { data: settings, isLoading: isLoadingSettings } = useSettings();
  const { data: categories, isLoading: isLoadingCategories } = useCategories();
  const { data: slaPolicies, isLoading: isLoadingSLAPolicies } = useSLAPolicies();
  const { data: usersForAssignment, isLoading: isLoadingUsersForAssignment } = useUsersForAssignment();

  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [defaultAssigneeName, setDefaultAssigneeName] = useState<string | null>(null);
  const [defaultThemeDisplay, setDefaultThemeDisplay] = useState<string>('system');

  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logPage, setLogPage] = useState(1);
  const logsPerPage = 10;
  const { data: logs, isLoading: isLoadingLogs, refetch: refetchLogs } = useLogs(logPage, logsPerPage, logSearchTerm);

  useEffect(() => {
    if (settings) {
      setEmailNotificationsEnabled(settings.find(s => s.key === 'email_notifications_enabled')?.value === 'true');
      const assigneeId = settings.find(s => s.key === 'default_assignee_id')?.value;
      if (assigneeId && usersForAssignment) {
        const assignee = usersForAssignment.find(u => u.id === assigneeId);
        setDefaultAssigneeName(assignee ? (assignee.name || assignee.email) : 'Unknown User');
      } else {
        setDefaultAssigneeName('No Default');
      }
      setDefaultThemeDisplay(settings.find(s => s.key === 'theme_default')?.value || 'system');
    }
  }, [settings, usersForAssignment]);

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
              <span className="font-medium">
                {emailNotificationsEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-assignee" className="text-base">
                Default Assignee
                <p className="text-sm text-muted-foreground">Automatically assign new tickets to this user.</p>
              </Label>
              <span className="font-medium block">
                {defaultAssigneeName}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-theme" className="text-base">
                Default Theme
                <p className="text-sm text-muted-foreground">Set the default theme for the application.</p>
              </Label>
              <span className="font-medium block">
                {defaultThemeDisplay.charAt(0).toUpperCase() + defaultThemeDisplay.slice(1)}
              </span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-4 p-4 border rounded-md bg-card text-card-foreground shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Issue Categories</h2>
          {categories && categories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="No Categories Found"
              description="No issue categories have been defined."
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {slaPolicies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">{policy.priority}</TableCell>
                    <TableCell>{policy.response_time_hours}</TableCell>
                    <TableCell>{policy.resolution_time_hours}</TableCell>
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
