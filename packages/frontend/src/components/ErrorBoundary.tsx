import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  /** Identifier shown in the fallback so the user can tell support which page broke. */
  scope?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches uncaught render/effect errors in its subtree. Without this, a single
 * page-level bug (undefined access on socket payload, parse failure, etc.)
 * unmounts the whole React tree and leaves the user with a blank document.
 *
 * Place at App root for catastrophic failures and around the route outlet so
 * a broken page doesn't kill the sidebar/channel-switcher.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log to console so it's available in DevTools; production builds should
    // wire this to a real error reporter (Sentry/etc) later.
    console.error("ErrorBoundary caught:", error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="dark flex h-full flex-col items-center justify-center gap-4 bg-background p-6 text-foreground" role="alert">
        <div className="max-w-lg space-y-4 text-center">
          <h2 className="text-xl font-semibold text-destructive">Diese Seite ist abgestürzt</h2>
          <p className="text-sm text-muted-foreground">
            Ein unerwarteter Fehler ist aufgetreten{this.props.scope ? ` in: ${this.props.scope}` : ""}.
            Du kannst die Seite neu laden oder über die Sidebar weiterarbeiten.
          </p>
          <pre className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-left text-xs text-destructive overflow-auto max-h-48">
            {this.state.error.message}
          </pre>
          <div className="flex justify-center gap-2">
            <button
              onClick={this.reset}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent"
            >
              Erneut versuchen
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              Seite neu laden
            </button>
          </div>
        </div>
      </div>
    );
  }
}
