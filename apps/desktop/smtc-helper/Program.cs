using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Windows.Media.Control;
using System.IO;
using System.Runtime.InteropServices;

namespace SmtcHelper
{
    [ComImport]
    [Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    public class MMDeviceEnumeratorComObject { }

    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDeviceEnumerator
    {
        int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IntPtr ppDevices);
        int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppEndpoint);
        int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string pwstrId, out IMMDevice ppDevice);
        int RegisterEndpointNotificationCallback(IntPtr pClient);
        int UnregisterEndpointNotificationCallback(IntPtr pClient);
    }

    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDevice
    {
        int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
        int OpenPropertyStore(int stgmAccess, out IntPtr ppProperties);
        int GetId([MarshalAs(UnmanagedType.LPWStr)] out string ppstrId);
        int GetState(out int pdwState);
    }

    [Guid("5CDF2C82-841E-4546-9722-0CF740782F0A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioEndpointVolume
    {
        int RegisterControlChangeNotify(IntPtr pNotify);
        int UnregisterControlChangeNotify(IntPtr pNotify);
        int GetChannelCount(out uint pnChannelCount);
        int SetMasterVolumeLevel(float fLevelDB, ref Guid pguidEventContext);
        int SetMasterVolumeLevelScalar(float fLevel, ref Guid pguidEventContext);
        int GetMasterVolumeLevel(out float pfLevelDB);
        int GetMasterVolumeLevelScalar(out float pfLevel);
        int SetChannelVolumeLevel(uint nChannel, float fLevelDB, ref Guid pguidEventContext);
        int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, ref Guid pguidEventContext);
        int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
        int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
        int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, ref Guid pguidEventContext);
        int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
        int GetVolumeStepInfo(out uint pnStep, out uint pnStepCount);
        int VolumeStepUp(ref Guid pguidEventContext);
        int VolumeStepDown(ref Guid pguidEventContext);
        int QueryHardwareSupport(out uint pdwHardwareSupportMask);
        int GetVolumeRange(out float pflVolumeMindB, out float pflVolumeMaxdB, out float pflVolumeIncrementdB);
    }

    public static class AudioManager
    {
        private static readonly Guid IID_IAudioEndpointVolume = new Guid("5CDF2C82-841E-4546-9722-0CF740782F0A");

        public static (int volume, bool isMuted) GetMasterVolume()
        {
            try
            {
                var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
                if (enumerator.GetDefaultAudioEndpoint(0 /* eRender */, 1 /* eMultimedia */, out IMMDevice dev) == 0 && dev != null)
                {
                    Guid iid = IID_IAudioEndpointVolume;
                    if (dev.Activate(ref iid, 1 /* CLSCTX_INPROC_SERVER */, IntPtr.Zero, out object epVolObj) == 0 && epVolObj is IAudioEndpointVolume epVol)
                    {
                        epVol.GetMasterVolumeLevelScalar(out float level);
                        epVol.GetMute(out bool isMuted);
                        return ((int)Math.Round(level * 100f), isMuted);
                    }
                }
            }
            catch
            {
                // Fallback on transient error
            }
            return (100, false);
        }

        public static void SetMasterVolume(int volumePercent)
        {
            try
            {
                var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
                if (enumerator.GetDefaultAudioEndpoint(0, 1, out IMMDevice dev) == 0 && dev != null)
                {
                    Guid iid = IID_IAudioEndpointVolume;
                    if (dev.Activate(ref iid, 1, IntPtr.Zero, out object epVolObj) == 0 && epVolObj is IAudioEndpointVolume epVol)
                    {
                        Guid guid = Guid.Empty;
                        float scalar = Math.Clamp(volumePercent / 100f, 0f, 1f);
                        epVol.SetMasterVolumeLevelScalar(scalar, ref guid);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[AudioManager] SetMasterVolume error: {ex.Message}");
            }
        }
    }

    class Program
    {
        private static GlobalSystemMediaTransportControlsSessionManager? _sessionManager;
        private static GlobalSystemMediaTransportControlsSession? _currentSession;
        private static readonly object _lock = new object();
        private static string _lastBroadcastJson = "";
        private static string _lastTrackKey = "";
        private static int _lastVolume = -1;

        static async Task Main(string[] args)
        {
            try
            {
                _sessionManager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
                if (_sessionManager == null)
                {
                    Console.Error.WriteLine("Failed to get SessionManager");
                    return;
                }

                _sessionManager.CurrentSessionChanged += OnCurrentSessionChanged;
                
                await UpdateCurrentSessionAsync();

                // High-frequency polling loop (200ms) to ensure instantaneous track & volume sync
                _ = Task.Run(async () =>
                {
                    while (true)
                    {
                        try
                        {
                            await Task.Delay(200);
                            await BroadcastStateAsync(false);
                        }
                        catch
                        {
                            // Ignore transient polling exceptions
                        }
                    }
                });

                // Stdin reader for incoming IPC commands from Electron (e.g. setVolume)
                using (var reader = new StreamReader(Console.OpenStandardInput()))
                {
                    string? line;
                    while ((line = reader.ReadLine()) != null)
                    {
                        try
                        {
                            if (string.IsNullOrWhiteSpace(line)) continue;
                            if (line == "stop") break;

                            using var doc = JsonDocument.Parse(line);
                            var root = doc.RootElement;
                            if (root.TryGetProperty("action", out var actionProp))
                            {
                                string action = actionProp.GetString() ?? "";
                                if (action == "setVolume" && root.TryGetProperty("volume", out var volProp))
                                {
                                    int targetVol = volProp.GetInt32();
                                    AudioManager.SetMasterVolume(targetVol);
                                    _ = BroadcastStateAsync(false);
                                }
                            }
                        }
                        catch
                        {
                            // Ignore malformed commands
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Fatal Error: {ex.Message}");
            }
        }

        private static async void OnCurrentSessionChanged(GlobalSystemMediaTransportControlsSessionManager sender, CurrentSessionChangedEventArgs args)
        {
            await UpdateCurrentSessionAsync();
        }

        private static async Task UpdateCurrentSessionAsync()
        {
            GlobalSystemMediaTransportControlsSession? oldSession = null;
            GlobalSystemMediaTransportControlsSession? newSession = null;

            lock (_lock)
            {
                oldSession = _currentSession;
                newSession = _sessionManager?.GetCurrentSession();
                _currentSession = newSession;
            }

            if (oldSession != null)
            {
                oldSession.MediaPropertiesChanged -= OnMediaPropertiesChanged;
                oldSession.PlaybackInfoChanged -= OnPlaybackInfoChanged;
                oldSession.TimelinePropertiesChanged -= OnTimelinePropertiesChanged;
            }

            if (newSession != null)
            {
                newSession.MediaPropertiesChanged += OnMediaPropertiesChanged;
                newSession.PlaybackInfoChanged += OnPlaybackInfoChanged;
                newSession.TimelinePropertiesChanged += OnTimelinePropertiesChanged;
            }

            await BroadcastStateAsync(true);
        }

        private static async void OnMediaPropertiesChanged(GlobalSystemMediaTransportControlsSession sender, MediaPropertiesChangedEventArgs args)
        {
            await BroadcastStateAsync(true);
        }

        private static async void OnPlaybackInfoChanged(GlobalSystemMediaTransportControlsSession sender, PlaybackInfoChangedEventArgs args)
        {
            await BroadcastStateAsync(true);
        }

        private static async void OnTimelinePropertiesChanged(GlobalSystemMediaTransportControlsSession sender, TimelinePropertiesChangedEventArgs args)
        {
            await BroadcastStateAsync(false);
        }

        private static async Task BroadcastStateAsync(bool force)
        {
            try
            {
                GlobalSystemMediaTransportControlsSession? session;
                lock (_lock)
                {
                    session = _currentSession;
                    if (session == null && _sessionManager != null)
                    {
                        session = _sessionManager.GetCurrentSession();
                        _currentSession = session;
                    }
                }

                var (masterVol, isMuted) = AudioManager.GetMasterVolume();
                bool isVolChanged = masterVol != _lastVolume;

                if (session == null)
                {
                    string fallbackJson = $@"{{""type"":""update"",""session"":null,""volume"":{{""master"":{masterVol},""isMuted"":{(isMuted ? "true" : "false")}}}}}";
                    if (force || isVolChanged || _lastBroadcastJson != fallbackJson)
                    {
                        _lastBroadcastJson = fallbackJson;
                        _lastVolume = masterVol;
                        Console.WriteLine(fallbackJson);
                        Console.Out.Flush();
                    }
                    return;
                }

                var mediaProps = await session.TryGetMediaPropertiesAsync();
                var playbackInfo = session.GetPlaybackInfo();
                var timelineInfo = session.GetTimelineProperties();

                string rawTitle = mediaProps?.Title ?? "";
                string rawArtist = mediaProps?.Artist ?? "";
                string trackKey = $"{rawTitle}|{rawArtist}";
                bool isNewTrack = trackKey != _lastTrackKey;

                string? thumbnailBase64 = null;
                if (mediaProps?.Thumbnail != null)
                {
                    try
                    {
                        using var cts = new CancellationTokenSource(isNewTrack ? 250 : 100);
                        using var stream = await mediaProps.Thumbnail.OpenReadAsync().AsTask(cts.Token);
                        if (stream != null && stream.Size > 0)
                        {
                            using var memStream = new MemoryStream();
                            var classicStream = stream.AsStreamForRead();
                            await classicStream.CopyToAsync(memStream, cts.Token);
                            var bytes = memStream.ToArray();
                            if (bytes.Length > 0)
                            {
                                thumbnailBase64 = Convert.ToBase64String(bytes);
                            }
                        }
                    }
                    catch
                    {
                        // Thumbnail extraction timed out or locked — non-fatal, metadata still broadcasts immediately
                    }
                }

                string sourceAppId = JsonEscape(session.SourceAppUserModelId);
                string title = JsonEscape(rawTitle);
                string artist = JsonEscape(rawArtist);
                string albumTitle = JsonEscape(mediaProps?.AlbumTitle ?? "");
                string albumArtist = JsonEscape(mediaProps?.AlbumArtist ?? "");
                string thumb = thumbnailBase64 != null ? JsonEscape(thumbnailBase64) : "null";
                
                int pStatus = (int)(playbackInfo?.PlaybackStatus ?? 0);
                int pType = (int)(playbackInfo?.PlaybackType ?? 0);
                
                double pos = timelineInfo?.Position.TotalSeconds ?? 0;
                double dur = timelineInfo?.EndTime.TotalSeconds ?? 0;

                string json = $@"{{""type"":""update"",""session"":{{""sourceAppId"":{sourceAppId},""media"":{{""title"":{title},""artist"":{artist},""albumTitle"":{albumTitle},""albumArtist"":{albumArtist},""thumbnailBase64"":{thumb}}},""playback"":{{""playbackStatus"":{pStatus},""playbackType"":{pType}}},""timeline"":{{""position"":{pos},""duration"":{dur}}},""volume"":{{""master"":{masterVol},""isMuted"":{(isMuted ? "true" : "false")}}}}}}}";

                string cleanJson = json.Replace("\r", "").Replace("\n", "");
                if (force || isNewTrack || isVolChanged || cleanJson != _lastBroadcastJson)
                {
                    _lastBroadcastJson = cleanJson;
                    _lastTrackKey = trackKey;
                    _lastVolume = masterVol;
                    Console.WriteLine(cleanJson);
                    Console.Out.Flush();
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Broadcast Error: {ex.Message}");
            }
        }

        private static string JsonEscape(string value)
        {
            if (value == null) return "null";
            return "\"" + value
                .Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\b", "\\b")
                .Replace("\f", "\\f")
                .Replace("\n", "\\n")
                .Replace("\r", "\\r")
                .Replace("\t", "\\t") + "\"";
        }

    }
}
