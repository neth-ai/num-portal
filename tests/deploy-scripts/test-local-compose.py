"""Exercise database startup ordering without touching Docker or real run data."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[2] / 'scripts/deploy-local-compose.sh'
FAKE = '''#!/bin/sh
printf '%s\\n' "$*" >> "$DOCKER_TEST_LOG"
case "$1" in
  ps) echo fake-container ;;
  inspect)
    case "$3" in *Config.Image*) echo previous-image ;; *) echo previous-version ;; esac ;;
  compose)
    case "$*" in
      *"up -d --wait db"*) [ "$DB_TEST_FAIL" != 1 ] ;;
    esac ;;
  exec) echo '{"status":"ok"}' ;;
  run) echo '{}' ;;
esac
'''


class LocalComposeTest(unittest.TestCase):
    def execute(self, service, db_fail=False):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            fake = root / 'docker'
            fake.write_text(FAKE)
            fake.chmod(0o755)
            log = root / 'docker.log'
            env = dict(os.environ, PATH=f'{root}:{os.environ["PATH"]}',
                       NUM_PORTAL_HOST_ROOT=tmp, DOCKER_TEST_LOG=str(log),
                       DB_TEST_FAIL='1' if db_fail else '0')
            result = subprocess.run(['bash', str(SCRIPT), 'deploy', service,
                                     'candidate-image', 'test-version'],
                                    env=env, capture_output=True, text=True)
            return result, log.read_text().splitlines()

    def test_portal_waits_for_database_before_replacing_app(self):
        result, calls = self.execute('portal')
        self.assertEqual(result.returncode, 0, result.stderr)
        db = next(i for i, c in enumerate(calls) if c.endswith('up -d --wait db'))
        app = next(i for i, c in enumerate(calls) if c.endswith('--pull never portal'))
        self.assertLess(db, app)

    def test_failed_database_does_not_replace_portal(self):
        result, calls = self.execute('portal', db_fail=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(c.endswith('--pull never portal') for c in calls))

    def test_sme_deployment_does_not_start_database(self):
        result, calls = self.execute('staging')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(any(c.endswith('up -d --wait db') for c in calls))


if __name__ == '__main__':
    unittest.main()
