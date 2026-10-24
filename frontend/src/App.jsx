import React, { useState, useEffect } from 'react';
import LandingExperience from './components/LandingExperience';
import PresenterCockpit from './components/PresenterCockpit';
import AudienceWorkspace from './components/AudienceWorkspace';

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
      <PresenterCockpit
        roomCode={roomCode}
        onLeave={handleLeaveSession}
      />
    );
  }

  if (view === 'audience') {
    return (
      <AudienceWorkspace
        roomCode={roomCode}
        onLeave={handleLeaveSession}
      />
    );
  }

  return (
    <LandingExperience
      onStartHost={handleStartHost}
      onJoinAudience={handleJoinAudience}
    />
  );
}
