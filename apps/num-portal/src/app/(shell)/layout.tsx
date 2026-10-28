import Rail from '@/components/shell/Rail';
import TopBar from '@/components/shell/TopBar';
import { waitingCount } from '@/lib/handoffs-db';

export const dynamic = 'force-dynamic';

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const waiting = await waitingCount().catch(() => 0);

  return (
    <>
      <TopBar />
      <div className="shell">
        <Rail waiting={waiting} />
        <main id="view" className="in">{children}</main>
      </div>
    </>
  );
}
