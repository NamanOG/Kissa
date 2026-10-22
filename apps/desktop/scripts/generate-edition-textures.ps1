# Generates the static material textures for Kissa Editions. Run once, offline, with Windows
# PowerShell 5.1 (it uses System.Drawing); the results are committed, nothing runs in the app.
#   powershell -ExecutionPolicy Bypass -File scripts/generate-edition-textures.ps1
# marble-green.jpg  512x512  swirled marble pressing (clipped to a circle by the SVG)
# brushed-aluminium-fine.jpg 2048x1024 fine brushed grain for the Studio Silver plinth (overlay)
# marble-oxblood, marble-midnight, tortoise, splatter.jpg: the other special pressings
# (-Only pressings regenerates just these four; -Only fine just the brushed grain)
param([string]$Out = (Join-Path $PSScriptRoot '..\src\renderer\src\media\editions'), [string]$Only = '')
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Linq;

public static class KissaTextures {
  static int[] perm;
  static void Seed(int s) { var r = new Random(s); perm = Enumerable.Range(0, 256).OrderBy(_ => r.Next()).ToArray(); perm = perm.Concat(perm).ToArray(); }
  static double Fade(double t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  static double Lerp(double a, double b, double t) { return a + (b - a) * t; }
  static double Grad(int h, double x, double y) { switch (h & 7) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y; case 4: return x; case 5: return -x; case 6: return y; default: return -y; } }
  public static double Noise(double x, double y) {
    int X = (int)Math.Floor(x) & 255, Y = (int)Math.Floor(y) & 255;
    x -= Math.Floor(x); y -= Math.Floor(y);
    double u = Fade(x), v = Fade(y);
    int a = perm[X] + Y, b = perm[X + 1] + Y;
    return Lerp(Lerp(Grad(perm[a], x, y), Grad(perm[b], x - 1, y), u), Lerp(Grad(perm[a + 1], x, y - 1), Grad(perm[b + 1], x - 1, y - 1), u), v);
  }
  public static double Fbm(double x, double y, int oct) { double s = 0, a = 0.5, f = 1; for (int i = 0; i < oct; i++) { s += a * Noise(x * f, y * f); f *= 2; a *= 0.5; } return s; }
  static Color Mix(Color a, Color b, double t) { t = Math.Max(0, Math.Min(1, t)); return Color.FromArgb((int)Lerp(a.R, b.R, t), (int)Lerp(a.G, b.G, t), (int)Lerp(a.B, b.B, t)); }

  static void SaveJpeg(Bitmap bmp, string path, long quality) {
    var enc = ImageCodecInfo.GetImageEncoders().First(c => c.MimeType == "image/jpeg");
    var ps = new EncoderParameters(1); ps.Param[0] = new EncoderParameter(Encoder.Quality, quality);
    bmp.Save(path, enc, ps);
  }

  public static void Marble(string path) {
    MarbleOf(path, 11, Color.FromArgb(9, 27, 19), Color.FromArgb(15, 42, 29), Color.FromArgb(26, 63, 45), Color.FromArgb(40, 84, 62), Color.FromArgb(150, 172, 150));
  }

  // The same pressing swirl in other colours (Oxblood Marble, Midnight Marble).
  public static void MarbleOf(string path, int seed, Color deep, Color dark, Color mid, Color light, Color vein) {
    Seed(seed);
    int n = 512; var bmp = new Bitmap(n, n);
    for (int py = 0; py < n; py++) for (int px = 0; px < n; px++) {
      double x = (px - n / 2.0) / (n / 2.0), y = (py - n / 2.0) / (n / 2.0);
      double r = Math.Sqrt(x * x + y * y), th = Math.Atan2(y, x);
      // Pressing swirl: colour is dragged round the centre, more towards the rim.
      double wx = Fbm(x * 1.6 + 3.1, y * 1.6 - 7.4, 5), wy = Fbm(x * 1.6 - 5.2, y * 1.6 + 1.3, 5);
      double swirl = th * 1.0 + r * 3.2 + wx * 2.6;
      double band = Math.Sin(swirl * 2.0 + wy * 4.0);
      double cloud = Fbm(x * 2.4 + wx, y * 2.4 + wy, 6);
      Color c = Mix(deep, dark, 0.5 + cloud);
      c = Mix(c, mid, Math.Max(0, band) * 0.6);
      c = Mix(c, light, Math.Pow(Math.Max(0, band), 4) * 0.45);
      // Veins: thin cream filaments where the warped field crosses zero, broken by noise.
      // Long cream streaks dragged round with the swirl, fading in and out along their length.
      // Whole multiples of the angle, so the swirl meets itself without a seam.
      double field = Math.Sin(swirl * 2.0 + Fbm(x * 1.1 + 9, y * 1.1 - 2, 3) * 1.2);
      double fade = Math.Max(0, Fbm(x * 1.8 - 4, y * 1.8 + 6, 3) + 0.15);
      double streak = Math.Exp(-Math.Abs(field) * 5) * fade * 0.7;
      double soft = Math.Exp(-Math.Abs(field) * 4) * fade * 0.18;
      c = Mix(c, light, soft * 2);
      c = Mix(c, vein, Math.Min(0.32, streak));
      bmp.SetPixel(px, py, c);
    }
    SaveJpeg(bmp, path, 86); bmp.Dispose();
  }

