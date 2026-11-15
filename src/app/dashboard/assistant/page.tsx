import PageContainer from '@/components/layout/page-container';
import { AssistantChat } from '@/features/assistant/components/assistant-chat';

export const metadata = { title: 'Assistant IA' };

export default function AssistantPage() {
  return (
    <PageContainer pageTitle='Assistant IA'>
      <AssistantChat />
    </PageContainer>
  );
}
