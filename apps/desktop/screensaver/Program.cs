using System;
using System.Diagnostics;
using System.IO;

namespace KissaScreensaver
{
    class Program
    {
        [STAThread]
        static int Main(string[] args)
        {
            try
            {
                // The base directory where this .scr/.exe resides
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string targetExe = Path.Combine(baseDir, "Kissa.exe");

                if (!File.Exists(targetExe))
                {
                    // Fallback to searching up just in case we are in development structure,
                    // but for production Kissa.exe will be right next to Kissa.scr.
                    return 1;
                }

                if (args.Length > 0)
                {
                    string firstArg = args[0].ToLowerInvariant().Trim();

                    // /p <HWND> - Preview mode
                    if (firstArg.StartsWith("/p") || firstArg.StartsWith("-p"))
                    {
                        // We intentionally do not embed the Electron BrowserWindow inside the HWND.
                        // We exit cleanly to prevent the Windows Screensaver Settings panel from crashing.
                        return 0;
                    }

                    // /c - Configure mode
                    if (firstArg.StartsWith("/c") || firstArg.StartsWith("-c"))
                    {
                        // Launch normal Kissa to show settings
                        Process.Start(new ProcessStartInfo
                        {
                            FileName = targetExe,
                            UseShellExecute = true
                        });
                        return 0;
                    }

                    // /s - Start screensaver mode
                    if (firstArg.StartsWith("/s") || firstArg.StartsWith("-s"))
                    {
                        ProcessStartInfo psi = new ProcessStartInfo
                        {
                            FileName = targetExe,
                            Arguments = "--screensaver",
                            UseShellExecute = false
                        };

                        using (Process? proc = Process.Start(psi))
                        {
                            if (proc != null)
                            {
                                // SUPERVISOR LIFECYCLE: Block and keep .scr alive while Electron renders.
                                proc.WaitForExit();
                                return proc.ExitCode;
                            }
                        }
                        return 1;
                    }
                }

                // No arguments - Treat as /c Configure Mode
                Process.Start(new ProcessStartInfo
                {
                    FileName = targetExe,
                    UseShellExecute = true
                });
                return 0;
            }
            catch (Exception)
            {
                // In a WinExe, writing to console silently fails unless redirected, which is safe.
                // We return a non-zero exit code on failure.
                return 1;
            }
        }
    }
}
