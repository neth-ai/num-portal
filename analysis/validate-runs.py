#!/usr/bin/env python3
"""Read-only audit of measurement CSVs; reports issues without changing or generating rows."""
import argparse
from collections import Counter
from _run_data import SCENARIOS, add_arguments, arguments, checked, describe, number


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    add_arguments(parser)
    args = arguments(parser)
    rows, issues = checked(args)
    print(f'Read-only audit: method {args.method}; {len(rows)} parsed rows; current time {args.now.isoformat()}')
    print(f'Timestamps interpreted as {args.timestamp_kind}; overlap checks assume one operator; tolerance={args.timestamp_tolerance}s.')
    print('A clean report checks consistency only; it does not prove provenance or human execution.')
    for issue in issues:
        print(f'{issue.level}: {issue.message}')
    print('\nScenario | n / plan | success | failed | mean (s) | median (s) | sample SD (s) | min (s) | max (s)')
    for scenario in SCENARIOS:
        d = describe([r for r in rows if r.scenario == scenario])
        print(f"{scenario} | {d['n']} / {args.plan[scenario]} | {d['success']} | {d['failed']} | "
              + ' | '.join(number(d[k]) for k in ('mean', 'median', 'sd', 'minimum', 'maximum')))
    print('Result counts:', dict(Counter(r.result for r in rows)))
    print('All-zero numeric columns:', ', '.join(k for k in ('seconds', 'steps', 'number') if rows and all(getattr(r, k) == 0 for r in rows)) or 'none among parsed rows')
    if not rows:
        print('no data')
    print('Distribution warnings are descriptive heuristics, not formal tests or accusations. Uniformity is checked only for n >= 20; sample SD is unavailable for n < 2.')
    errors = sum(i.level == 'ERROR' for i in issues)
    warnings = sum(i.level == 'WARNING' for i in issues)
    print(f'Validation: {errors} errors, {warnings} warnings. No files modified.')
    return 2 if errors else (1 if warnings else 0)

if __name__ == '__main__':
    raise SystemExit(main())
