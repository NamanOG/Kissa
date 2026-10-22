using System;

namespace SmtcHelper
{
    /// <summary>What to do with a cover just read from the player.</summary>
    public enum ThumbnailVerdict
    {
        /// <summary>It belongs to the current track: show it and stop rereading.</summary>
        Accept,
        /// <summary>Probably still the previous track's cover: show nothing yet and read again.</summary>
        Wait,
        /// <summary>Most likely right, but unproven: show it and keep rereading for a while.</summary>
        AcceptProvisional
    }

    /// <summary>
    /// Decides whether a cover read from SMTC belongs to the track now reported.
    ///
    /// Players (Apple Music especially) report the new title before the new picture. Without
    /// care, the previous track's picture was taken as the new track's and, once settled, never
    /// read again, so it stayed for the whole song. A picture identical to the previous track's
    /// is therefore suspect: held back at first, then shown provisionally (and still reread, so
    /// a late update replaces it at once). It is not refused outright, because different
    /// releases can genuinely share one image file (standard and deluxe editions, a single and
    /// its album), and refusing would leave those with no cover at all when offline. Adjacent
    /// tracks of the same album, and the same song again, share their picture at once.
    /// Main applies the same rule (coverOwnership.ts).
    /// </summary>
    public static class ThumbnailOwnership
    {
        /// <summary>How long a picture identical to the previous track's is held back when the
        /// album names cannot settle it.</summary>
        public const int SuspectWindowMs = 4000;

        /// <summary>How long a track keeps rereading an unsettled cover on the poll.</summary>
        public const int RereadForMs = 60000;

        /// <summary>The shortest gap between two poll rereads of the same track's cover.</summary>
        public const int RereadEveryMs = 1000;

        public static ThumbnailVerdict Judge(
            string readBase64,
            string? previousBase64,
            string title, string artist, string album,
            string previousTitle, string previousArtist, string previousAlbum,
            double msSinceTrackChange)
        {
            if (string.IsNullOrEmpty(previousBase64) || readBase64 != previousBase64)
                return ThumbnailVerdict.Accept;

            bool sameTrack = Same(title, previousTitle) && Same(artist, previousArtist);
            bool albumsKnown = !string.IsNullOrWhiteSpace(album) && !string.IsNullOrWhiteSpace(previousAlbum);

            // The next song on the same album, or the same song again where no album says
            // otherwise: the shared picture is right.
            if (albumsKnown && Same(album, previousAlbum)) return ThumbnailVerdict.Accept;
            if (sameTrack && !albumsKnown) return ThumbnailVerdict.Accept;

            // Another release (named or not) with the identical picture: most often the player
            // has not swapped it yet, sometimes a genuinely shared edition cover. Hold it back,
            // then show it provisionally and keep checking.
            return msSinceTrackChange < SuspectWindowMs ? ThumbnailVerdict.Wait : ThumbnailVerdict.AcceptProvisional;
        }

        /// <summary>Whether the poll (not a player event) should read the cover again now.</summary>
        public static bool ShouldPollReread(bool settled, bool haveCover, double msSinceTrackChange, double msSinceLastRead)
        {
            if (settled) return false;
            if (msSinceTrackChange >= RereadForMs) return !haveCover && msSinceLastRead >= RereadForMs;
            return msSinceLastRead >= RereadEveryMs;
        }

        private static bool Same(string a, string b) =>
            string.Equals(a?.Trim(), b?.Trim(), StringComparison.OrdinalIgnoreCase);
    }
}
