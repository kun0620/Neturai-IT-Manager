import React, { useState, useEffect } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { format } from 'date-fns';

// --- General Settings Tab ---
const GeneralSettingsTab: React.FC = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [defaultSLA, setDefaultSLA] = useState('24'); // Default to 24 hours

  const handleSave = () => {
    // In a real app, you would save these settings to Supabase or an API
    console.log('Saving General Settings:', { emailNotifications, defaultSLA });
    // Example: supabase.from('settings').update({ email_notifications: emailNotifications, default_sla: defaultSLA });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Settings</CardTitle>
        <CardDescription>Manage application-wide settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="email-notifications">Email Notifications</Label>
          <Switch
            id="email-notifications"
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="default-sla">Default SLA (hours)</Label>
          <Input
            id="default-sla"
            type="number"
            value={defaultSLA}
            onChange={(e) => setDefaultSLA(e.target.value)}
            placeholder="e.g., 24"
          />
        </div>
        <Button onClick={handleSave}>Save Changes</Button>
      </CardContent>
    </Card>
  );
};

// --- Categories Tab ---
interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

const CategoryManagementTab: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true });
    if (error) {
      console.error('Error fetching categories:', error);
    } else {
      setCategories(data || []);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const { error } = await supabase.from('categories').insert({
      name: newCategoryName,
      description: newCategoryDescription,
    });
    if (error) {
      console.error('Error adding category:', error);
    } else {
      setNewCategoryName('');
      setNewCategoryDescription('');
      fetchCategories();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      console.error('Error deleting category:', error);
    } else {
      fetchCategories();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Management</CardTitle>
        <CardDescription>Manage issue categories for tickets.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row">
          <Input
            placeholder="New Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Description (optional)"
            value={newCategoryDescription}
            onChange={(e) => setNewCategoryDescription(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleAddCategory}>Add Category</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No categories found.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.description || '-'}</TableCell>
                  <TableCell>{format(new Date(category.created_at), 'PPP')}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// --- SLA Configuration Tab ---
interface SLAPolicy {
  id: string;
  priority: string;
  response_time_hours: number;
  resolution_time_hours: number;
  created_at: string;
}

const SlaConfigurationTab: React.FC = () => {
  const [slaPolicies, setSlaPolicies] = useState<SLAPolicy[]>([]);
  const [newPriority, setNewPriority] = useState('');
  const [newResponseTime, setNewResponseTime] = useState('');
  const [newResolutionTime, setNewResolutionTime] = useState('');

  useEffect(() => {
    fetchSlaPolicies();
  }, []);

  const fetchSlaPolicies = async () => {
    const { data, error } = await supabase.from('sla_policies').select('*').order('priority', { ascending: true });
    if (error) {
      console.error('Error fetching SLA policies:', error);
    } else {
      setSlaPolicies(data || []);
    }
  };

  const handleAddSlaPolicy = async () => {
    if (!newPriority.trim() || !newResponseTime || !newResolutionTime) return;
    const { error } = await supabase.from('sla_policies').insert({
      priority: newPriority,
      response_time_hours: parseInt(newResponseTime),
      resolution_time_hours: parseInt(newResolutionTime),
    });
    if (error) {
      console.error('Error adding SLA policy:', error);
    } else {
      setNewPriority('');
      setNewResponseTime('');
      setNewResolutionTime('');
      fetchSlaPolicies();
    }
  };

  const handleDeleteSlaPolicy = async (id: string) => {
    const { error } = await supabase.from('sla_policies').delete().eq('id', id);
    if (error) {
      console.error('Error deleting SLA policy:', error);
    } else {
      fetchSlaPolicies();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SLA Configuration</CardTitle>
        <CardDescription>Define Service Level Agreement policies.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row">
          <Input
            placeholder="Priority (e.g., High, Medium)"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Response Time (hours)"
            value={newResponseTime}
            onChange={(e) => setNewResponseTime(e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            placeholder="Resolution Time (hours)"
            value={newResolutionTime}
            onChange={(e) => setNewResolutionTime(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleAddSlaPolicy}>Add Policy</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Priority</TableHead>
              <TableHead>Response Time (hours)</TableHead>
              <TableHead>Resolution Time (hours)</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slaPolicies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No SLA policies found.
                </TableCell>
              </TableRow>
            ) : (
              slaPolicies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">{policy.priority}</TableCell>
                  <TableCell>{policy.response_time_hours}</TableCell>
                  <TableCell>{policy.resolution_time_hours}</TableCell>
                  <TableCell>{format(new Date(policy.created_at), 'PPP')}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteSlaPolicy(policy.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// --- Logs Tab ---
interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
}

const SystemLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    fetchLogs();

    // Setup Realtime subscription
    const logsChannel = supabase
      .channel('public:logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'logs' },
        (payload) => {
          console.log('Change received!', payload);
          if (payload.eventType === 'INSERT') {
            setLogs((prevLogs) => [payload.new as LogEntry, ...prevLogs]);
          } else if (payload.eventType === 'DELETE') {
            setLogs((prevLogs) => prevLogs.filter((log) => log.id !== (payload.old as LogEntry).id));
          }
          // For UPDATE, you might want to refetch or update specific log entry
        }
      )
      .subscribe();

    setChannel(logsChannel);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []); // Empty dependency array to run once on mount

  const fetchLogs = async () => {
    const { data, error } = await supabase.from('logs').select('*').order('timestamp', { ascending: false }).limit(50); // Limit to 50 recent logs
    if (error) {
      console.error('Error fetching logs:', error);
    } else {
      setLogs(data || []);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Activity Logs</CardTitle>
        <CardDescription>View real-time system activity and events.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No system logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{format(new Date(log.timestamp), 'PPP HH:mm:ss')}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        log.level === 'ERROR'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : log.level === 'WARN'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : log.level === 'INFO'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {log.level}
                    </span>
                  </TableCell>
                  <TableCell>{log.message}</TableCell>
                  <TableCell>
                    {log.metadata ? (
                      <pre className="text-xs bg-muted p-1 rounded max-h-20 overflow-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export const SettingsAndLogs: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings & Logs</h1>
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="sla">SLA</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <GeneralSettingsTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoryManagementTab />
        </TabsContent>
        <TabsContent value="sla">
          <SlaConfigurationTab />
        </TabsContent>
        <TabsContent value="logs">
          <SystemLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
