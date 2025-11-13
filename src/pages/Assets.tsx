import React from 'react';

export function Assets() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <h1 className="text-3xl font-bold tracking-tight">Asset Management</h1>
      <p className="text-muted-foreground">
        This page will display a list of assets, their details, and repair history.
      </p>
      {/* Placeholder for Asset Management content */}
      <div className="flex items-center justify-center h-64 border border-dashed rounded-lg text-muted-foreground">
        <p>Asset Management features coming soon!</p>
      </div>
    </div>
  );
}
