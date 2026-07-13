/**
 * @fileoverview CodeOfConductDialog — aceite de conduta no Mural (TASK-157).
 *
 * Exibido ANTES do primeiro comentário em uma comunidade. O user precisa
 * aceitar o Código de Conduta (TASK-062) para comentar.
 *
 * Compliance: Marco Civil Art. 19 + LGPD Art. 7º.
 */
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck } from 'lucide-react';

const CODE_OF_CONDUCT = `
**Código de Conduta da Comunidade (TASK-062)**

Ao participar desta comunidade, você concorda em:

1. **Respeito mútuo**: Trate todos com civilidade. Ataques pessoais,
   discriminação, assédio ou discurso de ódio não serão tolerados.

2. **Conteúdo apropriado**: Não publique conteúdo ilegal, ofensivo,
   violento, sexual ou que viole direitos de terceiros.

3. **Veracidade**: Não publique informações falsas ou enganosas sobre
   pets, abrigos, adoções ou serviços.

4. **Privacidade**: Não compartilhe dados pessoais de outros membros
   sem consentimento. Respeite a LGPD.

5. **Propósito da comunidade**: Esta é uma comunidade para discutir
   cuidado, adoção e bem-estar animal. Mantenha o foco no tema.

6. **Moderação**: Administradores podem editar ou remover conteúdo
   que viole este código, com aviso e motivo registrado em auditoria.

7. **Denúncia**: Use o botão "Denunciar" para reportar conteúdo
   inadequado. Todas as denúncias são revisadas por moderadores.

8. **Consequências**: Violações podem resultar em advertência,
   suspensão ou banimento, dependendo da gravidade.

Este aceite é registrado em log de auditoria (LGPD Art. 7º, §1º).
Para dúvidas, consulte os Termos de Uso e a Política de Privacidade.
`.trim();

export function CodeOfConductDialog({ open, onOpenChange, onAccept, communityName }) {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (!accepted) return;
    onAccept();
    setAccepted(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Código de Conduta — {communityName || 'Comunidade'}
          </DialogTitle>
          <DialogDescription>
            Leia e aceite para poder comentar pela primeira vez nesta comunidade.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-64 border rounded p-3">
          <pre className="text-xs whitespace-pre-wrap font-sans">
            {CODE_OF_CONDUCT}
          </pre>
        </ScrollArea>
        <div className="flex items-center gap-2">
          <Checkbox
            id="accept-coc"
            checked={accepted}
            onCheckedChange={setAccepted}
          />
          <label htmlFor="accept-coc" className="text-sm cursor-pointer">
            Li, entendi e aceito o Código de Conduta.
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAccept} disabled={!accepted}>
            Aceitar e comentar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
