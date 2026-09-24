/// <reference types="vite/client" />

// Side-effect CSS imports (e.g. `import './styles.css'`)
declare module '*.css';

// CSS Modules — typed as a record of class names
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Image and font assets commonly imported by Vite
declare module '*.svg' {
  const src: string;
  export default src;
}
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.jpg' {
  const src: string;
  export default src;
}
declare module '*.jpeg' {
  const src: string;
  export default src;
}
declare module '*.gif' {
  const src: string;
  export default src;
}
declare module '*.webp' {
  const src: string;
  export default src;
}
declare module '*.woff' {
  const src: string;
  export default src;
}
declare module '*.woff2' {
  const src: string;
  export default src;
}