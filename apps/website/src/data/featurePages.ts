export interface FeaturePageData {
  slug: string
  title: string
  description: string
  label: string
  heading: string
  intro: string
  image: string
  imageAlt: string
  sections: { heading: string; paragraphs: string[] }[]
  related: string
}

export const featurePages: FeaturePageData[] = [
  {
    slug: 'study-room',
    title: 'Focus Room for Study & Work, with Nature Sounds, for Windows | Kissa',
    description: 'A quiet Focus Room for Windows, for studying, writing, coding or reading: five rooms, nature recordings, focus sessions, breaks and a local journal. Keep your music on the turntable with Kissa.',
    label: 'A quieter place to work',
    heading: 'A Focus Room, with your record still playing.',
    intro: 'Settle in for studying, writing, or whatever needs your attention. Choose rain, snow, forest, night or a cabin fireplace, give the session a little structure, and put on a record.',
    image: 'media/study/study-forest.webp',
    imageAlt: 'Kissa Focus Room with a forest view, the focus journal on the left and the record on the right',
    sections: [
      { heading: 'Five rooms. Real recordings.', paragraphs: ['Each room pairs a full-window view with a field recording: rain, a winter forest, a forest stream, night insects or a crackling fire. Switch the sound on when you want it, then set its volume independently of your music.', 'The weather changes gently as a sitting progresses. Reduced-motion preferences keep the room calm without continuous weather animation.'] },
      { heading: 'A focus timer that leaves you in charge.', paragraphs: ['Choose 25, 50 or 90 minutes, or an open sitting that counts up. Add breaks, pause when you need to, and decide when to begin the next block. Finishing a block never pauses your music.', 'The clock uses saved timestamps so switching views does not reset it. After a long gap caused by sleep, quitting or a clock change, Kissa asks you to resume or finish rather than counting the whole absence as work. You can keep the display awake during a running sitting.'] },
      { heading: 'Small steps, and somewhere for stray thoughts.', paragraphs: ['Write an intention, split it into small steps, and park distracting thoughts for later. At the end, review the sitting and choose whether to keep it.', 'My focus sessions shows recent sittings, the last seven days and your daily goal. These are records of time and your own reflection, not measurements of attention. Your session data stays on this computer.'] },
      { heading: 'Your music stays yours.', paragraphs: ['Kissa follows the Windows media session from a supported music player. Keep listening in Spotify, Apple Music, TIDAL or a local player while the record turns beside your journal. Kissa does not supply a music catalogue or require a streaming-account login.', 'Optional Discord sharing can show the room and a timer. Your intention, step text and parked thoughts stay private. Enable sharing in Settings only if you want that presence on your profile.'] }
    ],
    related: 'discord-music-status'
  },
  {
    slug: 'discord-music-status',
    title: 'Apple Music & Focus Room Discord Status for Windows | Kissa',
    description: 'Show Apple Music, optional Spotify playback or a Focus Room timer on Discord with Kissa for Windows. Sharing is off by default, with controls in Settings.',
    label: 'Share what is playing',
    heading: 'Your listening room, on Discord.',
    intro: 'Let a record or a focus session say what you are up to. Kissa can put that small piece of your listening room on your Discord profile, when you choose to share it.',
    image: 'media/modes/shelf.webp',
    imageAlt: 'The Record Shelf in Kissa, showing albums from music played on Windows',
    sections: [
      { heading: 'Apple Music, with an optional Spotify switch.', paragraphs: ['When sharing is enabled, Kissa can show Apple Music or iTunes playback in Discord. Spotify sharing has its own additional switch. Discord sharing does not cover every player that Kissa can display on the turntable.', 'The activity includes track details, album artwork when a public cover is available, a Kissa badge and a link to get the app. Artwork availability depends on the music catalogue; some recordings may show without a cover.'] },
      { heading: 'How to turn it on.', paragraphs: ['Open Discord and Kissa on your Windows PC. In Kissa, go to Settings, then System, then Sharing. Read the visibility explanation and enable Discord sharing. Turn on “Also share Spotify” if you want Spotify playback included.', 'Play a song in Apple Music or iTunes and give the activity a moment to update. Discord needs to allow activity to appear on your profile. If nothing appears, check its activity privacy settings and make sure its desktop app is running. You do not sign in to Discord through Kissa.'] },
      { heading: 'A focus timer without your to-do list.', paragraphs: ['Focus session sharing can show which room you are in and the sitting or break timer. A supported music player can contribute the song to that status too.', 'Kissa never sends your intention, task text, parked thoughts or reflection to Discord. You can turn focus session sharing off separately in Settings.'] },
      { heading: 'Off until you choose it. Easy to stop.', paragraphs: ['Discord sharing is off by default. Turning it off clears Kissa’s activity. Music activity also clears on an unsupported source and after two minutes of paused playback.', 'The turntable, lyrics and Focus Room work without Discord sharing. If you enable it, the shared details are visible according to your Discord profile and activity settings.'] }
    ],
    related: 'study-room'
  }
]
