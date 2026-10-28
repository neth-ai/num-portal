"""Read-only parsing, validation and descriptive statistics for recorded run CSVs."""
from __future__ import annotations
import csv
import json
import math
import statistics
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

SCENARIOS = ('S1', 'S2', 'S3', 'S4', 'S5')
EXPECTED_STEPS = dict(S1=11, S2=11, S3=7, S4=11, S5=11)
COLUMNS = ('date', 'method', 'scenario', 'run', 'result', 'seconds', 'steps')

@dataclass(frozen=True)
class Run:
    path: Path
    line: int
    date: datetime
    method: str
    scenario: str
    number: int
    result: str
    seconds: float
    steps: int

    @property
    def location(self):
        return f'{self.path}:{self.line}'

@dataclass(frozen=True)
class Issue:
    level: str
    message: str


def plan_value(value):
    """Accept an integer or scenario=count overrides; unspecified scenarios default to 5."""
    if value.isdigit():
        return dict.fromkeys(SCENARIOS, int(value))
    plan = dict.fromkeys(SCENARIOS, 5)
    seen = set()
    try:
        for part in value.split(','):
            key, count = (v.strip() for v in part.split('='))
            if key not in SCENARIOS or key in seen or not count.isdigit():
                raise ValueError
            seen.add(key)
            plan[key] = int(count)
    except ValueError:
        raise ValueError('plan must be a nonnegative integer or S1=5,S2=5,S3=5,S4=5,S5=5')
    return plan


def parse_now(value):
    now = datetime.fromisoformat(value) if value else datetime.now().astimezone()
    if now.utcoffset() is None:
        raise ValueError('--now requires a timezone, e.g. 2026-10-20T18:00:00+07:00')
    return now


def describe(rows):
    values = [r.seconds for r in rows]
    return dict(n=len(rows), mean=statistics.mean(values) if values else None,
                median=statistics.median(values) if values else None,
                sd=statistics.stdev(values) if len(values) > 1 else None,
                minimum=min(values) if values else None, maximum=max(values) if values else None,
                success=sum(r.result == 'success' for r in rows),
                failed=sum(r.result == 'failed' for r in rows),
                mean_steps=statistics.mean(r.steps for r in rows) if rows else None)


def load(paths, method):
    rows, issues = [], []
    for path in paths:
        path = Path(path)
        # Provenance must not be ignored merely because the CSV uses the method letter A.
        metadata = path.with_suffix('.metadata.json')
        if metadata.exists():
            try:
                meta = json.loads(metadata.read_text())
                kind = str(meta.get('dataset_type', meta.get('execution_mode', ''))).lower()
                if meta.get('measured') is False or any(x in kind for x in ('synthetic', 'rehearsal', 'dummy')):
                    issues.append(Issue('ERROR', f'{path}: metadata identifies non-measured/test data; exclude from thesis statistics'))
            except (OSError, ValueError, AttributeError) as exc:
                issues.append(Issue('ERROR', f'{metadata}: cannot verify metadata: {exc}'))
        try:
            with path.open(newline='', encoding='utf-8-sig') as stream:
                reader = csv.reader(stream, strict=True)
                header = None
                first = True
                for cells in reader:
                    line = reader.line_num
                    if not cells or not any(c.strip() for c in cells):
                        continue
                    cells = [c.strip() for c in cells]
                    if first:
                        first = False
                        lowered = [c.lower() for c in cells]
                        if 'date' in lowered and 'method' in lowered:
                            if len(set(lowered)) != len(lowered) or not set(COLUMNS).issubset(lowered):
                                issues.append(Issue('ERROR', f'{path}:{line}: invalid header; requires {",".join(COLUMNS)}'))
                                break
                            header = lowered
                            continue
                    try:
                        if header is None:
                            if len(cells) != 7:
                                raise ValueError('expected exactly seven fields without a header')
                            data = dict(zip(COLUMNS, cells))
                        else:
                            if len(cells) != len(header):
                                raise ValueError('field count differs from header')
                            data = dict(zip(header, cells))
                        if data['method'] not in ('A', 'B'):
                            raise ValueError(f"unrecognized/non-study method {data['method']!r}")
                        if data['scenario'] not in SCENARIOS:
                            raise ValueError('scenario must be S1–S5')
                        if data['result'] not in ('success', 'failed'):
                            raise ValueError('result must be success or failed')
                        date = datetime.fromisoformat(data['date'])
                        if date.utcoffset() is None:
                            raise ValueError('timestamp requires a UTC offset')
                        number, steps = int(data['run']), int(data['steps'])
                        seconds = float(data['seconds'])
                        if number < 1 or steps < 0 or not math.isfinite(seconds) or seconds <= 0:
                            raise ValueError('run must be positive, steps nonnegative and seconds finite and positive')
                        if data['method'] == method:
                            rows.append(Run(path, line, date, method, data['scenario'], number,
                                            data['result'], seconds, steps))
                    except (ValueError, OverflowError) as exc:
                        issues.append(Issue('ERROR', f'{path}:{line}: {exc}'))
        except (OSError, csv.Error, UnicodeError) as exc:
            issues.append(Issue('ERROR', f'{path}: cannot read CSV: {exc}'))
    return rows, issues


