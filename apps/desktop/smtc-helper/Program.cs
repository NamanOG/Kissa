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

            await BroadcastStateAsync();
        }

        private static async void OnMediaPropertiesChanged(GlobalSystemMediaTransportControlsSession sender, MediaPropertiesChangedEventArgs args)
        {
            await BroadcastStateAsync();
        }

        private static async void OnPlaybackInfoChanged(GlobalSystemMediaTransportControlsSession sender, PlaybackInfoChangedEventArgs args)
        {
            await BroadcastStateAsync();
        }

        private static async void OnTimelinePropertiesChanged(GlobalSystemMediaTransportControlsSession sender, TimelinePropertiesChangedEventArgs args)
        {
            await BroadcastStateAsync();
        }

        private static async Task BroadcastStateAsync()
        {
            try
            {
                GlobalSystemMediaTransportControlsSession? session;
                lock (_lock)
                {
                    session = _currentSession;
                }

                if (session == null)
                {
                    Console.WriteLine("{\"type\":\"update\",\"session\":null}");
                    Console.Out.Flush();
                    return;
                }

                var mediaProps = await session.TryGetMediaPropertiesAsync();
                var playbackInfo = session.GetPlaybackInfo();
                var timelineInfo = session.GetTimelineProperties();

                string? thumbnailBase64 = null;
                if (mediaProps.Thumbnail != null)
                {
                    for (int attempt = 0; attempt < 3; attempt++)
                    {
                        try
                        {
                            using var stream = await mediaProps.Thumbnail.OpenReadAsync();
                            if (stream != null && stream.Size > 0)
                            {
                                using var memStream = new MemoryStream();
                                var classicStream = stream.AsStreamForRead();
                                await classicStream.CopyToAsync(memStream);
                                var bytes = memStream.ToArray();
                                if (bytes.Length > 0)
                                {
                                    thumbnailBase64 = Convert.ToBase64String(bytes);
                                    break;
                                }
                            }
                        }
                        catch
                        {
                            await Task.Delay(50);
                        }
                    }
                }

                string sourceAppId = JsonEscape(session.SourceAppUserModelId);
                string title = JsonEscape(mediaProps.Title ?? "");
                string artist = JsonEscape(mediaProps.Artist ?? "");
                string albumTitle = JsonEscape(mediaProps.AlbumTitle ?? "");
                string albumArtist = JsonEscape(mediaProps.AlbumArtist ?? "");
                string thumb = thumbnailBase64 != null ? JsonEscape(thumbnailBase64) : "null";
                
                int pStatus = (int)(playbackInfo?.PlaybackStatus ?? 0);
                int pType = (int)(playbackInfo?.PlaybackType ?? 0);
                
                double pos = timelineInfo?.Position.TotalSeconds ?? 0;
                double dur = timelineInfo?.EndTime.TotalSeconds ?? 0;

                string json = $@"{{""type"":""update"",""session"":{{""sourceAppId"":{sourceAppId},""media"":{{""title"":{title},""artist"":{artist},""albumTitle"":{albumTitle},""albumArtist"":{albumArtist},""thumbnailBase64"":{thumb}}},""playback"":{{""playbackStatus"":{pStatus},""playbackType"":{pType}}},""timeline"":{{""position"":{pos},""duration"":{dur}}}}}}}";

                Console.WriteLine(json.Replace("\r", "").Replace("\n", ""));
                Console.Out.Flush();
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
