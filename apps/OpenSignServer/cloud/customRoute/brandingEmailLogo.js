import { imageMime, isParseFileUrl, readParseFileBytes } from '../../utils/brandLogo.js';

const CACHE_MS = 5 * 60 * 1000;
let cached = { url: '', buf: null, mime: '', at: 0 };

// Called on branding_Settings save so a new logo is served immediately.
export const resetEmailLogoCache = () => {
  cached = { url: '', buf: null, mime: '', at: 0 };
};

// GET /branding/email-logo: stable public URL for the branded email logo, so sent
// emails don't depend on expiring signed /files/ URLs. `?v=` is only a cache-buster.
export default async function brandingEmailLogo(req, res) {
  try {
    // Public and unauthenticated: hit the DB at most once per CACHE_MS.
    if (Date.now() - cached.at > CACHE_MS) {
      const settings = await new Parse.Query('branding_Settings').first({ useMasterKey: true });
      const url = settings?.get('emailLogoUrl') || settings?.get('logoUrl') || '';
      let buf = null;
      if (url && isParseFileUrl(url)) buf = await readParseFileBytes(url);
      cached = { url, buf, mime: imageMime(buf), at: Date.now() };
    }
    const { url } = cached;
    if (!url) return res.sendStatus(404);

    if (!isParseFileUrl(url)) {
      const { protocol } = new URL(url);
      if (protocol !== 'http:' && protocol !== 'https:') return res.sendStatus(404);
      return res.redirect(302, url);
    }

    if (!cached.mime) return res.sendStatus(404);

    res.set({
      'Content-Type': cached.mime,
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.send(cached.buf);
  } catch (err) {
    console.warn('[branding] email logo route failed:', err.message);
    cached = { url: '', buf: null, mime: '', at: Date.now() }; // don't retry on every hit
    return res.sendStatus(404);
  }
}