  // Tortoiseshell: dark brown blotches through translucent amber, as in a tortoise pressing.
  public static void Tortoise(string path) {
    Seed(41);
    int n = 512; var bmp = new Bitmap(n, n);
    Color honey = Color.FromArgb(150, 86, 24), amber = Color.FromArgb(104, 54, 14), brown = Color.FromArgb(46, 22, 8), black = Color.FromArgb(18, 9, 4);
    for (int py = 0; py < n; py++) for (int px = 0; px < n; px++) {
      double x = (px - n / 2.0) / (n / 2.0), y = (py - n / 2.0) / (n / 2.0);
      double r = Math.Sqrt(x * x + y * y), th = Math.Atan2(y, x);
      // Blotches stretched a little round the record, as the hot vinyl is pressed outwards.
      double u = Math.Cos(th) * (r * 2.2), v = Math.Sin(th) * (r * 2.2);
      double wx = Fbm(u * 0.9 + 2, v * 0.9 - 3, 4) * 0.9, wy = Fbm(u * 0.9 - 6, v * 0.9 + 4, 4) * 0.9;
      double spots = Fbm(u * 1.7 + wx, v * 1.7 + wy, 5);
      double fine = Fbm(u * 6 + 11, v * 6 - 5, 3) * 0.12;
      double t = spots + fine;
      Color c = Mix(honey, amber, 0.5 - t * 1.6);
      c = Mix(c, brown, Math.Max(0, Math.Min(1, (t - 0.02) * 6)));
      c = Mix(c, black, Math.Max(0, Math.Min(1, (t - 0.16) * 5)));
      bmp.SetPixel(px, py, c);
    }
    SaveJpeg(bmp, path, 86); bmp.Dispose();
  }

  // Splatter: a smoky translucent black pressing with flecks of cream, red and gold paint.
  // Splatter, as pressed: pigment chips are flattened and dragged round the record by the press,
  // so each splat is an irregular, crisp-edged smear running along the grooves, translucent at
  // its thin edges and denser at its heart. Drawn at 1024 px so edges stay sharp on the deck.
  public static void SplatterPressed(string path) {
    Seed(61);
    int n = 1024; var bmp = new Bitmap(n, n);
    var rnd = new Random(61);
    using (var g = Graphics.FromImage(bmp)) {
      g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
      for (int py = 0; py < n; py++) for (int px = 0; px < n; px++) {
        double x = (px - n / 2.0) / (n / 2.0), y = (py - n / 2.0) / (n / 2.0);
        double cloud = Fbm(x * 2.2 + 5, y * 2.2 - 1, 4);
        bmp.SetPixel(px, py, Mix(Color.FromArgb(17, 17, 19), Color.FromArgb(34, 33, 36), 0.45 + cloud * 0.9));
      }
      Color[] inks = { Color.FromArgb(214, 202, 178), Color.FromArgb(142, 34, 38), Color.FromArgb(190, 142, 64) };
      double c = n / 2.0;
      for (int i = 0; i < 120; i++) {
        var ink = inks[i % inks.Length];
        // Keep clear of the label and the very rim.
        double rr = (0.36 + 0.6 * Math.Sqrt(rnd.NextDouble())) * c, aa = rnd.NextDouble() * Math.PI * 2;
        double cx = c + Math.Cos(aa) * rr, cy = c + Math.Sin(aa) * rr;
        double size = Math.Pow(rnd.NextDouble(), 2.4) * 36 + 3;
        double stretch = 1.4 + rnd.NextDouble() * 1.6;      // dragged along the groove
        double tangent = aa + Math.PI / 2;
        int alpha = 130 + rnd.Next(70);
        FillSplat(g, rnd, cx, cy, size, stretch, tangent, Color.FromArgb(alpha, ink));
        // Denser pigment at the heart.
        if (size > 10) FillSplat(g, rnd, cx, cy, size * 0.55, stretch, tangent, Color.FromArgb(70, Mix(ink, Color.White, 0.08)));
        int drops = rnd.Next(1, 6);
        for (int d = 0; d < drops; d++) {
          double a = tangent + (rnd.NextDouble() - 0.5) * 1.2 + (rnd.Next(2) == 0 ? 0 : Math.PI);
          double dist = size * (0.8 + rnd.NextDouble() * 2.2), s = 1.2 + rnd.NextDouble() * size * 0.16;
          FillSplat(g, rnd, cx + Math.Cos(a) * dist, cy + Math.Sin(a) * dist, s, stretch * 0.8, tangent, Color.FromArgb(alpha, ink));
        }
      }
    }
    SaveJpeg(bmp, path, 90); bmp.Dispose();
  }

