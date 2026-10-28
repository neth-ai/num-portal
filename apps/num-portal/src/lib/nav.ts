// The one flat menu. No role tabs: every signed-in person sees the same items.
// Groups, order and wording follow docs/num-portal-ui-prototype.html.

export type NavItem = { href: string; label: string; badge?: 'waiting' };
export type NavGroup = { group: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    group: 'Release',
    items: [
      { href: '/', label: 'Home' },
      { href: '/change-code', label: 'Change code' },
      { href: '/result', label: 'Result on the website' },
    ],
  },
  {
    group: 'Method A',
    items: [
      { href: '/handoff', label: 'Handoff form' },
      { href: '/ops-queue', label: 'Ops queue', badge: 'waiting' },
    ],
  },
  {
    group: 'Analysis',
    items: [
      { href: '/compare', label: 'Compare A vs B' },
      { href: '/handoff-analysis', label: 'Handoff analysis' },
      { href: '/statistics', label: 'Statistics' },
    ],
  },
  {
    group: 'Technical',
    items: [
      { href: '/pipelines', label: 'Pipelines and logs' },
      { href: '/system-health', label: 'System health' },
    ],
  },
  { group: 'Project', items: [{ href: '/about', label: 'About the study' }] },
];

/** Page title and one-line hint. The brand never appears here, only in the top bar. */
export const TITLES: Record<string, [string, string]> = {
  '/': ['Manual deployment vs DevOps', 'Manual on the left, DevOps on the right, with the data we use in the thesis.'],
  '/change-code': ['Change code', 'Edit the website code once. One commit goes to both methods.'],
  '/result': ['Result on the website', 'What each method put online after the same change.'],
  '/handoff': ['Handoff, Method A', 'The Dev team asks the Operations team to deploy by hand.'],
  '/ops-queue': ['Ops queue, Method A', 'Receive a handoff request, deploy by hand and tick each step.'],
  '/compare': ['Compare A vs B', 'Figures for Chapter V.'],
  '/handoff-analysis': ['Handoff analysis', 'Where the time goes: waiting, hands-on work and the pipeline.'],
  '/statistics': ['Statistics', 'Test and decision for each hypothesis.'],
  '/pipelines': ['Pipelines and logs', 'Follow each stage and read the job log as it streams.'],
  '/system-health': ['System health', 'Services on the study server.'],
  '/about': ['About the study', 'What is compared and what is recorded.'],
};
