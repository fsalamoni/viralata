import React, { useState } from 'react';
import ThreadList from './forum/ThreadList';
import ThreadDetail from './forum/ThreadDetail';
import CreateThread from './forum/CreateThread';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { toast } from 'sonner';

export default function ForumTab({ communityId }) {
  const { user } = useAuth();
  const [view, setView] = useState('list'); // 'list', 'create', 'detail'
  const [selectedThread, setSelectedThread] = useState(null);

  const handleCreateThread = () => {
    if (!user) return toast.error('Faça login para criar um tópico');
    setView('create');
  };

  const handleSelectThread = (thread) => {
    setSelectedThread(thread);
    setView('detail');
  };

  const handleBack = () => {
    setView('list');
    setSelectedThread(null);
  };

  const handleThreadCreated = () => {
    setView('list');
  };

  if (view === 'create') {
    return <CreateThread communityId={communityId} onBack={handleBack} onCreated={handleThreadCreated} />;
  }

  if (view === 'detail' && selectedThread) {
    return <ThreadDetail thread={selectedThread} communityId={communityId} onBack={handleBack} />;
  }

  return (
    <ThreadList
      communityId={communityId}
      onSelectThread={handleSelectThread}
      onCreateThread={handleCreateThread}
    />
  );
}
