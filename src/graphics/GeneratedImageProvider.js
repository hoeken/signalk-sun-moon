import { ImageProvider } from "./ImageProvider.js";
import { SunGraphicRenderer } from "./SunGraphicRenderer.js";
import { MoonRenderer } from "./MoonRenderer.js";

/**
 * Default provider (§6.5): draws graphics dynamically via the renderers. The
 * moon is observer-oriented; the sun reflects the current state.
 */
export class GeneratedImageProvider extends ImageProvider {
  constructor() {
    super();
    this.sun = new SunGraphicRenderer();
    this.moon = new MoonRenderer();
  }

  getSunImage(state) {
    return this.sun.render(state || "day");
  }

  getMoonImage(moonData) {
    if (!moonData)
      return null;
    return this.moon.render(moonData);
  }
}
