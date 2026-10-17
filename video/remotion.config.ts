import { Config } from '@remotion/cli/config';
import { webpackOverride } from './webpack-override';

Config.overrideWebpackConfig(webpackOverride);

// High-quality H.264 that TikTok accepts as is
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');
