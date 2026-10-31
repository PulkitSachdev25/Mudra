import React, { useState, useEffect } from 'react';
import LandingExperience from './components/LandingExperience';
import PresenterCockpit from './components/PresenterCockpit';
import AudienceWorkspace from './components/AudienceWorkspace';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary captured error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#060709] text-zinc-200 flex flex-col items-center justify-center p-6 text-center">
          <div className="p-8 rounded-2xl bg-zinc-950 border border-zinc-800 max-w-md w-full shadow-2xl space-y-4">
            <div className="font-mono text-xs text-rose-400 tracking-wider uppercase">[RUNTIME_EXCEPTION]</div>
            <h2 className="text-lg font-bold text-white">Application Exception</h2>
            <p className="text-xs text-zinc-400 font-mono break-words">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) this.props.onReset();
                else window.location.href = '/';
              }}
              className="px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'presenter' | 'audience'
  const [roomCode, setRoomCode] = useState('');

  useEffect(() => {
    // Check path or query parameters for quick routing
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const queryRoom = params.get('room');

    if (path.includes('/audience') || params.get('view') === 'audience') {
      setView('audience');
      if (queryRoom) setRoomCode(queryRoom);
    } else if (params.get('view') === 'presenter') {
      setView('presenter');
      if (queryRoom) setRoomCode(queryRoom);
    }
  }, []);

  const handleStartHost = (code) => {
    setRoomCode(code);
    setView('presenter');
  };

  const handleJoinAudience = (code) => {
    setRoomCode(code);
    setView('audience');
  };

  const handleLeaveSession = () => {
    setView('landing');
    setRoomCode('');
    window.history.pushState({}, '', '/');
  };

  if (view === 'presenter') {
    return (
      <ErrorBoundary onReset={handleLeaveSession}>
        <PresenterCockpit
          roomCode={roomCode}
          onLeave={handleLeaveSession}
        />
      </ErrorBoundary>
    );
  }

  if (view === 'audience') {
    return (
      <ErrorBoundary onReset={handleLeaveSession}>
        <AudienceWorkspace
          roomCode={roomCode}
          onLeave={handleLeaveSession}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary onReset={handleLeaveSession}>
      <LandingExperience
        onStartHost={handleStartHost}
        onJoinAudience={handleJoinAudience}
      />
    </ErrorBoundary>
  );
}
