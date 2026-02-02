import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <Header />

        <main className="grid flex-1 items-start gap-4 bg-background p-4 sm:px-6 sm:py-0 md:gap-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
