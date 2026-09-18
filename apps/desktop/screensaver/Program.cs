using System;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;

namespace KissaScreensaver
{
    class Program
    {
        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern int MessageBoxW(IntPtr hWnd, string text, string caption, uint type);

        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        private const uint MB_OK = 0x00000000;
        private const uint MB_ICONINFORMATION = 0x00000040;

        [DllImport("shell32.dll")]
        private static extern int SHQueryUserNotificationState(out QUERY_USER_NOTIFICATION_STATE pquns);

        private enum QUERY_USER_NOTIFICATION_STATE
        {
            QUNS_NOT_PRESENT = 1,
            QUNS_BUSY = 2,
            QUNS_RUNNING_D3D_FULL_SCREEN = 3,
            QUNS_PRESENTATION_MODE = 4,
            QUNS_ACCEPTS_NOTIFICATIONS = 5,
            QUNS_QUIET_TIME = 6,
            QUNS_APP = 7
        }

        private static string GetScreensaverPipeName()
        {
            string username = (Environment.GetEnvironmentVariable("USERNAME") ?? Environment.UserName ?? "default").ToLowerInvariant();
            using (var sha256 = SHA256.Create())
            {
                byte[] bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(username));
                var sb = new StringBuilder(16);
                for (int i = 0; i < 8; i++) // 8 bytes = 16 hex digits
                {
                    sb.Append(bytes[i].ToString("x2"));
                }
                return $"kissa-screensaver-{sb}";
            }
        }

        private static bool IsExternalFullscreenOrPresentation()
        {
            try
            {
                if (SHQueryUserNotificationState(out var state) == 0)
                {
                    if (state == QUERY_USER_NOTIFICATION_STATE.QUNS_RUNNING_D3D_FULL_SCREEN ||
                        state == QUERY_USER_NOTIFICATION_STATE.QUNS_PRESENTATION_MODE)
                    {
                        return true;
                    }
                }
            }
            catch
            {
                // Fallback to false if query fails
            }
            return false;
        }

        private static readonly System.Collections.Generic.HashSet<string> AllowedKissaProcessNames = new(StringComparer.OrdinalIgnoreCase)
        {
            "kissa",
            "electron"
        };

        private static readonly System.Collections.Generic.HashSet<string> KnownVideoProcessNames = new(StringComparer.OrdinalIgnoreCase)
        {
            "vlc", "vlc64", "mpc-hc", "mpc-hc64", "mpc-be", "mpc-be64",
            "potplayer", "potplayermini", "potplayermini64", "kmplayer", "kmplayer64",
            "gom", "gom64", "kodi", "plex", "plexmediaplayer", "mpv", "netflix",
            "zunevideo", "movies", "video.ui"
        };

        private static readonly System.Collections.Generic.HashSet<string> KnownBrowserProcessNames = new(StringComparer.OrdinalIgnoreCase)
        {
            "chrome", "msedge", "firefox", "brave", "opera", "opera_gx",
            "vivaldi", "arc", "waterfox", "librewolf", "floorp", "tor", "chromium"
        };

        private static string? GetForegroundProcessName()
        {
            try
            {
                IntPtr hWnd = GetForegroundWindow();
                if (hWnd == IntPtr.Zero)
                {
                    return null;
                }

                if (GetWindowThreadProcessId(hWnd, out uint pid) == 0 || pid == 0)
                {
                    return "unknown";
                }

                using var proc = System.Diagnostics.Process.GetProcessById((int)pid);
                return proc.ProcessName.ToLowerInvariant();
            }
            catch
            {
                return "unknown";
            }
        }

