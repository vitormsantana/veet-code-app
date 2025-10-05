import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

const globalObject = globalThis as Record<string, unknown>;
if (!('global' in globalObject)) {
  globalObject['global'] = globalObject;
}

platformBrowserDynamic().bootstrapModule(AppModule, {
  ngZoneEventCoalescing: true,
})
  .catch(err => console.error(err));
