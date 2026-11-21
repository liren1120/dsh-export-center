/**
 * Ambient types for the browser bundle, which is not a module: DSH injects
 * `react` through the Module Loader and exposes the loader on `window`.
 */

interface Window {
  __ModuleLoader__: {
    load(options: { id: string; factory(require: (name: string) => unknown): unknown }): void
  }
}

declare module 'react' {
  const React: any
  export = React
}
