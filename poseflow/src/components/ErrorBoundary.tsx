// ErrorBoundary.tsx - Перехват ошибок для диагностики
import { Component, ErrorInfo, ReactNode } from 'react';
import { errorLogger } from '../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorMessage = `React Error Boundary caught: ${error.message}`;
    console.error('[ErrorBoundary]', errorMessage, error, errorInfo);

    errorLogger.error(errorMessage, {
      componentStack: errorInfo.componentStack,
      errorStack: error.stack,
      errorName: error.name,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: '20px',
            background: '#1a1a1a',
            color: '#ff4444',
            fontFamily: 'monospace',
            maxHeight: '100vh',
            overflow: 'auto',
          }}
        >
          <h2>❌ Ошибка в приложении</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
              <strong>Показать детали</strong>
            </summary>
            <p>
              <strong>Сообщение:</strong> {this.state.error?.message}
            </p>
            <p>
              <strong>Стек:</strong>
            </p>
            <code
              style={{
                display: 'block',
                background: '#2d2d2d',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                maxHeight: '400px',
                overflow: 'auto',
              }}
            >
              {this.state.error?.stack}
            </code>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
