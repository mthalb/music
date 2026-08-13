const { verify, getCookie } = require('../lib/auth');
const { getSignedReadUrl } = require('../lib/storage');

// Add your tracks here. `path` is the object's key inside your B2 bucket
// (e.g. upload to a "music/" folder to match the default below).
const TRACKS = [
  { id: 'track1', label: 'Track 1', path: 'music/track1.mp3' },
  { id: 'track2', label: 'Track 2', path: 'music/track2.mp3' },
];

const SIGNED_URL_TTL_MS = 15 * 60 * 1000; // 15 minutes

module.exports = async (req, res) => {
  const token = getCookie(req, 'music_token');
  if (!verify(token, process.env.MUSIC_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const tracks = await Promise.all(
      TRACKS.map(async (t) => {
        const url = await getSignedReadUrl(t.path, SIGNED_URL_TTL_MS);
        return { id: t.id, label: t.label, src: url };
      })
    );

    return res.status(200).json({ tracks });
  } catch (err) {
    console.error('Failed to sign track URLs:', err);
    return res.status(500).json({ error: 'Could not load tracks' });
  }
};
