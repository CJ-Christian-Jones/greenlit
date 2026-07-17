export function createScreenRegistry(screenRenderers) {
  return Object.freeze(screenRenderers.slice());
}

export function selectScreenRenderer(screenRegistry, screenIndex) {
  if (!screenRegistry || !screenRegistry.length) {
    throw new Error("V38_SCREEN_REGISTRY not initialized.");
  }
  const index = Number.isInteger(screenIndex) ? screenIndex : 0;
  return screenRegistry[index] || screenRegistry[0];
}
