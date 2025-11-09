#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""AssetRipper automation script for Ancient Kingdoms.

This script automates the extraction of Unity assets from the Ancient Kingdoms
game files using AssetRipper. It:
1. Starts AssetRipper web server
2. Loads game data files
3. Exports to Unity project format
4. Monitors export progress

Usage:
    python scripts/extract-assets.py

Requirements:
    - AssetRipper.GUI.Free executable (download from GitHub releases)
    - curl (for API calls)

Configuration:
    Set ASSETRIPPER_PATH environment variable or update the default path below.
"""

import os
import subprocess
import time
from pathlib import Path
from datetime import datetime
import sys


class AssetRipperError(Exception):
    """Base exception for AssetRipper-related errors."""
    pass


class AssetRipper:
    """Wrapper for AssetRipper extraction tool."""

    def __init__(
        self,
        executable_path: Path,
        port: int = 8080,
        timeout: int = 3600,
    ):
        """Initialize AssetRipper wrapper.

        Args:
            executable_path: Path to AssetRipper executable
            port: Port for web API server (default: 8080)
            timeout: Maximum export time in seconds (default: 3600 = 1 hour)
        """
        self.executable_path = executable_path
        self.port = port
        self.timeout = timeout
        self._server_pid = None
        self._log_file = None

        if not self.executable_path.exists():
            raise AssetRipperError(
                f"AssetRipper executable not found at: {self.executable_path}\n"
                "Download from: https://github.com/AssetRipper/AssetRipper/releases"
            )

    def _check_server_running(self) -> bool:
        """Check if AssetRipper server is responding."""
        try:
            result = subprocess.run(
                ["curl", "-s", "-f", f"http://localhost:{self.port}/"],
                capture_output=True,
                timeout=5,
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False

    def start_server(self, log_dir: Path):
        """Start AssetRipper web API server."""
        if self._server_pid is not None:
            print(f"Server already running (PID: {self._server_pid})")
            return

        print(f"Starting AssetRipper server on port {self.port}...")

        # Create log directory
        log_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self._log_file = log_dir / f"assetripper_{timestamp}.log"

        # Start server in background
        with self._log_file.open("w") as log_file:
            process = subprocess.Popen(
                [
                    str(self.executable_path),
                    "--port",
                    str(self.port),
                    "--launch-browser=false",
                ],
                stdout=log_file,
                stderr=subprocess.STDOUT,
            )
            self._server_pid = process.pid

        # Wait for server to start (up to 30 seconds)
        for _ in range(30):
            if self._check_server_running():
                print(f"✓ Server started successfully (PID: {self._server_pid})")
                print(f"  Log: {self._log_file}")
                return
            time.sleep(1)

        # Server failed to start
        self.stop_server()
        raise AssetRipperError(
            f"Server failed to start within 30 seconds.\n"
            f"Check log file: {self._log_file}"
        )

    def stop_server(self):
        """Stop AssetRipper web API server."""
        if self._server_pid is None:
            return

        print("Stopping AssetRipper server...")
        try:
            # Try graceful termination
            subprocess.run(["taskkill", "/PID", str(self._server_pid)], check=False)
            time.sleep(2)
            # Force kill if still running
            subprocess.run(["taskkill", "/F", "/PID", str(self._server_pid)], check=False)
        except Exception as e:
            print(f"Warning: Error stopping server: {e}")
        finally:
            self._server_pid = None

    def _api_post(self, endpoint: str, data: dict, timeout: int = None):
        """Make POST request to AssetRipper API."""
        url = f"http://localhost:{self.port}{endpoint}"

        # Build curl command
        cmd = ["curl", "-s", "-w", "\\n%{http_code}", "-X", "POST", url]
        cmd.extend(["-H", "Content-Type: application/x-www-form-urlencoded"])

        if timeout:
            cmd.extend(["--max-time", str(timeout)])

        # Add form data
        for key, value in data.items():
            cmd.extend(["--data-urlencode", f"{key}={value}"])

        result = subprocess.run(cmd, capture_output=True, text=True)
        lines = result.stdout.rsplit("\n", 1)
        status_code = int(lines[-1]) if lines[-1].isdigit() else 0

        return status_code

    def _load_files(self, source_dir: Path):
        """Load game files into AssetRipper."""
        print(f"Loading files from: {source_dir}")

        status_code = self._api_post("/LoadFolder", {"path": str(source_dir.absolute())})

        if status_code != 302:  # AssetRipper returns 302 redirect on success
            raise AssetRipperError(f"Failed to load files. HTTP status: {status_code}")

        print("✓ Files loaded successfully. Processing...")
        time.sleep(5)

    def _export_files(self, target_dir: Path):
        """Export loaded files to Unity project."""
        print(f"Starting export to: {target_dir}")

        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)

        # Start export with short timeout (API blocks until completion)
        status_code = self._api_post(
            "/Export/UnityProject",
            {"path": str(target_dir.absolute())},
            timeout=10
        )

        # Status 0 = curl timeout (expected for long exports)
        # Status 302 = immediate success
        if status_code not in (0, 302):
            raise AssetRipperError(f"Failed to start export. HTTP status: {status_code}")

        print("✓ Export started successfully")

    def _monitor_export(self):
        """Monitor export progress by watching log file."""
        if not self._log_file or not self._log_file.exists():
            print("Warning: Log file not available, skipping progress monitoring")
            return

        print(f"Monitoring export progress (timeout: {self.timeout}s)...")
        print("This may take 15-30 minutes. Progress updates every 30 seconds...")

        poll_interval = 5
        wait_time = 0

        while wait_time < self.timeout:
            time.sleep(poll_interval)
            wait_time += poll_interval

            # Show progress periodically
            if wait_time % 30 == 0:
                print(f"  Still exporting... ({wait_time}s elapsed)")

            # Check log for completion
            try:
                with self._log_file.open("rb") as f:
                    # Read last 10KB of log
                    f.seek(0, 2)
                    file_size = f.tell()
                    read_size = min(10240, file_size)
                    f.seek(max(0, file_size - read_size))
                    log_tail = f.read().decode("utf-8", errors="ignore")

                # Check for completion markers
                if "Finished post-export" in log_tail or "Finished exporting assets" in log_tail:
                    print("✓ Export completed successfully!")
                    return

            except Exception as e:
                print(f"Debug: Error reading log: {e}")

        raise AssetRipperError(
            f"Export timed out after {self.timeout} seconds.\n"
            f"Export may still be running. Check log: {self._log_file}"
        )

    def extract(self, source_dir: Path, target_dir: Path, log_dir: Path):
        """Extract game assets to Unity project.

        Args:
            source_dir: Game data directory (e.g., Ancient Kingdoms/ancientkingdoms_Data)
            target_dir: Output directory for Unity project
            log_dir: Directory for logs
        """
        print("=" * 60)
        print("AssetRipper Asset Extraction")
        print("=" * 60)
        print(f"Source: {source_dir}")
        print(f"Target: {target_dir}")
        print()

        if not source_dir.exists():
            raise AssetRipperError(f"Source directory not found: {source_dir}")

        try:
            # Start server
            self.start_server(log_dir=log_dir)

            # Load files
            self._load_files(source_dir)

            # Export
            self._export_files(target_dir)

            # Monitor
            self._monitor_export()

            print()
            print("=" * 60)
            print("✓ Asset extraction complete!")
            print(f"  Unity project: {target_dir}")
            print(f"  Log file: {self._log_file}")
            print("=" * 60)

        finally:
            # Always stop server
            self.stop_server()


def main():
    """Main entry point."""
    # Fix Windows console encoding for Unicode characters
    import sys
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding='utf-8')
            sys.stderr.reconfigure(encoding='utf-8')
        except AttributeError:
            import io
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    # Configuration
    assetripper_path = Path(os.environ.get(
        "ASSETRIPPER_PATH",
        "E:/Projects/AssetRipper_win_x64/AssetRipper.GUI.Free.exe"
    ))

    game_install_dir = Path(os.environ.get(
        "ANCIENT_KINGDOMS_PATH",
        "E:/SteamLibrary/steamapps/common/Ancient Kingdoms"
    ))

    # Paths
    project_root = Path(__file__).parent.parent
    source_dir = game_install_dir / "ancientkingdoms_Data"
    timestamp = datetime.now().strftime("%Y_%m_%d")
    # AssetRipper creates ExportedProject and AuxiliaryFiles subdirectories
    target_dir = Path(f"E:/Projects/{timestamp}_AncientKingdoms_AssetRipper")
    log_dir = project_root / "logs" / "assetripper"

    # Run extraction
    try:
        assetripper = AssetRipper(
            executable_path=assetripper_path,
            port=8080,
            timeout=3600,  # 1 hour
        )

        assetripper.extract(
            source_dir=source_dir,
            target_dir=target_dir,
            log_dir=log_dir,
        )

        return 0

    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        return 130
    except AssetRipperError as e:
        print(f"\n✗ Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
