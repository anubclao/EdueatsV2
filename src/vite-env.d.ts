/// <reference types="vite/client" />

declare module '*.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly GEMINI_API_KEY: string;
    readonly EMAIL_USER: string;
    readonly EMAIL_PASS: string;
  }
}
