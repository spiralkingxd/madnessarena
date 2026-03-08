import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-ocean flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-ocean-lighter border border-red-500/30 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-serif font-bold text-red-400 mb-4">Ops! Algo deu errado.</h2>
            <p className="text-parchment-muted mb-6">
              Ocorreu um erro inesperado na interface. Tente recarregar a página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg font-bold transition-colors"
            >
              Recarregar Página
            </button>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 p-4 bg-black/50 rounded-lg text-left text-xs text-red-300 overflow-auto">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
