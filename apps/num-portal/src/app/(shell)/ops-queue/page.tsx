import PageHeader from '@/components/shell/PageHeader';
import OpsQueue from '@/components/ops/OpsQueue';
import { openHandoffs } from '@/lib/handoffs-db';
import { TITLES } from '@/lib/nav';

export const dynamic = 'force-dynamic';

export default async function OpsQueuePage() {
  const [title, hint] = TITLES['/ops-queue'];
  const queue = await openHandoffs();
  return (
    <>
      <PageHeader title={title} hint={hint} />
      <OpsQueue queue={queue} />
    </>
  );
}