def validate(paths, method, plan, now, timestamp_kind='end', tolerance=1.0, sequence_length=3):
    rows, issues = load(paths, method)
    seen = {}
    for r in rows:
        key = (r.method, r.scenario, r.number)
        if key in seen:
            issues.append(Issue('ERROR', f'{r.location}: duplicate run ID {key}; first at {seen[key]}'))
        seen[key] = r.location
        if r.date > now:
            issues.append(Issue('ERROR', f'{r.location}: timestamp {r.date.isoformat()} is in the future'))
        if method == 'A' and r.steps != EXPECTED_STEPS[r.scenario]:
            issues.append(Issue('WARNING', f'{r.location}: {r.scenario} steps={r.steps}; SOP reference={EXPECTED_STEPS[r.scenario]}; review command log, do not replace the count'))
    for path in paths:
        group = [r for r in rows if r.path == Path(path)]
        for previous, current in zip(group, group[1:]):
            gap = (current.date - previous.date).total_seconds()
            if gap < 0:
                issues.append(Issue('ERROR', f'{current.location}: timestamp out of order after {previous.location}'))
            duration = current.seconds if timestamp_kind == 'end' else previous.seconds
            if gap + tolerance < duration:
                issues.append(Issue('ERROR', f'{current.location}: possible overlapping runs: gap={gap:.3f}s, required={duration:.3f}s ({timestamp_kind} timestamps); assumes one operator, review session notes'))
    for scenario in SCENARIOS:
        group = [r for r in rows if r.scenario == scenario]
        if len(group) != plan[scenario]:
            issues.append(Issue('WARNING', f'{scenario}: {len(group)} runs versus plan {plan[scenario]}'))
        numbers = {r.number for r in group}
        missing = sorted(set(range(1, plan[scenario] + 1)) - numbers)
        extra = sorted(numbers - set(range(1, plan[scenario] + 1)))
        if missing or extra:
            issues.append(Issue('WARNING', f'{scenario}: missing planned IDs={missing}; IDs outside plan={extra}'))
        values = [r.seconds for r in group]
        if len(values) >= 3 and len(set(values)) == 1:
            issues.append(Issue('WARNING', f'{scenario}: all {len(values)} durations are identical'))
        elif len(values) >= 20 and max(values) > min(values):
            lo, hi = min(values), max(values)
            counts = Counter(min(3, int(4 * (v-lo)/(hi-lo))) for v in values)
            expected = len(values)/4
            score = sum((counts[i]-expected)**2/expected for i in range(4))
            if score <= 4.5:
                issues.append(Issue('WARNING', f'{scenario}: duration histogram looks approximately uniform: four-bin counts={[counts[i] for i in range(4)]}, balance score={score:.2f}; heuristic only, not evidence of fabrication'))
    if rows and all(r.steps == 0 for r in rows):
        issues.append(Issue('ERROR', 'steps column is all zero; the command-count instrument needs review before summarizing'))
    for key in ('seconds', 'number'):
        if rows and all(getattr(r, key) == 0 for r in rows):
            issues.append(Issue('ERROR', f'{key} column is all zero'))
    for i, left in enumerate(SCENARIOS):
        a = [r.seconds for r in rows if r.scenario == left]
        for right in SCENARIOS[i+1:]:
            b = [r.seconds for r in rows if r.scenario == right]
            if len(a) >= 3 and sorted(a) == sorted(b):
                issues.append(Issue('WARNING', f'{left}/{right}: identical duration multisets; review independent evidence'))
    # Look for exact consecutive subsequences, even when the complete files differ.
    windows = []
    for path in paths:
        group = [r for r in rows if r.path == Path(path)]
        index = {}
        for i in range(len(group)-sequence_length+1):
            seq = tuple(r.seconds for r in group[i:i+sequence_length])
            index.setdefault(seq, group[i].line)
        windows.append((Path(path), index))
    for i, (left, a) in enumerate(windows):
        for right, b in windows[i+1:]:
            common = sorted(a.keys() & b.keys())
            if common:
                examples = '; '.join(f'{seq} at {left}:{a[seq]} and {right}:{b[seq]}' for seq in common[:3])
                issues.append(Issue('WARNING', f'duplicate duration sequences across files ({len(common)} distinct sequences of length {sequence_length}): {examples}; review, do not alter values'))
    return rows, issues


def add_arguments(parser):
    parser.add_argument('csv_files', nargs='+', type=Path)
    parser.add_argument('--plan', default='5', help='Runs per scenario, or S1=5,S2=5,S3=5,S4=5,S5=5; applies across input files')
    parser.add_argument('--method', choices=('A', 'B'), default='A')
    parser.add_argument('--timestamp-kind', choices=('end', 'start'), default='end', help='manual-session.sh records end times (default)')
    parser.add_argument('--timestamp-tolerance', type=float, default=1.0, help='Overlap tolerance in seconds for timestamp rounding (default 1)')
    parser.add_argument('--sequence-length', type=int, default=3, help='Minimum matching duration subsequence length across files (default 3)')
    parser.add_argument('--now', help='Override the current timezone-aware ISO timestamp for repeatable validation')


def arguments(parser):
    args = parser.parse_args()
    try:
        args.plan = plan_value(args.plan)
        args.now = parse_now(args.now)
        if not math.isfinite(args.timestamp_tolerance) or args.timestamp_tolerance < 0 or args.sequence_length < 2:
            raise ValueError('tolerance must be finite/nonnegative and sequence-length at least 2')
        resolved = [p.resolve() for p in args.csv_files]
        if len(set(resolved)) != len(resolved):
            raise ValueError('each input file must be provided only once')
    except ValueError as exc:
        parser.error(str(exc))
    return args


def checked(args):
    return validate(args.csv_files, args.method, args.plan, args.now,
                    args.timestamp_kind, args.timestamp_tolerance, args.sequence_length)


def number(value):
    return 'no data' if value is None else f'{value:.2f}'
