import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NUM Portal',
  description: 'Manual deployment compared with DevOps, for the NUM master\'s thesis.',
};

// Applies the saved theme before the first paint so the page never flashes the wrong colours.
const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
