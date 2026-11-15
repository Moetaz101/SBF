'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Icons } from '@/components/icons';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle
} from '@/components/ui/attachment';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Button } from '@/components/ui/button';
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader
} from '@/components/ui/message';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport
} from '@/components/ui/message-scroller';
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type {
  AssistantAttachmentMeta,
  AssistantHistoryMessage,
  AssistantMessage
} from '../api/types';
import { AssistantMarkdown } from './assistant-markdown';

const STORAGE_KEY = 'sbf-assistant-conversation-v1';
const MAX_FILES = 4;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 16 * 1024 * 1024;
const ACCEPT = '.pdf,.csv,.tsv,.txt,.md,.json,.xlsx,.xls,image/*,audio/*,video/*';

const SUGGESTIONS = [
  {
    icon: Icons.warning,
    title: 'Marchés à risque',
    description: 'Retards, dérives et priorités',
    prompt:
      'Quels marchés sont en retard ou à surveiller ? Donne-moi les priorités et un graphique Mermaid.'
  },
  {
    icon: Icons.chartBar,
    title: 'Répartition par type',
    description: 'Montant HT par activité',
    prompt:
      'Fais un graphique du montant HT par type de travaux, puis commente les écarts et les opportunités.'
  },
  {
    icon: Icons.targetArrow,
    title: 'Taux de réussite',
    description: 'Offres gagnées et perdues',
    prompt:
      'Quel est notre taux de réussite ? Analyse les offres perdues et propose des actions concrètes.'
  },
  {
    icon: Icons.calendar,
    title: 'Prochaines remises',
    description: 'Échéances des 30 prochains jours',
    prompt:
      'Résume les prochaines remises d’offre des 30 prochains jours avec un planning Mermaid et les priorités.'
  }
];

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function fileIcon(mimeType: string, name: string) {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  if (mimeType.startsWith('image/')) return Icons.media;
  if (mimeType === 'application/pdf' || extension === 'pdf') return Icons.fileTypePdf;
  if (['xlsx', 'xls', 'csv', 'tsv'].includes(extension)) return Icons.fileTypeXls;
  if (['doc', 'docx'].includes(extension)) return Icons.fileTypeDoc;
  if (mimeType.startsWith('audio/')) return Icons.music;
  if (mimeType.startsWith('video/')) return Icons.video;
  return Icons.page;
}

function toMeta(file: File): AssistantAttachmentMeta {
  return {
    id: createId(),
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size
  };
}

function toHistory(messages: AssistantMessage[]): AssistantHistoryMessage[] {
  return messages
    .filter((message) => message.status !== 'error')
    .filter((message) => message.role === 'user' || message.content.trim().length > 0)
    .map((message) => ({ role: message.role, content: message.content }));
}

function TypingIndicator() {
  return (
    <span className='inline-flex items-center gap-1 py-1' aria-label='Pulse IA rédige une réponse'>
      <span className='bg-muted-foreground/60 size-1.5 animate-bounce rounded-full [animation-delay:-0.3s]' />
      <span className='bg-muted-foreground/60 size-1.5 animate-bounce rounded-full [animation-delay:-0.15s]' />
      <span className='bg-muted-foreground/60 size-1.5 animate-bounce rounded-full' />
    </span>
  );
}

