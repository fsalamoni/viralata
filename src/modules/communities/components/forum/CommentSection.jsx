import React, { useState, useEffect } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useProfile } from '@/core/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Heart, Trash2, User, Loader2, Paperclip, ListPlus } from 'lucide-react';
import { getThreadMessages, addThreadMessage, deleteThreadMessage, toggleMessageLike, getMessageLikes } from '../../services/communityService';
import { toast } from 'sonner';
import PollComponent from './PollComponent';
import AttachmentRenderer from './AttachmentRenderer';
import { uploadFile } from '@/core/lib/firebaseStorage';
import MarkdownContent from '@/components/ui/markdown-content';

function MessageItem({ message, threadId, onDeleted }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState([]);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    getMessageLikes(message.id).then(likesIds => {
      setLikes(likesIds);
      if (user) setIsLiked(likesIds.includes(user.uid));
    });
  }, [message.id, user]);

  const handleLike = async () => {
    if (!user) return toast.error('Faça login para curtir');
    const currentlyLiked = isLiked;
    setIsLiked(!currentlyLiked);
    setLikes(prev => currentlyLiked ? prev.filter(id => id !== user.uid) : [...prev, user.uid]);
    try {
      await toggleMessageLike(message.id, user.uid);
    } catch (e) {
      setIsLiked(currentlyLiked);
      setLikes(prev => currentlyLiked ? [...prev, user.uid] : prev.filter(id => id !== user.uid));
    }
  };

  const handleDelete = async () => {
    if (!confirm('Excluir este comentário?')) return;
    try {
      await deleteThreadMessage(message.id, threadId);
      onDeleted();
    } catch (e) {
      toast.error('Erro ao excluir');
    }
  };

  return (
    <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {message.author_photo ? (
            <img src={message.author_photo} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><User className="w-4 h-4" /></div>
          )}
          <div>
            <p className="font-semibold text-sm">{message.author_name}</p>
            <p className="text-xs text-muted-foreground">
              {message.created_at ? formatDistanceToNow(message.created_at.toDate(), { addSuffix: true, locale: ptBR }) : ''}
            </p>
          </div>
        </div>
        {user && user.uid === message.author_id && (
          <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none mt-2">
        <MarkdownContent>{message.text}</MarkdownContent>
      </div>

      <AttachmentRenderer attachments={message.attachments} />

        {message.poll && (
          <div className="mt-4 border border-border/50 rounded-lg p-4 bg-secondary/10">
            <PollComponent entityType="message" entityId={message.id} poll={message.poll} />
          </div>
        )}

      <div className="mt-3 flex items-center">
        <Button variant="ghost" size="sm" onClick={handleLike} className={`h-8 px-2 text-xs ${isLiked ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground'}`}>
          <Heart className={`w-3 h-3 mr-1 ${isLiked ? 'fill-current' : ''}`} /> {likes.length}
        </Button>
      </div>
    </div>
  );
}

export default function CommentSection({ threadId }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Attachment state
  const [files, setFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Poll state
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    setUploadingFiles(true);
    try {
      const uploadedFiles = await Promise.all(selectedFiles.map(async (file) => {
        const path = `uploads/${user.uid}/forum/${Date.now()}_${file.name}`;
        const url = await uploadFile(path, file);
        return { name: file.name, url, type: file.type };
      }));
      setFiles(prev => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao fazer upload de arquivos. Arquivos devem ter menos de 25MB.');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addPollOption = () => setPollOptions(prev => [...prev, '']);
  const updatePollOption = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };
  const removePollOption = (index) => {
    setPollOptions(prev => prev.filter((_, i) => i !== index));
  };


  const fetchMessages = async () => {
    try {
      const data = await getThreadMessages(threadId);
      setMessages(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [threadId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    let pollData = null;
    if (showPoll && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2) {
      pollData = {
        question: pollQuestion.trim(),
        options: pollOptions.filter(o => o.trim()),
        created_at: new Date()
      };
    }

    setSubmitting(true);
    try {
      await addThreadMessage(threadId, newMessage, user, profile, files, pollData);
      setNewMessage('');
      setFiles([]);
      setShowPoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      fetchMessages();
    } catch (e) {
      toast.error('Erro ao enviar comentário');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="py-4 text-center text-sm text-muted-foreground">Carregando comentários...</div>;

  return (
    <div className="space-y-6">
      <h3 className="font-bold text-lg">Comentários ({messages.length})</h3>

      {user ? (
        <form onSubmit={handleSubmit} className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-3">
          <Textarea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Escreva um comentário... (suporta Markdown)"
            className="min-h-[80px]"
          />

          {/* Attachments Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input type="file" multiple id="comment-file-upload" className="hidden" onChange={handleFileChange} disabled={uploadingFiles} />
              <Label htmlFor="comment-file-upload" className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                {uploadingFiles ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Paperclip className="w-4 h-4 mr-2" />}
                Adicionar Arquivos
              </Label>

              <Button type="button" variant="outline" size="sm" onClick={() => setShowPoll(!showPoll)}>
                <ListPlus className="w-4 h-4 mr-2" /> {showPoll ? 'Remover Enquete' : 'Adicionar Enquete'}
              </Button>
            </div>

            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border border-border rounded text-sm bg-secondary/30">
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button type="button" onClick={() => handleRemoveFile(i)} className="text-destructive hover:text-destructive/80 font-bold ml-2">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Poll Section */}
          {showPoll && (
            <div className="mt-4 space-y-4 p-4 border border-border rounded-lg bg-secondary/5">
              <div className="space-y-2">
                <Label>Pergunta da Enquete</Label>
                <Input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Qual a sua opinião sobre..." />
              </div>
              <div className="space-y-2">
                <Label>Opções</Label>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input value={opt} onChange={e => updatePollOption(idx, e.target.value)} placeholder={`Opção ${idx + 1}`} />
                    {pollOptions.length > 2 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removePollOption(idx)} className="text-destructive">×</Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="link" size="sm" onClick={addPollOption} className="px-0">
                  + Adicionar opção
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={submitting || !newMessage.trim() || uploadingFiles}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Comentar
            </Button>
          </div>
        </form>
      ) : (
        <div className="bg-secondary/20 p-4 rounded-xl text-center text-sm">
          Faça login para comentar.
        </div>
      )}

      <div className="space-y-4">
        {messages.map(msg => (
          <MessageItem key={msg.id} message={msg} threadId={threadId} onDeleted={fetchMessages} />
        ))}
      </div>
    </div>
  );
}
