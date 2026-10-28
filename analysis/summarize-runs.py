#!/usr/bin/env python3
"""Validate observed runs and print a Markdown summary; never modify the input CSVs."""
import argparse
import sys
from _run_data import SCENARIOS, add_arguments, arguments, checked, describe, number


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    add_arguments(parser)
    args = arguments(parser)
    rows, issues = checked(args)
    for issue in issues:
        print(f'{issue.level}: {issue.message}', file=sys.stderr)
    if any(i.level == 'ERROR' for i in issues):
        print('Summary withheld: validation errors require review. Measurements were not changed.', file=sys.stderr)
        return 2
    print(f'Method {args.method}; durations in seconds; all observed success and failed runs included. SD is sample SD (n−1).')
    print('S3 measures recovery and must not be pooled with deployment scenarios.')
    if issues:
        print('**Provisional: validation warnings remain; review them before using this table in the thesis.**')
    print('\n| Scenario | n | Mean (s) | Median (s) | SD (s) | Success rate | Mean steps |')
    print('|---|---:|---:|---:|---:|---:|---:|')
    for scenario in SCENARIOS:
        d = describe([r for r in rows if r.scenario == scenario])
        rate = f"{100*d['success']/d['n']:.1f}% ({d['success']}/{d['n']})" if d['n'] else 'no data'
        print(f"| {scenario} | {d['n']} | {number(d['mean'])} | {number(d['median'])} | {number(d['sd'])} | {rate} | {number(d['mean_steps'])} |")
    return 1 if issues else 0

if __name__ == '__main__':
    raise SystemExit(main())
