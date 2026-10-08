// Discreet on-screen attribution, so a plain screenshot of a chart shared
// on social media still points back to the site. Marked data-export-hide:
// the PNG export gets its own larger centred watermark instead (see
// utils/exportBrandedPng), so this would just be a duplicate there.
// The text itself comes from CSS (.chart-watermark::after) — it's
// decorative, and keeping it out of the DOM text keeps it out of the
// accessibility tree and of contrast audits.
export default function Watermark({ bottom = 6, right = 10 }: { bottom?: number; right?: number }) {
  return (
    <span
      className="chart-watermark"
      data-export-hide
      aria-hidden="true"
      style={{ position: 'absolute', bottom, right, zIndex: 5 }}
    />
  );
}
