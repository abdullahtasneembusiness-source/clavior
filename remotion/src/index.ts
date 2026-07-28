// Remotion entry point. The CLI/Studio loads this file; it must register the
// root. Import the reusable components from "./library" in your own code.
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
