using SmtcHelper;

int failures = 0;
void Check(string name, bool ok)
{
    Console.WriteLine($"{(ok ? "pass" : "FAIL")}  {name}");
    if (!ok) failures++;
}

const string InRainbows = "IN_RAINBOWS_JPEG";
const string Graduation = "GRADUATION_JPEG";

ThumbnailVerdict Judge(string read, string? prev, string title, string album, string prevTitle, string prevAlbum, double ms,
    string artist = "Kanye West", string prevArtist = "Radiohead") =>
    ThumbnailOwnership.Judge(read, prev, title, artist, album, prevTitle, prevArtist, prevAlbum, ms);

// Screenshot (354): Graduation track, previous cover still In Rainbows. The old helper accepted
// this after 1 s and never read again; now it is held back, and stays unsettled (reread) after.
Check("old cover under a different named album is held back at first",
    Judge(InRainbows, InRainbows, "Everything I Am (feat. DJ Premier)", "Graduation", "Nude", "In Rainbows", 200) == ThumbnailVerdict.Wait);
Check("if the player never changes it, it is shown provisionally (unsettled, still reread)",
    Judge(InRainbows, InRainbows, "Everything I Am (feat. DJ Premier)", "Graduation", "Nude", "In Rainbows", 73_000) == ThumbnailVerdict.AcceptProvisional);

// Screenshot (355): MBDTF track still showing Graduation (same artist, different album).
Check("same artist, different album, identical picture is held back",
    Judge(Graduation, Graduation, "Devil In a New Dress (feat. Rick Ross)", "My Beautiful Dark Twisted Fantasy",
        "Everything I Am (feat. DJ Premier)", "Graduation", 3_000, "Kanye West", "Kanye West") == ThumbnailVerdict.Wait);

// Different releases that genuinely share one image file must still get it (offline too).
Check("deluxe edition with the standard edition's identical picture is shown after the window",
    Judge(Graduation, Graduation, "Good Night", "Graduation (Deluxe)", "Champion", "Graduation",
        ThumbnailOwnership.SuspectWindowMs + 1, "Kanye West", "Kanye West") == ThumbnailVerdict.AcceptProvisional);
Check("same song on another release with the identical picture: held back, then shown",
    Judge(Graduation, Graduation, "Stronger", "Stronger (Single)", "Stronger", "Graduation", 500, "Kanye West", "Kanye West") == ThumbnailVerdict.Wait &&
    Judge(Graduation, Graduation, "Stronger", "Stronger (Single)", "Stronger", "Graduation", 5_000, "Kanye West", "Kanye West") == ThumbnailVerdict.AcceptProvisional);

Check("the new picture is accepted at once",
    Judge(Graduation, InRainbows, "Everything I Am (feat. DJ Premier)", "Graduation", "Nude", "In Rainbows", 50) == ThumbnailVerdict.Accept);
Check("the first track of a session is accepted",
    Judge(Graduation, null, "Good Morning", "Graduation", "", "", 10) == ThumbnailVerdict.Accept);

Check("next song on the same album keeps the shared picture",
    Judge(Graduation, Graduation, "Champion", "Graduation", "Good Morning", "Graduation", 100, "Kanye West", "Kanye West") == ThumbnailVerdict.Accept);
Check("album names compare without case or spaces",
    Judge(Graduation, Graduation, "Champion", "graduation ", "Good Morning", "Graduation", 100, "Kanye West", "Kanye West") == ThumbnailVerdict.Accept);
Check("the same song again (A/B/A, replay) keeps its picture",
    Judge(Graduation, Graduation, "Champion", "Graduation", "Champion", "Graduation", 100, "Kanye West", "Kanye West") == ThumbnailVerdict.Accept);

Check("no album names: held back at first",
    Judge(InRainbows, InRainbows, "Track B", "", "Track A", "", 1_500) == ThumbnailVerdict.Wait);
Check("no album names: shown provisionally after the window",
    Judge(InRainbows, InRainbows, "Track B", "", "Track A", "", ThumbnailOwnership.SuspectWindowMs + 1) == ThumbnailVerdict.AcceptProvisional);
Check("one album name missing counts as unknown",
    Judge(InRainbows, InRainbows, "Track B", "Graduation", "Track A", "", 500) == ThumbnailVerdict.Wait);

Check("settled covers are not reread by the poll",
    !ThumbnailOwnership.ShouldPollReread(true, true, 5_000, 5_000));
Check("unsettled covers are reread at most once a second",
    ThumbnailOwnership.ShouldPollReread(false, false, 5_000, 1_000) && !ThumbnailOwnership.ShouldPollReread(false, false, 5_000, 400));
Check("a provisional cover stops being polled after a minute",
    !ThumbnailOwnership.ShouldPollReread(false, true, 61_000, 5_000));
Check("a missing cover is still retried once a minute after that",
    ThumbnailOwnership.ShouldPollReread(false, false, 120_000, 60_000) && !ThumbnailOwnership.ShouldPollReread(false, false, 120_000, 5_000));

Console.WriteLine(failures == 0 ? "All helper checks passed." : $"{failures} helper check(s) failed.");
return failures == 0 ? 0 : 1;