        private static bool IsProcessVideoOrBrowser(string? procName)
        {
            if (string.IsNullOrEmpty(procName)) return false;

            // Fail closed if process could not be determined
            if (procName == "unknown") return true;

            // Allowed Kissa processes
            if (AllowedKissaProcessNames.Contains(procName)) return false;

            // Check known video players (exact or prefixed)
            if (KnownVideoProcessNames.Contains(procName) ||
                procName.StartsWith("mpc-", StringComparison.OrdinalIgnoreCase) ||
                procName.StartsWith("potplayer", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            // Check browsers
            if (KnownBrowserProcessNames.Contains(procName) ||
                procName.StartsWith("chrome", StringComparison.OrdinalIgnoreCase) ||
                procName.StartsWith("msedge", StringComparison.OrdinalIgnoreCase) ||
                procName.StartsWith("firefox", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            return false;
        }

        [STAThread]
        static int Main(string[] args)
        {
            try
            {
                string pipeName = GetScreensaverPipeName();

                if (args.Length > 0)
                {
                    string firstArg = args[0].ToLowerInvariant().Trim();

                    // /p <HWND> - Preview mode: exit cleanly to prevent preview crash
                    if (firstArg.StartsWith("/p") || firstArg.StartsWith("-p"))
                    {
                        return 0;
                    }

                    // /c - Configure mode
                    if (firstArg.StartsWith("/c") || firstArg.StartsWith("-c"))
                    {
                        return HandleConfigure(pipeName);
                    }

                    // /s - Start screensaver mode
                    if (firstArg.StartsWith("/s") || firstArg.StartsWith("-s"))
                    {
                        return HandleScreensaver(pipeName);
                    }
                }

                // No arguments or unrecognized flag: treat as configure mode
                return HandleConfigure(pipeName);
            }
            catch
            {
                // Fail closed silently with code 0
                return 0;
            }
        }

        private static int HandleScreensaver(string pipeName)
        {
            // Sample foreground window
            string? foregroundProc = GetForegroundProcessName();

            // If an external process is in foreground, ensure it is not video/browser and not in exclusive 3D game/presentation
            if (!AllowedKissaProcessNames.Contains(foregroundProc ?? ""))
            {
                if (IsProcessVideoOrBrowser(foregroundProc))
                {
                    return 0;
                }

                if (IsExternalFullscreenOrPresentation())
                {
                    return 0;
                }
            }

            try
            {
                using var pipe = new NamedPipeClientStream(".", pipeName, PipeDirection.InOut, PipeOptions.Asynchronous);

                try
                {
                    // Fail-closed: 250ms timeout ensures instant exit if Kissa is closed
                    pipe.Connect(250);
                }
                catch
                {
                    // Kissa is closed or pipe is not listening: exit immediately with code 0.
                    // Kissa.scr must NEVER launch Kissa.exe.
                    return 0;
                }

                using var reader = new StreamReader(pipe, Encoding.UTF8);
                using var writer = new StreamWriter(pipe, Encoding.UTF8) { AutoFlush = true };

                EventHandler exitHandler = (s, e) => { try { pipe.Dispose(); } catch { } };
                AppDomain.CurrentDomain.ProcessExit += exitHandler;

                try
                {
                    // Re-sample foreground immediately before request to guard against race conditions
                    foregroundProc = GetForegroundProcessName();
                    if (!AllowedKissaProcessNames.Contains(foregroundProc ?? ""))
                    {
                        if (IsProcessVideoOrBrowser(foregroundProc) || IsExternalFullscreenOrPresentation())
                        {
                            return 0;
                        }
                    }

                    // Request screensaver activation with foreground context
                    writer.WriteLine($"{{\"action\":\"activate\",\"foregroundProcess\":\"{foregroundProc ?? ""}\"}}");

                    var readTask = reader.ReadLineAsync();
                    if (!readTask.Wait(3000))
                    {
                        return 0; // Fail closed if Kissa does not respond in 3 seconds
                    }

                    string? response = readTask.Result;
                    if (string.IsNullOrEmpty(response) || 
                        (!response.Contains("\"status\":\"activated\"") && !response.Contains("\"status\":\"already_active\"")))
                    {
                        // Music not playing, video playing, window not ready, or rejected: fail closed
                        return 0;
                    }

                    // Screensaver has been activated in Kissa's window on the user's interactive desktop.
                    // We must exit the .scr process immediately with code 0 so that Windows unblanks the screen
                    // and returns control to the user's interactive desktop where Kissa's fullscreen Listening Display
                    // is running. Remaining in a blocking loop keeps Windows trapped on the blank ScreenSaver desktop.
                    return 0;
                }
                finally
                {
                    AppDomain.CurrentDomain.ProcessExit -= exitHandler;
                }
            }
            catch
            {
                return 0;
            }
        }

        private static int HandleConfigure(string pipeName)
        {
            try
            {
                using var pipe = new NamedPipeClientStream(".", pipeName, PipeDirection.InOut, PipeOptions.Asynchronous);

                try
                {
                    pipe.Connect(250);
                    using var writer = new StreamWriter(pipe, Encoding.UTF8) { AutoFlush = true };
                    writer.WriteLine("{\"action\":\"configure\"}");
                    return 0;
                }
                catch
                {
                    // Kissa is closed: do NOT launch Kissa.exe. Display informative native dialog.
                    MessageBoxW(
                        IntPtr.Zero,
                        "Kissa is not currently running.\n\nPlease open Kissa to adjust screensaver and player settings.",
                        "Kissa Screensaver",
                        MB_OK | MB_ICONINFORMATION
                    );
                    return 0;
                }
            }
            catch
            {
                return 0;
            }
        }
    }
}
