using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Windows.Media;
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
        private static GlobalSystemMediaTransportControlsSession? _authoritySession;
        private static GlobalSystemMediaTransportControlsSession? _challengerSession;
        private static DateTime _challengerSince = DateTime.MinValue;
        private static string _authorityTrackKey = "";
        private static string _lastResolverDiagnostic = "";

        private const int TierOneMusicAppScore = 80;
        private const int TierTwoMusicAppScore = 60;
        private const int DedicatedAppScore = 40;
        private const int BrowserScore = 0;
        private const int PlayingScore = 100;
        private const int MusicPlaybackTypeBonus = 25;
        private const int VideoPlaybackTypePenalty = -25;
        private const int ImagePlaybackTypePenalty = -50;
        private const int AuthorityBonus = 50;
        private static readonly TimeSpan ChallengerGracePeriod = TimeSpan.FromSeconds(8);

        private sealed class SessionCandidate
        {
            public GlobalSystemMediaTransportControlsSession Session { get; }
            public string AppId { get; }
            public GlobalSystemMediaTransportControlsSessionPlaybackStatus PlaybackStatus { get; }
            public MediaPlaybackType PlaybackType { get; }
            public int RawScore { get; }

            public SessionCandidate(
                GlobalSystemMediaTransportControlsSession session,
                string appId,
                GlobalSystemMediaTransportControlsSessionPlaybackStatus playbackStatus,
                MediaPlaybackType playbackType,
                int rawScore)
            {
                Session = session;
                AppId = appId;
                PlaybackStatus = playbackStatus;
                PlaybackType = playbackType;
                RawScore = rawScore;
            }
        }

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
                _sessionManager.SessionsChanged += OnSessionsChanged;
                
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
                    while ((line = await reader.ReadLineAsync()) != null)
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
                                else if (action == "playPause")
                                {
                                    var session = _currentSession ?? _authoritySession ?? _sessionManager?.GetCurrentSession();
                                    if (session != null)
                                    {
                                        try
                                        {
                                            var pInfo = session.GetPlaybackInfo();
                                            await session.TryTogglePlayPauseAsync().AsTask();

                                            await Task.Delay(50);
                                            await BroadcastStateAsync(true);
                                        }
                                        catch (Exception ex)
                                        {
                                            Console.Error.WriteLine($"[SMTC] playPause error: {ex.Message}");
                                        }
                                    }
                                }
                                else if (action == "next")
                                {
                                    var session = _currentSession ?? _authoritySession ?? _sessionManager?.GetCurrentSession();
                                    if (session != null)
                                    {
                                        try
                                        {
                                            await session.TrySkipNextAsync().AsTask();
                                            await Task.Delay(50);
                                            await BroadcastStateAsync(true);
                                        }
                                        catch (Exception ex)
                                        {
                                            Console.Error.WriteLine($"[SMTC] next error: {ex.Message}");
                                        }
                                    }
                                }
                                else if (action == "prev")
                                {
                                    var session = _currentSession ?? _authoritySession ?? _sessionManager?.GetCurrentSession();
                                    if (session != null)
                                    {
                                        try
                                        {
                                            await session.TrySkipPreviousAsync().AsTask();
                                            await Task.Delay(50);
                                            await BroadcastStateAsync(true);
                                        }
                                        catch (Exception ex)
                                        {
                                            Console.Error.WriteLine($"[SMTC] prev error: {ex.Message}");
                                        }
                                    }
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

        private static GlobalSystemMediaTransportControlsSession? GetBestSession()
        {
            if (_sessionManager == null) return null;

            try
            {
                var sessions = _sessionManager.GetSessions();
                var candidates = BuildCandidates(sessions);
                if (candidates.Count == 0)
                {
                    ReleaseAuthority();
                    LogResolverDecision(candidates, null, null);
                    return null;
                }

                var authority = FindCandidate(candidates, _authoritySession);
                if (authority != null && IsTerminal(authority.PlaybackStatus))
                {
                    ReleaseAuthority();
                    authority = null;
                }

                var bestCandidate = FindHighestRawScore(candidates);
                if (bestCandidate == null)
                {
                    ReleaseAuthority();
                    LogResolverDecision(candidates, null, null);
                    return null;
                }

                if (authority == null)
                {
                    PromoteAuthority(bestCandidate);
                    LogResolverDecision(candidates, bestCandidate, bestCandidate);
                    return bestCandidate.Session;
                }

                if (SessionsMatch(authority.Session, bestCandidate.Session) ||
                    bestCandidate.RawScore <= authority.RawScore ||
                    !CanChallengeAuthority(bestCandidate))
                {
                    ResetChallenger();
                    LogResolverDecision(candidates, authority, authority);
                    return authority.Session;
                }

                if (!SessionsMatch(_challengerSession, bestCandidate.Session))
                {
                    _challengerSession = bestCandidate.Session;
                    _challengerSince = DateTime.UtcNow;
                }

                bool isMusicApp = GetApplicationTierScore(bestCandidate.AppId) >= TierTwoMusicAppScore;

                if (isMusicApp || DateTime.UtcNow - _challengerSince >= ChallengerGracePeriod)
                {
                    PromoteAuthority(bestCandidate);
                    LogResolverDecision(candidates, bestCandidate, bestCandidate);
                    return bestCandidate.Session;
                }

                LogResolverDecision(candidates, authority, authority);
                return authority.Session;
            }
            catch
            {
                return _authoritySession ?? _sessionManager?.GetCurrentSession();
            }
        }

        private static List<SessionCandidate> BuildCandidates(IReadOnlyList<GlobalSystemMediaTransportControlsSession> sessions)
        {
            var candidates = new List<SessionCandidate>();

            foreach (var session in sessions)
            {
                try
                {
                    var playbackInfo = session.GetPlaybackInfo();
                    var playbackStatus = playbackInfo?.PlaybackStatus ?? GlobalSystemMediaTransportControlsSessionPlaybackStatus.Closed;
                    var playbackType = playbackInfo?.PlaybackType ?? MediaPlaybackType.Unknown;
                    var appId = session.SourceAppUserModelId?.ToLowerInvariant() ?? "";

                    candidates.Add(new SessionCandidate(
                        session,
                        appId,
                        playbackStatus,
                        playbackType,
                        CalculateRawScore(appId, playbackStatus, playbackType)));
                }
                catch
                {
                    // A session can disappear while Windows is enumerating it.
                }
            }

            return candidates;
        }

        private static int CalculateRawScore(
            string appId,
            GlobalSystemMediaTransportControlsSessionPlaybackStatus playbackStatus,
            MediaPlaybackType playbackType)
        {
            var score = GetApplicationTierScore(appId);

            if (playbackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing)
            {
                score += PlayingScore;
            }
            else if (IsTerminal(playbackStatus))
            {
                score -= PlayingScore;
            }

            score += playbackType switch
            {
                MediaPlaybackType.Music => MusicPlaybackTypeBonus,
                MediaPlaybackType.Video => VideoPlaybackTypePenalty,
                MediaPlaybackType.Image => ImagePlaybackTypePenalty,
                _ => 0
            };

            return score;
        }

        private static int GetApplicationTierScore(string appId)
        {
            var lowerAppId = appId.ToLowerInvariant();
            if (lowerAppId.Contains("spotify") || lowerAppId.Contains("itunes") || (lowerAppId.Contains("apple") && lowerAppId.Contains("music")))
            {
                return TierOneMusicAppScore;
            }

            if (lowerAppId.Contains("tidal") || lowerAppId.Contains("deezer") || lowerAppId.Contains("amazonmusic") ||
                lowerAppId.Contains("musicbee") || lowerAppId.Contains("foobar") || lowerAppId.Contains("winamp") ||
                lowerAppId.Contains("aimp") || lowerAppId.Contains("qobuz") || lowerAppId.Contains("mediamonkey"))
            {
                return TierTwoMusicAppScore;
            }

            return IsBrowser(lowerAppId) ? BrowserScore : DedicatedAppScore;
        }

        private static bool IsBrowser(string appId)
        {
            var lowerAppId = appId.ToLowerInvariant();
            return lowerAppId.Contains("chrome") || lowerAppId.Contains("edge") || lowerAppId.Contains("firefox") ||
                   lowerAppId.Contains("brave") || lowerAppId.Contains("opera") || lowerAppId.Contains("vivaldi") ||
                   lowerAppId.Contains("arc") || lowerAppId.Contains("comet");
        }

        private static bool CanChallengeAuthority(SessionCandidate candidate)
        {
            // Browser sessions share an app identifier across tabs. Do not displace an
            // established source with ambiguous browser media; a Music classification is
            // the minimum signal required for a browser to begin the grace period.
            return !IsBrowser(candidate.AppId) || candidate.PlaybackType == MediaPlaybackType.Music;
        }

        private static bool IsTerminal(GlobalSystemMediaTransportControlsSessionPlaybackStatus playbackStatus)
        {
            return playbackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Stopped ||
                   playbackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Closed;
        }

        private static SessionCandidate? FindCandidate(
            List<SessionCandidate> candidates,
            GlobalSystemMediaTransportControlsSession? session)
        {
            if (session == null) return null;
            foreach (var candidate in candidates)
            {
                if (SessionsMatch(candidate.Session, session)) return candidate;
            }
            return null;
        }

        private static SessionCandidate? FindHighestRawScore(List<SessionCandidate> candidates)
        {
            SessionCandidate? highest = null;
            foreach (var candidate in candidates)
            {
                if (highest == null || candidate.RawScore > highest.RawScore ||
                    (candidate.RawScore == highest.RawScore && SessionsMatch(candidate.Session, _authoritySession)))
                {
                    highest = candidate;
                }
            }
            return highest;
        }

        private static bool SessionsMatch(
            GlobalSystemMediaTransportControlsSession? left,
            GlobalSystemMediaTransportControlsSession? right)
        {
            return left != null && right != null && left == right;
        }

        private static void PromoteAuthority(SessionCandidate candidate)
        {
            _authoritySession = candidate.Session;
            _authorityTrackKey = "";
            ResetChallenger();
        }

        private static void ReleaseAuthority()
        {
            _authoritySession = null;
            _authorityTrackKey = "";
            ResetChallenger();
        }

        private static void ResetChallenger()
        {
            _challengerSession = null;
            _challengerSince = DateTime.MinValue;
        }

        private static void UpdateAuthorityTrack(GlobalSystemMediaTransportControlsSession session, string trackKey)
        {
            lock (_lock)
            {
                if (!SessionsMatch(session, _authoritySession)) return;
                if (!string.IsNullOrEmpty(_authorityTrackKey) && _authorityTrackKey != trackKey)
                {
                    ResetChallenger();
                }
                _authorityTrackKey = trackKey;
            }
        }

        private static void LogResolverDecision(
            List<SessionCandidate> candidates,
            SessionCandidate? winner,
            SessionCandidate? authority)
        {
#if DEBUG
            const bool resolverDebugEnabled = true;
#else
            bool resolverDebugEnabled = Environment.GetEnvironmentVariable("KISSA_SMTC_DEBUG") == "1";
#endif
            if (!resolverDebugEnabled) return;

            var summaries = new List<string>();
            foreach (var candidate in candidates)
            {
                var isAuthority = SessionsMatch(candidate.Session, authority?.Session);
                var isChallenger = SessionsMatch(candidate.Session, _challengerSession);
                var finalScore = candidate.RawScore + (isAuthority ? AuthorityBonus : 0);
                summaries.Add($"{candidate.AppId}[state={candidate.PlaybackStatus},type={candidate.PlaybackType},raw={candidate.RawScore},final={finalScore},authority={isAuthority},challenger={isChallenger}]");
            }

            var diagnostic = $"[Resolver] winner={winner?.AppId ?? "none"}; {string.Join(" | ", summaries)}";
            if (diagnostic == _lastResolverDiagnostic) return;
            _lastResolverDiagnostic = diagnostic;
            Console.Error.WriteLine(diagnostic);
        }

        private static async void OnCurrentSessionChanged(GlobalSystemMediaTransportControlsSessionManager sender, CurrentSessionChangedEventArgs args)
        {
            await UpdateCurrentSessionAsync();
        }

        private static async void OnSessionsChanged(GlobalSystemMediaTransportControlsSessionManager sender, SessionsChangedEventArgs args)
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
                newSession = GetBestSession();
                _currentSession = newSession;
            }

            if (oldSession != null && oldSession != newSession)
            {
                oldSession.MediaPropertiesChanged -= OnMediaPropertiesChanged;
                oldSession.PlaybackInfoChanged -= OnPlaybackInfoChanged;
                oldSession.TimelinePropertiesChanged -= OnTimelinePropertiesChanged;
            }

            if (newSession != null && oldSession != newSession)
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
                    session = GetBestSession();
                    if (session != _currentSession)
                    {
                        if (_currentSession != null)
                        {
                            _currentSession.MediaPropertiesChanged -= OnMediaPropertiesChanged;
                            _currentSession.PlaybackInfoChanged -= OnPlaybackInfoChanged;
                            _currentSession.TimelinePropertiesChanged -= OnTimelinePropertiesChanged;
                        }
                        _currentSession = session;
                        if (_currentSession != null)
                        {
                            _currentSession.MediaPropertiesChanged += OnMediaPropertiesChanged;
                            _currentSession.PlaybackInfoChanged += OnPlaybackInfoChanged;
                            _currentSession.TimelinePropertiesChanged += OnTimelinePropertiesChanged;
                        }
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
                UpdateAuthorityTrack(session, trackKey);

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
