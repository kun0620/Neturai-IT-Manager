import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold md:text-2xl">Welcome to Neturai IT Dashboard!</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {/* This section will display various summary data such as ticket count, server status */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-sm font-medium">Open Tickets</h3>
            <p className="text-2xl font-bold">12</p>
            <p className="text-xs text-muted-foreground">+2 from yesterday</p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-sm font-medium">Servers Online</h3>
            <p className="text-2xl font-bold">98%</p>
            <p className="text-xs text-muted-foreground">Excellent status</p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-sm font-medium">Active Users</h3>
            <p className="text-2xl font-bold">245</p>
            <p className="text-xs text-muted-foreground">+15 from last week</p>
          </div>
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <div className="lg:col-span-2 rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-lg font-semibold">Ticket Overview</h3>
            {/* Graph or table showing tickets */}
            <p className="text-muted-foreground">Latest ticket information will be displayed here.</p>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <h3 className="text-lg font-semibold">Notifications</h3>
            {/* List of notifications */}
            <ul className="mt-4 space-y-2">
              <li><span className="font-medium">Alert:</span> Server #123 has an issue</li>
              <li><span className="font-medium">Update:</span> Ticket #456 has been resolved</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
