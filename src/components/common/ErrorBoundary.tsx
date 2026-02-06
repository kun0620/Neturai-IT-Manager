import React from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-md rounded-lg border bg-card p-6 shadow-sm text-center space-y-3">
            <div className="text-lg font-semibold">
              {this.props.fallbackTitle ?? 'Something went wrong'}
            </div>
            <div className="text-sm text-muted-foreground">
              {this.props.fallbackMessage ??
                'Please refresh the page and try again.'}
            </div>
            <Button onClick={this.handleReload}>Reload</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
