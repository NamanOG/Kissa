using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using Windows.ApplicationModel;

namespace SmtcHelper
{
    /// <summary>
    /// One-shot commands Kissa runs through this helper when it needs a Windows
    /// API that Electron has no binding for. Each prints a single JSON line and
    /// exits; none of them start the media session loop.
    ///
    ///   --package-info            is Kissa running as a Microsoft Store (MSIX) package?
    ///   --startup-task get        state of the package's "start at sign-in" task
    ///   --startup-task enable
    ///   --startup-task disable
    ///
    /// These matter only for the Store build: a packaged app has an identity,
    /// its registry and AppData writes are redirected, and "start with Windows"
    /// goes through a StartupTask instead of the Run registry key. The helper
    /// inherits the package identity because Kissa launches it as a child.
    /// </summary>
    internal static class HostCommands
    {
        /// <summary>The TaskId declared in the Store package manifest.</summary>
        private const string StartupTaskId = "KissaStartup";

        private const int APPMODEL_ERROR_NO_PACKAGE = 15700;
        private const int ERROR_INSUFFICIENT_BUFFER = 122;

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = false)]
        private static extern int GetCurrentPackageFamilyName(ref uint packageFamilyNameLength, StringBuilder? packageFamilyName);

        /// <summary>True when the first argument is one of the commands above.</summary>
        public static bool Handles(string[] args) =>
            args.Length > 0 && (args[0] == "--package-info" || args[0] == "--startup-task");

        public static async Task<int> RunAsync(string[] args)
        {
            Console.OutputEncoding = Encoding.UTF8;
            try
            {
                if (args[0] == "--package-info")
                {
                    string? family = GetPackageFamilyName();
                    Print(family == null
                        ? "{\"packaged\":false,\"familyName\":null}"
                        : "{\"packaged\":true,\"familyName\":\"" + Escape(family) + "\"}");
                    return 0;
                }

                // --startup-task <get|enable|disable>
                string verb = args.Length > 1 ? args[1] : "get";
                if (GetPackageFamilyName() == null)
                {
                    Print("{\"ok\":false,\"state\":\"unavailable\",\"enabled\":false,\"error\":\"not_packaged\"}");
                    return 0;
                }

                StartupTask task = await StartupTask.GetAsync(StartupTaskId);
                if (verb == "enable")
                {
                    // For a desktop app this enables silently, unless the user has
                    // switched the task off in Task Manager or Settings — in which
                    // case only they can switch it back on.
                    await task.RequestEnableAsync();
                }
                else if (verb == "disable")
                {
                    task.Disable();
                }

                StartupTaskState state = task.State;
                bool enabled = state == StartupTaskState.Enabled || state == StartupTaskState.EnabledByPolicy;
                Print("{\"ok\":true,\"state\":\"" + state + "\",\"enabled\":" + (enabled ? "true" : "false") + "}");
                return 0;
            }
            catch (Exception ex)
            {
                Print("{\"ok\":false,\"state\":\"error\",\"enabled\":false,\"error\":\"" + Escape(ex.Message) + "\"}");
                return 0;
            }
        }

        /// <summary>The package family name, or null when not running inside a package.</summary>
        private static string? GetPackageFamilyName()
        {
            uint length = 0;
            int rc = GetCurrentPackageFamilyName(ref length, null);
            if (rc == APPMODEL_ERROR_NO_PACKAGE || rc != ERROR_INSUFFICIENT_BUFFER || length == 0)
            {
                return null;
            }

            var buffer = new StringBuilder((int)length);
            rc = GetCurrentPackageFamilyName(ref length, buffer);
            return rc == 0 ? buffer.ToString() : null;
        }

        // JSON is written by hand: this helper is published trimmed, and
        // reflection-based serialisation does not survive trimming.
        private static string Escape(string value)
        {
            var sb = new StringBuilder(value.Length + 8);
            foreach (char c in value)
            {
                if (c == '\\' || c == '"')
                {
                    sb.Append('\\').Append(c);
                }
                else if (c < 0x20)
                {
                    sb.Append(' ');
                }
                else
                {
                    sb.Append(c);
                }
            }
            return sb.ToString();
        }

        private static void Print(string json)
        {
            Console.WriteLine(json);
            Console.Out.Flush();
        }
    }
}
