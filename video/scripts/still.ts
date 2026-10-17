// Renders single frames to out/, to check a design without rendering a video.
// npm run still -- --id MascotSheet
// npm run still -- --id TelemetryDuel-fr --frames 0,300,900
// npm run still -- --id GrandPrixRecap-fr --props props.json   (inputProps from a file)
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { webpackOverride } from '../webpack-override';

const { values } = parseArgs({
  options: {
    id: { type: 'string' },
    frames: { type: 'string', default: '0' },
    scale: { type: 'string', default: '1' },
    props: { type: 'string' },
  },
});
if (!values.id) throw new Error('--id is required, e.g. --id MascotSheet');

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), webpackOverride });
const inputProps = values.props ? JSON.parse(readFileSync(values.props, 'utf8')) : {};
const composition = await selectComposition({ serveUrl, id: values.id, inputProps });
for (const frame of values.frames.split(',').map(Number)) {
  const output = path.resolve('out', `${values.id}-${frame}.png`);
  await renderStill({ serveUrl, composition, frame, output, inputProps, scale: Number(values.scale) });
  process.stdout.write(`${output}\n`);
}
