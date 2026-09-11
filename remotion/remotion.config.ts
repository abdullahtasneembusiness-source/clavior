import { Config } from "@remotion/cli/config";

// Rendering config for the Margin of error pipeline.
// On phone/remote sessions Remotion needs a browser binary; a preinstalled
// Chromium is picked up automatically, but you can also point at one with
// `--browser-executable=/path/to/chrome` on the CLI.

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(2);

// H.264 for broad compatibility with editing/upload tools.
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