function MessageFiles({
  attachments,
  align = 'start',
  onRemove
}: {
  attachments: AssistantAttachmentMeta[];
  align?: 'start' | 'end';
  onRemove?: (index: number) => void;
}) {
  return (
    <AttachmentGroup className={cn(align === 'end' && 'justify-end')}>
      {attachments.map((attachment, index) => {
        const Icon = fileIcon(attachment.mimeType, attachment.name);
        return (
          <Attachment key={attachment.id} size='sm' className='max-w-full'>
            <AttachmentMedia>
              <Icon />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{attachment.name}</AttachmentTitle>
              <AttachmentDescription>{formatFileSize(attachment.size)}</AttachmentDescription>
            </AttachmentContent>
            {onRemove ? (
              <AttachmentActions>
                <AttachmentAction
                  type='button'
                  onClick={() => onRemove(index)}
                  aria-label={`Retirer ${attachment.name}`}
                >
                  <Icons.close />
                </AttachmentAction>
              </AttachmentActions>
            ) : null}
          </Attachment>
        );
      })}
    </AttachmentGroup>
  );
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className='mx-auto flex w-full max-w-2xl flex-col items-center px-2 py-10 text-center md:py-16'>
      <div className='bg-primary/10 text-primary mb-4 flex size-14 items-center justify-center rounded-2xl'>
        <Icons.sparkles className='size-7' />
      </div>
      <h2 className='text-xl font-semibold'>Posez une question à vos données</h2>
      <p className='text-muted-foreground mt-2 max-w-lg text-sm'>
        Pulse IA analyse vos marchés, votre planning et vos indicateurs pour vous aider à décider.
        Posez une question ou joignez un document.
      </p>

      <div className='mt-6 grid w-full gap-2 sm:grid-cols-2'>
        {SUGGESTIONS.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={suggestion.title}
              type='button'
              onClick={() => onPick(suggestion.prompt)}
              className='bg-card hover:border-primary/40 hover:bg-muted/40 group flex items-start gap-3 rounded-xl border p-3 text-left transition-colors'
            >
              <span className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg'>
                <Icon className='size-4' />
              </span>
              <span className='min-w-0 flex-1'>
                <span className='block text-sm font-medium'>{suggestion.title}</span>
                <span className='text-muted-foreground mt-0.5 block text-xs'>
                  {suggestion.description}
                </span>
              </span>
              <Icons.arrowRight className='text-muted-foreground/50 group-hover:text-foreground mt-1 size-3.5 shrink-0 transition-colors' />
            </button>
          );
        })}
      </div>

      <p className='text-muted-foreground mt-6 max-w-md text-[11px]'>
        Les réponses sont générées à partir des données de votre plateforme. Vérifiez toujours les
        chiffres critiques avant une décision.
      </p>
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className='mx-auto w-full max-w-3xl space-y-5 px-2 py-8'>
      <div className='flex items-start gap-3'>
        <Skeleton className='size-8 shrink-0 rounded-full' />
        <div className='w-full space-y-2'>
          <Skeleton className='h-3 w-24' />
          <Skeleton className='h-16 w-3/4 rounded-xl' />
        </div>
      </div>
      <div className='flex items-start justify-end gap-3'>
        <div className='w-full space-y-2'>
          <Skeleton className='ml-auto h-3 w-16' />
          <Skeleton className='ml-auto h-10 w-1/2 rounded-xl' />
        </div>
        <Skeleton className='size-8 shrink-0 rounded-full' />
      </div>
    </div>
  );
}

