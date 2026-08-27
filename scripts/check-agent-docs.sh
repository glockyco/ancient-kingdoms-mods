#!/usr/bin/env bash
set -euo pipefail

exec python3 "$(dirname "$0")/check_agent_docs.py" "$(cd "$(dirname "$0")/.." && pwd)" "$@"
