const globalObject = globalThis as Record<string, unknown>;

if (!('global' in globalObject)) {
  globalObject['global'] = globalObject;
}
