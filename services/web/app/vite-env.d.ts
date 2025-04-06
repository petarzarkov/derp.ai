/// <reference types="vite/client" />

/**
 * To use
 * import.meta.env.EXPLODE_TEM
 * anywhere in your tsx
 **/
interface ImportMetaEnv {
  readonly EXAMPLE_ENV: string;
  readonly [x: string]: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
