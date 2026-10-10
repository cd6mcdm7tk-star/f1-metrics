// "metrikdelta.com" in a chart's corner, so a plain screenshot still credits
// the site. Hidden from PNG exports, which get their own watermark. The text
// comes from CSS (.chart-watermark::after), out of the accessibility tree.
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
