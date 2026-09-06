using System;
using System.IO;

namespace BuildTool.Game;

/// <summary>Holds the installation and endpoint locks for one game session.</summary>
internal sealed class SessionOwnership : IDisposable
{
    private const string InstallationLockFileName = ".ancient-kingdoms-build-tool.lock";
    private const string EndpointLockDirectoryName = "ancient-kingdoms-build-tool";

    private readonly FileStream _installationLock;
    private readonly FileStream _endpointLock;
    private bool _disposed;

    private SessionOwnership(FileStream installationLock, FileStream endpointLock)
    {
        _installationLock = installationLock;
        _endpointLock = endpointLock;
    }

    internal static SessionOwnership Acquire(string gamePath, Uri endpoint)
    {
        var installationRoot = CanonicalDirectory(gamePath, rejectFinalSymlink: true);
        var installationLockPath = Path.Combine(installationRoot, InstallationLockFileName);
        EnsureOwnedPath(installationRoot, installationLockPath);

        var installationLock = AcquireFileLock(installationLockPath);
        try
        {
            var endpointRoot = EndpointLockRoot();
            var endpointLockPath = Path.Combine(endpointRoot, EndpointFileName(endpoint));
            EnsureOwnedPath(endpointRoot, endpointLockPath);
            var endpointLock = AcquireFileLock(endpointLockPath);
            return new SessionOwnership(installationLock, endpointLock);
        }
        catch
        {
            installationLock.Dispose();
            throw;
        }
    }

    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;
        Exception? first = null;
        try { _endpointLock.Dispose(); }
        catch (Exception exception) { first = exception; }
        try { _installationLock.Dispose(); }
        catch (Exception exception) { first ??= exception; }
        if (first is not null)
            throw first;
    }

    private static FileStream AcquireFileLock(string path)
    {
        if (IsSymlink(path))
            throw new IOException($"Owned lock path is a symlink: {path}");

        FileStream stream;
        try
        {
            // OpenOrCreate treats an unlocked leftover as stale. The file is never deleted,
            // so another process cannot replace an inode while this session holds it.
            stream = new FileStream(
                path,
                FileMode.OpenOrCreate,
                FileAccess.ReadWrite,
                FileShare.None,
                bufferSize: 1,
                FileOptions.None);
        }
        catch (IOException exception)
        {
            throw new SessionLockBusyException(path, exception);
        }

        return stream;
    }

    private static string EndpointLockRoot()
    {
        var root = Path.Combine(Path.GetTempPath(), EndpointLockDirectoryName);
        Directory.CreateDirectory(root);
        return CanonicalDirectory(root, rejectFinalSymlink: true);
    }

    private static string EndpointFileName(Uri endpoint)
    {
        return $"endpoint-{endpoint.Port}.lock";
    }

    private static string CanonicalDirectory(string path, bool rejectFinalSymlink)
    {
        var fullPath = Path.GetFullPath(path);
        if (!Directory.Exists(fullPath))
            throw new DirectoryNotFoundException($"Owned directory not found: {fullPath}");

        if (rejectFinalSymlink && IsSymlink(fullPath))
            throw new IOException($"Owned directory is a symlink: {fullPath}");

        var current = Path.GetPathRoot(fullPath)!;
        var remainder = fullPath[current.Length..]
            .Split(Path.DirectorySeparatorChar, StringSplitOptions.RemoveEmptyEntries);
        foreach (var part in remainder)
        {
            current = Path.Combine(current, part);
            if (!Directory.Exists(current))
                throw new DirectoryNotFoundException($"Owned directory not found: {current}");

            var target = new DirectoryInfo(current).ResolveLinkTarget(returnFinalTarget: false);
            if (target is not null)
                current = Path.GetFullPath(target.FullName);
        }

        return Path.GetFullPath(current);
    }

    private static void EnsureOwnedPath(string root, string path)
    {
        var fullRoot = Path.GetFullPath(root)
            .TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var fullPath = Path.GetFullPath(path);
        var relative = Path.GetRelativePath(fullRoot, fullPath);
        if (relative == ".." || relative.StartsWith(".." + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            throw new IOException($"Owned lock path escapes its root: {fullPath}");
        if (IsSymlink(fullPath))
            throw new IOException($"Owned lock path is a symlink: {fullPath}");
    }

    private static bool IsSymlink(string path)
    {
        try
        {
            var attributes = File.GetAttributes(path);
            if ((attributes & FileAttributes.ReparsePoint) != 0)
                return true;
        }
        catch (FileNotFoundException)
        {
            // LinkTarget can still identify a broken symlink.
        }
        catch (DirectoryNotFoundException)
        {
            // LinkTarget can still identify a broken symlink.
        }

        return new FileInfo(path).LinkTarget is not null
            || new DirectoryInfo(path).LinkTarget is not null;
    }

    internal sealed class SessionLockBusyException : IOException
    {
        internal SessionLockBusyException(string path, Exception inner)
            : base($"Session lock is already held: {path}", inner)
        {
            Path = path;
        }

        internal string Path { get; }
    }
}
