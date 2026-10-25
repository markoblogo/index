"""macOS login/interval entrypoint: OS lock survives crashes without stale PID races."""
import fcntl
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
config_path = Path(sys.argv[1])
config = json.loads(config_path.read_text())
root = Path(config['workRoot'])
if not root.parent.is_dir():
    sys.exit('video_work_volume_not_mounted')
root.mkdir(parents=True, exist_ok=True, mode=0o700)
with (root / 'launch.lock').open('a') as lock:
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        sys.exit(0)
    # Only the OS-lock owner may reconcile the previous launch's local PID lock.
    owner = root / 'worker.lock' / 'pid'
    if owner.exists():
        pid = int(owner.read_text())
        try:
            os.kill(pid, 0)
            sys.exit(0)
        except ProcessLookupError:
            owner.unlink()
            owner.parent.rmdir()
    result = subprocess.run([config['node'], config['workerPath'], '--config', str(config_path)], check=False)
    sys.exit(result.returncode)
