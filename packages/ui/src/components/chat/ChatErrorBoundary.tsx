import React from 'react';
import { RiChat3Line, RiRestartLine } from '@remixicon/react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface ChatErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ChatErrorBoundaryProps {
  children: React.ReactNode;
  sessionId?: string;
}

export class ChatErrorBoundary extends React.Component<ChatErrorBoundaryProps, ChatErrorBoundaryState> {
  constructor(props: ChatErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ChatErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });

    if (process.env.NODE_ENV === 'development') {
      console.error('Chat error caught by boundary:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                聊天错误
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                聊天界面遇到错误。这可能是由于临时的网络问题或损坏的消息数据所致。
              </p>

              {this.props.sessionId && (
                <div>
                  会话: {this.props.sessionId}
                </div>
              )}

              {this.state.error && (
                <details>
                  <summary className="cursor-pointer hover:bg-interactive-hover/80">错误详情</summary>
                  <pre className="mt-2 overflow-x-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="outline" className="flex-1">
                  重置聊天
                </Button>
              </div>

              <p className="text-muted-foreground text-sm">
                如果问题持续存在，请尝试刷新页面。
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
