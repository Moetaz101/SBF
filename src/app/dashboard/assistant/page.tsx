import PageContainer from '@/components/layout/page-container';
import { AssistantChat } from '@/features/assistant/components/assistant-chat';

export const metadata = { title: 'Assistant IA' };

export default function AssistantPage() {
  return (
    <PageContainer
      pageTitle='Assistant IA'
      pageDescription='Analysez vos données SBF, générez des graphiques et préparez vos décisions'
    >
      <AssistantChat />
    </PageContainer>
  );
}
