export type AssistantRole = 'user' | 'assistant';

export interface AssistantAttachmentMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface AssistantMessage {
  id: string;
  role: AssistantRole;
  content: string;
  attachments?: AssistantAttachmentMeta[];
  status?: 'streaming' | 'done' | 'error';
  createdAt: number;
}

export interface AssistantHistoryMessage {
  role: AssistantRole;
  content: string;
}

export interface AssistantChatPayload {
  messages: AssistantHistoryMessage[];
  includeTitle?: boolean;
}

export interface AssistantConversation {
  id: string;
  title: string;
  messages: AssistantMessage[];
  createdAt: number;
  updatedAt: number;
}
