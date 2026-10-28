import PageHeader from '@/components/shell/PageHeader';
import HandoffForm from '@/components/ops/HandoffForm';
import { currentHandoff, listHandoffs } from '@/lib/handoffs-db';
import { TITLES } from '@/lib/nav';

export const dynamic = 'force-dynamic';

export default async function HandoffPage() {
  const [title, hint] = TITLES['/handoff'];
  const [open, requests] = await Promise.all([currentHandoff(), listHandoffs()]);
  return (
    <>
      <PageHeader title={title} hint={hint} />
      <HandoffForm open={open} requests={requests} />
    </>
  );
}