export function AssistantChat() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AssistantMessage[];
          if (Array.isArray(parsed)) {
            setMessages(
              parsed
                .filter((message) => message?.role === 'user' || message?.role === 'assistant')
                .map((message) => ({
                  ...message,
                  status: message.status === 'streaming' ? 'done' : message.status
                }))
            );
          }
        }
      } catch {
        // Stockage local indisponible : la conversation reste en mémoire.
      } finally {
        setIsHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isHydrated || isStreaming) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {
        // Quota ou stockage désactivé : on ignore.
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isHydrated, isStreaming, messages]);

  useEffect(() => {
    textareaRef.current?.focus();
    return () => abortRef.current?.abort();
  }, []);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    setError(null);
    setPendingFiles((current) => {
      const next = [...current];
      for (const file of Array.from(incoming)) {
        if (next.length >= MAX_FILES) {
          toast.error(`Vous pouvez joindre au maximum ${MAX_FILES} fichiers.`);
          break;
        }
        if (file.size > MAX_FILE_BYTES) {
          toast.error(`« ${file.name} » dépasse la taille maximale de 8 Mo.`);
          continue;
        }
        if (next.some((item) => item.name === file.name && item.size === file.size)) {
          continue;
        }
        next.push(file);
      }
      const total = next.reduce((sum, file) => sum + file.size, 0);
      if (total > MAX_TOTAL_BYTES) {
        toast.error('Le total des pièces jointes dépasse 16 Mo.');
        return current;
      }
      return next;
    });
  }, []);

  const removeFile = useCallback((name: string, size: number) => {
    setPendingFiles((current) =>
      current.filter((file) => !(file.name === name && file.size === size))
    );
  }, []);

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (isStreaming || (!text && pendingFiles.length === 0)) return;

      setError(null);
      const userMessage: AssistantMessage = {
        id: createId(),
        role: 'user',
        content: text || 'Analyse les pièces jointes.',
        attachments: pendingFiles.map(toMeta),
        status: 'done',
        createdAt: Date.now()
      };
      const assistantId = createId();
      const assistantMessage: AssistantMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        createdAt: Date.now()
      };

      const history = [...messages, userMessage];
      setMessages([...history, assistantMessage]);
      setInput('');
      const filesToSend = pendingFiles;
      setPendingFiles([]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const formData = new FormData();
        formData.append(
          'payload',
          JSON.stringify({ messages: toHistory(history) } satisfies {
            messages: AssistantHistoryMessage[];
          })
        );
        filesToSend.forEach((file) => formData.append('files', file, file.name));

        const response = await fetch('/api/assistant/chat', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        if (!response.ok) {
          let message = 'La requête a échoué.';
          try {
            const data = (await response.json()) as { error?: string };
            if (data.error) message = data.error;
          } catch {
            // Réponse non JSON.
          }
          throw new Error(message);
        }

        if (!response.body) throw new Error('Réponse vide du serveur.');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantText += decoder.decode(value, { stream: true });
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId ? { ...message, content: assistantText } : message
            )
          );
        }

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, content: assistantText, status: 'done' }
              : message
          )
        );
      } catch (sendError) {
        if (controller.signal.aborted) {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    status: 'done',
                    content: message.content || 'Réponse interrompue.'
                  }
                : message
            )
          );
        } else {
          const message =
            sendError instanceof Error ? sendError.message : 'Une erreur est survenue.';
          setError(message);
          setMessages((current) =>
            current.map((item) =>
              item.id === assistantId
                ? { ...item, status: 'error', content: item.content || message }
                : item
            )
          );
          toast.error(message);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        textareaRef.current?.focus();
      }
    },
    [input, isStreaming, messages, pendingFiles]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearConversation = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setInput('');
    setPendingFiles([]);
    setError(null);
    setIsStreaming(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Stockage désactivé.
    }
    textareaRef.current?.focus();
  }, []);

  const copyMessage = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Réponse copiée.');
    } catch {
      toast.error('Impossible de copier la réponse.');
    }
  }, []);

  const canSend = !isStreaming && (input.trim().length > 0 || pendingFiles.length > 0);

  return (
    <div className='border-border bg-card flex h-[calc(100dvh-14rem)] min-h-[28rem] flex-col overflow-hidden rounded-xl border shadow-sm md:h-[calc(100dvh-10rem)]'>
      <div className='border-border flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2'>
        <div className='flex min-w-0 items-center gap-2'>
          <span className='bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg'>
            <Icons.sparkles className='size-4' />
          </span>
          <div className='min-w-0'>
            <p className='truncate text-sm font-semibold'>Pulse IA</p>
            <p className='text-muted-foreground hidden truncate text-[11px] sm:block'>
              Connecté aux données SBF · réponses en français
            </p>
          </div>
        </div>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={clearConversation}
          disabled={isStreaming || messages.length === 0}
        >
          <Icons.refresh />
          <span className='hidden sm:inline'>Nouvelle conversation</span>
          <span className='sm:hidden'>Nouveau</span>
        </Button>
      </div>

      <MessageScrollerProvider autoScroll defaultScrollPosition='end' scrollEdgeThreshold={80}>
        <MessageScroller className='min-h-0 flex-1'>
          <MessageScrollerViewport className='px-3 py-4 md:px-6'>
            <MessageScrollerContent>
              {!isHydrated ? (
                <ChatSkeleton />
              ) : messages.length === 0 ? (
                <EmptyState onPick={(prompt) => void sendMessage(prompt)} />
              ) : (
                messages.map((message, index) => {
                  const isLast = index === messages.length - 1;
                  const messageIsStreaming = isStreaming && isLast && message.role === 'assistant';
                  const isUser = message.role === 'user';

                  return (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      scrollAnchor={isLast}
                    >
                      <Message align={isUser ? 'end' : 'start'} className='gap-3'>
                        <MessageAvatar
                          className={cn(
                            'mt-1',
                            isUser
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-primary/10 text-primary'
                          )}
                        >
                          {isUser ? (
                            <Icons.user className='size-4' />
                          ) : (
                            <Icons.sparkles className='size-4' />
                          )}
                        </MessageAvatar>

                        <MessageContent>
                          <MessageHeader className='px-1'>
                            <span>{isUser ? 'Vous' : 'Pulse IA'}</span>
                            <span className='text-muted-foreground/60 ml-2 text-[10px] font-normal'>
                              {new Date(message.createdAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </MessageHeader>

                          {message.attachments?.length ? (
                            <MessageFiles
                              attachments={message.attachments}
                              align={isUser ? 'end' : 'start'}
                            />
                          ) : null}

                          {isUser ? (
                            <Bubble variant='default' align='end' className='max-w-[85%]'>
                              <BubbleContent className='whitespace-pre-wrap'>
                                {message.content}
                              </BubbleContent>
                            </Bubble>
                          ) : (
                            <Bubble variant='ghost' className='w-full max-w-none'>
                              <BubbleContent className='w-full max-w-none px-0 py-0'>
                                {message.content ? (
                                  <AssistantMarkdown
                                    content={message.content}
                                    isStreaming={messageIsStreaming}
                                  />
                                ) : message.status === 'error' ? (
                                  <p className='text-destructive text-sm'>{message.content}</p>
                                ) : (
                                  <TypingIndicator />
                                )}
                              </BubbleContent>
                            </Bubble>
                          )}

                          {!isUser && message.content && !messageIsStreaming ? (
                            <MessageFooter className='px-1'>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon-xs'
                                onClick={() => void copyMessage(message.content)}
                                aria-label='Copier la réponse'
                              >
                                <Icons.copy />
                              </Button>
                            </MessageFooter>
                          ) : null}
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  );
                })
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton direction='end' />
        </MessageScroller>
      </MessageScrollerProvider>

      <div className='border-border bg-background/60 shrink-0 border-t p-3 backdrop-blur'>
        {error ? (
          <Marker className='text-destructive mb-2'>
            <MarkerIcon>
              <Icons.warning />
            </MarkerIcon>
            <MarkerContent>{error}</MarkerContent>
          </Marker>
        ) : null}

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) setIsDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
          }}
          className={cn(
            'border-input bg-card focus-within:border-ring focus-within:ring-ring/30 rounded-2xl border p-2 shadow-sm transition-colors focus-within:ring-2',
            isDragging && 'border-primary bg-primary/5 ring-primary/20 ring-2'
          )}
        >
          {pendingFiles.length ? (
            <div className='mb-2 px-1'>
              <MessageFiles
                attachments={pendingFiles.map((file, index) => ({
                  id: `pending-${index}`,
                  name: file.name,
                  mimeType: file.type || 'application/octet-stream',
                  size: file.size
                }))}
                onRemove={(index) => {
                  const file = pendingFiles[index];
                  if (file) removeFile(file.name, file.size);
                }}
              />
            </div>
          ) : null}

          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder='Posez une question sur vos marchés, votre planning, vos marges…'
            className='max-h-40 min-h-10 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0 dark:bg-transparent'
            rows={1}
            disabled={isStreaming}
            aria-label='Votre question pour Pulse IA'
          />

          <div className='mt-1 flex items-center justify-between gap-2 px-1'>
            <div className='flex min-w-0 items-center gap-1'>
              <input
                ref={fileInputRef}
                type='file'
                multiple
                accept={ACCEPT}
                className='hidden'
                onChange={(event) => {
                  if (event.target.files?.length) addFiles(event.target.files);
                  event.target.value = '';
                }}
              />
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                onClick={() => fileInputRef.current?.click()}
                disabled={isStreaming}
                aria-label='Joindre un document ou un média'
              >
                <Icons.paperclip />
              </Button>
              <span className='text-muted-foreground hidden truncate text-[11px] sm:inline'>
                PDF, Excel, images, audio, vidéo · 16 Mo max
              </span>
            </div>

            {isStreaming ? (
              <Button type='button' variant='secondary' size='sm' onClick={stop}>
                <Icons.stop />
                Arrêter
              </Button>
            ) : (
              <Button
                type='button'
                size='icon-sm'
                onClick={() => void sendMessage()}
                disabled={!canSend}
                aria-label='Envoyer la question'
              >
                <Icons.send />
              </Button>
            )}
          </div>
        </div>

        <p className='text-muted-foreground mt-2 text-center text-[11px]'>
          Pulse IA peut se tromper. Vérifiez les données critiques avant toute décision.
        </p>
      </div>
    </div>
  );
}