  static void FillSplat(Graphics g, Random rnd, double cx, double cy, double size, double stretch, double angle, Color color) {
    int k = 22; var pts = new PointF[k];
    double ph = rnd.NextDouble() * 10;
    for (int i = 0; i < k; i++) {
      double t = i * Math.PI * 2 / k;
      double wobble = 1 + 0.28 * Math.Sin(t * 3 + ph) + 0.14 * Math.Sin(t * 5 + ph * 1.7) + (rnd.NextDouble() - 0.5) * 0.12;
      double lx = Math.Cos(t) * size * 0.5 * wobble * stretch, ly = Math.Sin(t) * size * 0.5 * wobble;
      pts[i] = new PointF((float)(cx + lx * Math.Cos(angle) - ly * Math.Sin(angle)), (float)(cy + lx * Math.Sin(angle) + ly * Math.Cos(angle)));
    }
    using (var b = new SolidBrush(color)) g.FillClosedCurve(b, pts, System.Drawing.Drawing2D.FillMode.Winding, 0.4f);
  }

  // Studio Silver grain, drawn over the plinth with an overlay blend: centred on mid grey, so it
  // adds only the brushing and keeps the finish's own tone and light. Fine, low-contrast lines at
  // about one per screen pixel, with strokes that start and fade along their length.
  public static void BrushedFine(string path) {
    Seed(29);
    int w = 2048, h = 1024; var bmp = new Bitmap(w, h, PixelFormat.Format24bppRgb);
    var rnd = new Random(7);
    double[] line = new double[h];
    for (int y = 0; y < h; y++) line[y] = rnd.NextDouble() - 0.5;
    var data = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format24bppRgb);
    var buf = new byte[data.Stride * h];
    for (int y = 0; y < h; y++) {
      double s0 = line[y] * 0.7 + line[(y + 1) % h] * 0.3;
      for (int x = 0; x < w; x++) {
        // Strokes come and go along x; a few longer, brighter scratches.
        double reach = 0.55 + 0.45 * Noise(x / 340.0, y * 0.9 + 17);
        double scratch = Math.Max(0, Noise(x / 900.0 + 40, y * 0.37) - 0.38) * 2.2;
        double fine = (rnd.NextDouble() - 0.5);
        double v = 128 + s0 * 20 * reach + scratch * 14 + fine * 5;
        byte g = (byte)Math.Max(0, Math.Min(255, v));
        int i = y * data.Stride + x * 3; buf[i] = g; buf[i + 1] = g; buf[i + 2] = g;
      }
    }
    System.Runtime.InteropServices.Marshal.Copy(buf, 0, data.Scan0, buf.Length);
    bmp.UnlockBits(data);
    SaveJpeg(bmp, path, 80); bmp.Dispose();
  }
}
'@
if ($Only -eq '') { [KissaTextures]::Marble((Join-Path $Out 'marble-green.jpg')) }
if ($Only -ne 'pressings') { [KissaTextures]::BrushedFine((Join-Path $Out 'brushed-aluminium-fine.jpg')) }
if ($Only -ne 'fine') {
  [KissaTextures]::MarbleOf((Join-Path $Out 'marble-oxblood.jpg'), 17, [Drawing.Color]::FromArgb(30, 6, 9), [Drawing.Color]::FromArgb(52, 11, 15), [Drawing.Color]::FromArgb(86, 20, 26), [Drawing.Color]::FromArgb(118, 34, 38), [Drawing.Color]::FromArgb(214, 176, 160))
  [KissaTextures]::MarbleOf((Join-Path $Out 'marble-midnight.jpg'), 23, [Drawing.Color]::FromArgb(6, 10, 26), [Drawing.Color]::FromArgb(12, 20, 46), [Drawing.Color]::FromArgb(24, 40, 82), [Drawing.Color]::FromArgb(40, 62, 112), [Drawing.Color]::FromArgb(176, 186, 206))
  [KissaTextures]::Tortoise((Join-Path $Out 'tortoise.jpg'))
  [KissaTextures]::SplatterPressed((Join-Path $Out 'splatter.jpg'))
}
Get-ChildItem $Out -Filter *.jpg | ForEach-Object { '{0} {1:N0} KB' -f $_.Name, ($_.Length / 1KB) }
