import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Terminal, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error, 
      errorInfo: null, 
      copied: false 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary captured uncaught React exception:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false
    });
    window.location.reload();
  };

  private handleCopy = () => {
    if (!this.state.error) return;
    const errorText = `${this.state.error.toString()}\n\nStack:\n${this.state.error.stack || ''}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || ''}`;
    navigator.clipboard.writeText(errorText);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07090D] flex flex-col items-center justify-center p-6 text-gray-100 font-sans selection:bg-red-500/30 select-none relative overflow-hidden">
          {/* Ambient error background glow */}
          <div className="absolute w-[500px] h-[500px] rounded-full bg-rose-500/5 filter blur-[120px] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          
          <div className="w-full max-w-2xl glass-panel p-8 rounded-2xl border border-rose-500/30 shadow-[0_0_30px_rgba(239,68,68,0.06)] relative z-10 flex flex-col items-center text-center">
            
            {/* Error badge */}
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-950/20 border border-rose-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)] mb-6">
              <AlertCircle className="w-8 h-8 text-rose-400 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
            </div>

            <h2 className="text-2xl font-bold text-white tracking-wide font-sans">
              Something went wrong
            </h2>
            <p className="text-sm text-cyber-gray font-light mt-2.5 max-w-md">
              A runtime rendering exception or operational telemetry outage occurred. The diagnostic agent has successfully intercepted and captured this event.
            </p>

            {/* Error trace box */}
            <div className="w-full mt-6 rounded-xl bg-black/60 border border-cyber-border/40 p-4 font-mono text-[10px] text-left relative flex flex-col max-h-56 overflow-hidden">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyber-border/20 text-cyber-gray">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-semibold text-rose-300">DIAGNOSTIC TELEMETRY REPORT</span>
                </div>
                <button
                  onClick={this.handleCopy}
                  className="px-2 py-1 rounded bg-cyber-dark hover:bg-cyber-dark/80 text-cyber-gray hover:text-white border border-cyber-border flex items-center space-x-1 transition-all"
                >
                  {this.state.copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar text-rose-400/90 whitespace-pre-wrap leading-relaxed">
                {this.state.error?.toString()}
                {this.state.error?.stack && `\n\n${this.state.error.stack}`}
                {this.state.errorInfo?.componentStack && `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}`}
              </div>
            </div>

            {/* Recovery actions */}
            <div className="mt-8 flex w-full justify-center">
              <button
                onClick={this.handleReset}
                className="py-2.5 px-6 rounded-xl border border-rose-500/40 bg-rose-950/15 hover:bg-rose-900/20 text-rose-300 font-semibold text-xs tracking-wider uppercase transition-all duration-300 flex items-center space-x-2 shadow-[0_0_12px_rgba(244,63,94,0.05)]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Dashboard</span>
              </button>
            </div>
            
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
