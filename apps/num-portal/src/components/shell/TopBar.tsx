'use client';
import Image from 'next/image';

/** The brand appears here and nowhere else in the application. */
export default function TopBar() {
  function toggleTheme() {
    const root = document.documentElement;
    const dark = root.dataset.theme === 'dark'
      || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch { /* storage blocked */ }
  }

  return (
    <div className="top">
      <div className="brand">
        {/* The name is written beside it, so the logo itself is decorative. */}
        <Image className="brand-mark" src="/logo.jpg" alt="" width={116} height={36} priority />
        <span className="brand-text">
          NUM Portal <small>manual deployment compared with DevOps</small>
        </span>
      </div>
      <div className="spacer" />
      <button className="theme" id="theme" type="button" onClick={toggleTheme} aria-label="Switch light or dark theme">
        Theme
      </button>
    </div>
  );
}
