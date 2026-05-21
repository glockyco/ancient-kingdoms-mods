using System.Threading;
using System.Threading.Tasks;

namespace BuildTool.Abstractions;

public interface IProcessRunner
{
    Task<ProcessResult> RunAsync(ProcessRequest request, CancellationToken cancellationToken);
}
