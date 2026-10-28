'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV } from '@/lib/nav';

export default function Rail({ waiting }: { waiting: number }) {
  const path = usePathname();
  return (
    <nav className="rail" aria-label="Pages">
      {NAV.map((g) => (
        <div key={g.group} style={{ display: 'contents' }}>
          <h6>{g.group}</h6>
          {g.items.map((item) => {
            const current = path === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                {...(current ? { 'aria-current': 'page' as const } : {})}
              >
                <span>{item.label}</span>
                {item.badge === 'waiting' && waiting > 0 ? <span className="badge hot">{waiting}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
