#!/usr/bin/env bash
set -euo pipefail

# Install the packaged plugin into Windows Headlamp Desktop from WSL2.
#
# Headlamp Desktop uses two different roots on Windows:
#   - Electron often loads "development" plugins from
#       %LOCALAPPDATA%\\Headlamp\\Data\\plugins
#     when %LOCALAPPDATA%\\Headlamp\\Data already exists.
#   - The embedded backend still defaults to
#       %APPDATA%\\Headlamp\\Config\\plugins
#   If both exist, install to BOTH so the UI and the server agree.
#
# Usage:
#   ./deploy.sh                    # deploy for every eligible profile
#   ./deploy.sh Rawad              # recommended: your Windows profile name
#
# Override users root (rare): HEADLAMP_USERS_ROOT=/mnt/d/Users ./deploy.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARBALL="$SCRIPT_DIR/headlamp-k8s-node-readiness-controller-0.1.0.tar.gz"
USERS_ROOT="${HEADLAMP_USERS_ROOT:-/mnt/c/Users}"

if [[ ! -f "$TARBALL" ]]; then
  echo "Error: Tarball not found at $TARBALL"
  echo "Run: npm run build && npm run package"
  exit 1
fi

is_system_profile() {
  case "$1" in
  'All Users' | 'Default' | 'Default User' | 'Public' | '') return 0 ;;
  esac
  return 1
}

# Print newline-separated plugin *parent* directories (each .../plugins).
list_plugin_roots_for_user() {
  local win_user="$1"
  local create="${2:-0}"
  local roaming="${USERS_ROOT}/${win_user}/AppData/Roaming/Headlamp/Config/plugins"
  local local_data_root="${USERS_ROOT}/${win_user}/AppData/Local/Headlamp/Data"
  local local_plugins="${local_data_root}/plugins"

  if [[ "$create" == "1" ]]; then
    mkdir -p "$roaming"
    if [[ -d "$local_data_root" ]]; then
      mkdir -p "$local_plugins"
    fi
  fi

  if [[ -d "$local_data_root" ]]; then
    if [[ -d "$local_plugins" || "$create" == "1" ]]; then
      printf '%s\n' "$local_plugins"
    fi
  fi

  if [[ -d "$roaming" || "$create" == "1" ]]; then
    printf '%s\n' "$roaming"
  fi
}

discover_plugin_roots() {
  local d name
  if [[ ! -d "$USERS_ROOT" ]]; then
    echo "Error: Windows users root not found: $USERS_ROOT" >&2
    exit 1
  fi
  for d in "$USERS_ROOT"/*/; do
    [[ -d "$d" ]] || continue
    name="$(basename "$d")"
    if is_system_profile "$name"; then
      continue
    fi
    list_plugin_roots_for_user "$name" 0
  done
}

mapfile -t TARGET_DIRS < <(
  if [[ -n "${1:-}" ]]; then
    list_plugin_roots_for_user "$1" 1
  else
    discover_plugin_roots
  fi | awk 'NF && !seen[$0]++'
)

if [[ ${#TARGET_DIRS[@]} -eq 0 ]]; then
  echo "Error: No Headlamp plugin directory resolved." >&2
  echo "Pass your Windows profile: ./deploy.sh YOUR_USER" >&2
  echo "(Creates %APPDATA%\\Headlamp\\Config\\plugins if missing.)" >&2
  exit 1
fi

TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT
tar -xzf "$TARBALL" -C "$TEMP_DIR"
SRC="$TEMP_DIR/node-readiness-controller"
if [[ ! -f "$SRC/main.js" || ! -f "$SRC/package.json" ]]; then
  echo "Error: Tarball did not extract to node-readiness-controller/{main.js,package.json}" >&2
  exit 1
fi

for plugins_parent in "${TARGET_DIRS[@]}"; do
  DEST="${plugins_parent}/node-readiness-controller"
  echo "Deploying to: $DEST"
  mkdir -p "$DEST"
  cp "$SRC/main.js" "$SRC/package.json" "$DEST/"
  ls -lh "$DEST"
  if command -v sha256sum >/dev/null 2>&1; then
    echo "  sha256(main.js): $(sha256sum "$DEST/main.js" | awk '{print $1}')"
  fi
  if grep -Fq 'nodereadinessrules?limit=' "$DEST/main.js" 2>/dev/null; then
    echo "  WARNING: deployed main.js still contains the old install-probe URL pattern (stale tarball? run npm run build && npm run package)" >&2
  else
    echo "  OK: no install-probe URL pattern in deployed main.js"
  fi
done

echo ""
echo "Done. Next steps:"
echo "  1. Fully quit Headlamp (tray / Task Manager), then reopen."
echo "  2. If the sidebar entry is still missing, reset saved plugin toggles in the app:"
echo "       DevTools (Ctrl+Shift+I) → Console:"
echo "       localStorage.removeItem('headlampPluginSettings'); location.reload();"
echo "  3. Then open Settings → Plugins and ensure @headlamp-k8s/node-readiness-controller is enabled."
echo "  4. Optional: delete *.tar.gz under .../Headlamp/Config/plugins to reduce clutter."
echo ""
