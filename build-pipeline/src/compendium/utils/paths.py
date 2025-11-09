"""Path utilities for finding project directories."""

from pathlib import Path


def find_repo_root(start_path: Path | None = None) -> Path:
    """Find the repository root by looking for marker files.

    Args:
        start_path: Path to start searching from. Defaults to this file's location.

    Returns:
        Path to the repository root.

    Raises:
        RuntimeError: If repository root cannot be found.
    """
    if start_path is None:
        start_path = Path(__file__).resolve()

    # Marker files that indicate repository root
    markers = [
        ".git",
        "AncientKingdomsMods.sln",
        "Local.props",
        "Local.props.example",
    ]

    current = start_path if start_path.is_dir() else start_path.parent

    # Walk up the directory tree
    for _ in range(10):  # Limit search depth to avoid infinite loops
        # Check if any marker exists in current directory
        if any((current / marker).exists() for marker in markers):
            return current

        # Move up one directory
        parent = current.parent
        if parent == current:
            # Reached filesystem root
            break
        current = parent

    raise RuntimeError(
        f"Could not find repository root starting from {start_path}. "
        f"Looking for one of: {', '.join(markers)}"
    )


def get_repo_root() -> Path:
    """Get the repository root directory.

    This is a convenience wrapper around find_repo_root() that uses
    the current file's location as the starting point.

    Returns:
        Path to the repository root.
    """
    return find_repo_root()
