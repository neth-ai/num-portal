#!/usr/bin/env bash
# manual-session.sh – measurement helper for Method A (manual deployment).
# Usage (inside the SSH session on the server, or in a bash shell on a laptop):
#   source scripts/manual-session.sh
#   run_start S2 7          # scenario S2, run number 7
#   ...type the manual deployment commands from docs/manual-deployment-sop.md...
#   run_end                 # waits for the health check, then records the result
#
# Records deployment time, number of commands typed and success/failure to a CSV file:
#   date,A,scenario,run,result,seconds,steps
#
# Launch directly from zsh with: /bin/bash scripts/manual-session.sh
# The interactive child loads this same file as its startup file, keeping the functions alive.
if [ -n "${BASH_VERSION:-}" ] && [ "${BASH_SOURCE[0]}" = "$0" ]; then
  if [ ! -t 0 ]; then
    echo "Open a terminal and run: /bin/bash scripts/manual-session.sh"
    echo "For noninteractive use, source this file inside Bash instead."
    exit 1
  fi
  _MANUAL_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/manual-session.sh"
  cd "$(dirname "$_MANUAL_SCRIPT")/.." || exit 1
  export BASH_SILENCE_DEPRECATION_WARNING=1 MANUAL_SESSION_LAUNCHER=1
  exec /bin/bash --rcfile "$_MANUAL_SCRIPT" -i
fi

# Bash's DEBUG trap counts commands; sourcing in zsh cannot define working Bash functions.
if [ -z "${BASH_VERSION:-}" ]; then
  echo "You are in zsh. Start the timer shell with: /bin/bash ./scripts/manual-session.sh"
  echo "Then run: run_start S2 1"
  return 1 2>/dev/null || exit 1
fi
if [ "${MANUAL_SESSION_LAUNCHER:-}" = 1 ]; then
  PS1='manual-session \w\$ '
  unset MANUAL_SESSION_LAUNCHER
fi

MANUAL_PORT=${MANUAL_PORT:-3001}

# Macs record local rehearsals in the repository. Linux study servers prefer /opt.
if [ -z "${MANUAL_CSV:-}" ]; then
  _MANUAL_LOCAL_CSV="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.local-env/metrics/manual-runs.csv"
  if [ "$(uname -s)" = Darwin ]; then
    MANUAL_CSV="$_MANUAL_LOCAL_CSV"
  else
    MANUAL_CSV=/opt/numportal/metrics/manual-runs.csv
    if ! mkdir -p "$(dirname "$MANUAL_CSV")" 2>/dev/null ||
       [ ! -w "$(dirname "$MANUAL_CSV")" ] ||
       { [ -e "$MANUAL_CSV" ] && [ ! -w "$MANUAL_CSV" ]; }; then
      MANUAL_CSV="$_MANUAL_LOCAL_CSV"
    fi
  fi
  unset _MANUAL_LOCAL_CSV
fi
if ! mkdir -p "$(dirname "$MANUAL_CSV")" ||
   [ ! -w "$(dirname "$MANUAL_CSV")" ] ||
   { [ -e "$MANUAL_CSV" ] && [ ! -w "$MANUAL_CSV" ]; }; then
  echo "Cannot write manual results to $MANUAL_CSV"
  return 1 2>/dev/null || exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "manual-session.sh needs Node.js for a portable, millisecond-resolution timer."
  return 1 2>/dev/null || exit 1
fi

# %z rather than date -Is: the researcher's Mac has BSD date, the study server has GNU date.
_run_now() { date +%Y-%m-%dT%H:%M:%S%z; }
_run_epoch() { node -p 'Date.now() / 1000'; }

run_start() {
  if [ -n "${RUN_T0:-}" ]; then echo "A run is already active. Finish it with run_end first."; return 1; fi
  if [ "$#" -ne 2 ] || ! [[ "$1" =~ ^S[1-5]$ && "$2" =~ ^[1-9][0-9]*$ ]]; then
    echo "Usage: run_start <S1|S2|S3|S4|S5> <positive run number>"
    return 1
  fi
  RUN_SCENARIO="$1"; RUN_ID="$2"
  # The command log lives beside the CSV, so both follow MANUAL_CSV.
  RUN_LOG="$(dirname "$MANUAL_CSV")/manual-$RUN_SCENARIO-$RUN_ID.cmds"
  : > "$RUN_LOG"
  echo "Run $RUN_SCENARIO-$RUN_ID started. Follow the manual deployment SOP."
  RUN_T0=$(_run_epoch)
  # Log every command the researcher types. The trap is armed last, so nothing from this
  # function itself lands in the log and inflates the step count.
  trap '[[ "$BASH_COMMAND" != run_* && "$BASH_COMMAND" != _run_* && "$BASH_COMMAND" != trap* ]] && echo "$BASH_COMMAND" >> "$RUN_LOG"' DEBUG
}

run_end() {
  trap - DEBUG
  if [ -z "${RUN_T0:-}" ]; then echo "run_end without run_start - nothing was timed"; return 1; fi

  local ok=0
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:$MANUAL_PORT/api/health" >/dev/null; then ok=1; break; fi
    sleep 2
  done
  local t1; t1=$(_run_epoch)
  local secs; secs=$(awk "BEGIN {printf \"%.1f\", $t1 - $RUN_T0}")
  # POSIX character class: BSD grep does not understand \s.
  local steps=0
  if [ -f "$RUN_LOG" ]; then steps=$(grep -cv '^[[:space:]]*$' "$RUN_LOG"); fi
  local result; result=$([ $ok -eq 1 ] && echo success || echo failed)

  echo "$(_run_now),A,$RUN_SCENARIO,$RUN_ID,$result,$secs,$steps" >> "$MANUAL_CSV"
  echo "Run $RUN_SCENARIO-$RUN_ID: $result in ${secs}s with $steps manual commands -> $MANUAL_CSV"
  unset RUN_T0
}

echo "Manual timer ready. Results: $MANUAL_CSV"
echo "Next: run_start S2 1; follow the manual SOP; then run_end."
