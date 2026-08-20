using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Windows.Media.Control;
using System.IO;

namespace SmtcHelper
{
    class Program
    {
        private static GlobalSystemMediaTransportControlsSessionManager? _sessionManager;
        private static GlobalSystemMediaTransportControlsSession? _currentSession;
        private static readonly object _lock = new object();
        private static string _lastBroadcastJson = "";
        private static string _lastTrackKey = "";

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

                // High-frequency polling loop (200ms) to ensure instantaneous track transition detection
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

                using (var reader = new StreamReader(Console.OpenStandardInput()))
                {
                    while (reader.ReadLine() != null)
                    {
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

                if (session == null)
                {
                    if (force || _lastBroadcastJson != "null")
                    {
                        _lastBroadcastJson = "null";
                        Console.WriteLine("{\"type\":\"update\",\"session\":null}");
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

                string json = $@"{{""type"":""update"",""session"":{{""sourceAppId"":{sourceAppId},""media"":{{""title"":{title},""artist"":{artist},""albumTitle"":{albumTitle},""albumArtist"":{albumArtist},""thumbnailBase64"":{thumb}}},""playback"":{{""playbackStatus"":{pStatus},""playbackType"":{pType}}},""timeline"":{{""position"":{pos},""duration"":{dur}}}}}}}";

                string cleanJson = json.Replace("\r", "").Replace("\n", "");
                if (force || isNewTrack || cleanJson != _lastBroadcastJson)
                {
                    _lastBroadcastJson = cleanJson;
                    _lastTrackKey = trackKey;
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
