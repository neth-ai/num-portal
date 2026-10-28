#!/usr/bin/env python3
"""Run paced local redeployments, explicitly separate from human Method A measurements."""
import argparse
import csv
import hashlib
import json
import os
from pathlib import Path
import statistics
import subprocess
import time
from datetime import datetime

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--runs', type=int, default=50)
parser.add_argument('--batch-minutes', type=float, default=10)
args = parser.parse_args()
if args.runs < 1 or args.batch_minutes < 0:
    parser.error('runs must be positive and batch-minutes nonnegative')
root = Path(__file__).resolve().parent.parent
stamp = datetime.now().astimezone().strftime('%Y%m%d-%H%M%S')
folder = root / '.local-env' / 'rehearsals' / stamp
folder.mkdir(parents=True)
source = root / 'apps/sme-app/src/content/page.json'
manifest = {
    'execution_mode': 'automated_local_rehearsal',
    'scenario': 'S2-style repeated deployment of current content',
    'human_manual_study_measurement': False,
    'requested_runs': args.runs,
    'target_batch_minutes': args.batch_minutes,
    'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'started_at': datetime.now().astimezone().isoformat(),
    'note': 'Inter-run pacing is excluded from deployment_seconds. No human SOP or feature changes are simulated.',
}
(folder / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'OUTPUT_DIR={folder}', flush=True)

def started_at():
    return subprocess.check_output([
        'docker', 'inspect', '--format', '{{.State.StartedAt}}', 'num-portal-manual-1'
    ], text=True).strip()

script = '''source scripts/manual-session.sh
run_start S2 "$RUN_NUMBER"
bash scripts/publish-site.sh manual
run_end
'''
records = []
batch_start = time.monotonic()
spacing = args.batch_minutes * 60 / args.runs
try:
    with (folder / 'runs.csv').open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=[
            'date', 'method', 'scenario', 'run', 'result', 'deployment_seconds',
            'commands_executed', 'container_restarted', 'execution_mode'
        ])
        writer.writeheader()
        for number in range(1, args.runs + 1):
            time.sleep(max(0, batch_start + (number - 1) * spacing - time.monotonic()))
            if hashlib.sha256(source.read_bytes()).hexdigest() != manifest['source_sha256']:
                raise RuntimeError('Source content changed during the batch; stopping to preserve comparability')
            before = started_at()
            raw = folder / f'run-{number}.raw.csv'
            run = subprocess.run(['/bin/bash', '--noprofile', '--norc'], input=script,
                text=True, capture_output=True, cwd=root, timeout=120,
                env={**os.environ, 'RUN_NUMBER': str(number), 'MANUAL_CSV': str(raw),
                     'DEPLOYMENT_METRICS_CSV': str(folder / 'publish-events.csv')})
            (folder / f'run-{number}.log').write_text(run.stdout + run.stderr)
            rows = list(csv.reader(raw.open())) if raw.exists() else []
            restarted = before != started_at()
            if len(rows) != 1 or len(rows[0]) != 7:
                raise RuntimeError(f'Run {number} did not produce a valid timing record')
            row = rows[0]
            result = row[4]
            if run.returncode or not restarted or 'Published to manual' not in run.stdout:
                result = 'failed'
            record = dict(date=row[0], method='A_rehearsal', scenario=row[2], run=number,
                          result=result, deployment_seconds=float(row[5]),
                          commands_executed=int(row[6]), container_restarted=restarted,
                          execution_mode='automated_local_rehearsal')
            writer.writerow(record)
            stream.flush()
            records.append(record)
            # The export uses an explicit rehearsal label; no raw A rows are retained.
            raw.unlink()
            print(f'Run {number}/{args.runs}: {result}, {row[5]}s, commands={row[6]}, restarted={restarted}', flush=True)
            if result != 'success':
                raise RuntimeError(f'Run {number} failed; stopping rather than repeating a faulty deployment')
        time.sleep(max(0, batch_start + args.batch_minutes * 60 - time.monotonic()))
finally:
    seconds = [r['deployment_seconds'] for r in records]
    summary = {
        **manifest, 'completed_runs': len(records),
        'successes': sum(r['result'] == 'success' for r in records),
        'finished_at': datetime.now().astimezone().isoformat(),
        'batch_seconds': round(time.monotonic() - batch_start, 2),
        'mean_deployment_seconds': round(statistics.mean(seconds), 3) if seconds else None,
        'median_deployment_seconds': statistics.median(seconds) if seconds else None,
        'min_deployment_seconds': min(seconds) if seconds else None,
        'max_deployment_seconds': max(seconds) if seconds else None,
    }
    (folder / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    print('SUMMARY=' + json.dumps(summary), flush=True)
