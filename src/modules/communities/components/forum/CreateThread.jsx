import React, { useState } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useProfile } from '@/core/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createForumThread } from '../../services/communityService';
import { toast } from 'sonner';
import { ArrowLeft, Paperclip, Loader2, ListPlus } from 'lucide-react';
import { uploadFile } from '@/core/lib/firebaseStorage';

export default function CreateThread({ communityId, onBack, onCreated }) {
  const { user } = useAuth();
  const { profile } = useProfile();

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Poll State
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    setUploadingFiles(true);
    try {
      const uploadedFiles = await Promise.all(selectedFiles.map(async (file) => {
        // use uploads/forum to conform to standard rules
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      return toast.error('Título e texto são obrigatórios');
    }

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
      await createForumThread(communityId, title, text, user, profile, files, pollData);
      toast.success('Tópico criado com sucesso!');
      onCreated();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao criar tópico');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>

      <form onSubmit={handleSubmit} className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-1">Criar Novo Tópico</h2>
          <p className="text-sm text-muted-foreground">Compartilhe ideias, faça perguntas ou inicie uma discussão.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Dicas para adestramento de cães" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="text">Texto (suporta Markdown)</Label>
            <Textarea
              id="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Escreva seu texto aqui... Você pode usar **negrito**, *itálico*, listas, etc."
              className="min-h-[200px]"
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Anexos (Imagens, Documentos)</Label>
            <div className="flex items-center gap-2">
              <Input type="file" multiple id="file-upload" className="hidden" onChange={handleFileChange} disabled={uploadingFiles} />
              <Label htmlFor="file-upload" className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                {uploadingFiles ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Paperclip className="w-4 h-4 mr-2" />}
                Adicionar Arquivos
              </Label>
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

          <div className="border-t border-border/50 pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowPoll(!showPoll)}>
              <ListPlus className="w-4 h-4 mr-2" /> {showPoll ? 'Remover Enquete' : 'Adicionar Enquete'}
            </Button>

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
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={submitting || uploadingFiles}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Publicar Tópico
          </Button>
        </div>
      </form>
    </div>
  );
}
