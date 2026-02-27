// Centralised API/socket configuration so we don't scatter env parsing.
// const FALLBACK_API_BASE_URL = "https://schoolapi.xtown.in/api";
// const rawBase =
//   import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
//   FALLBACK_API_BASE_URL;
// const isRelativeApiBase = rawBase?.startsWith("/");
// const browserOrigin = typeof window !== "undefined" ? window.location.origin : undefined;

// // If the base ends with /api, strip it for sockets (which mount at root).
// const derivedSocket =
//   isRelativeApiBase
//     ? browserOrigin
//     : rawBase?.replace(/\/api$/, "") || rawBase || undefined;

// export const API_BASE_URL = rawBase;
// export const SOCKET_BASE_URL =
//   (import.meta.env.VITE_SOCKET_URL || "").replace(/\/$/, "") ||
//   derivedSocket ||
//   API_BASE_URL;

// export const VOICE_SERVICE_URL = (import.meta.env.VITE_VOICE_SERVICE_URL || "").replace(/\/$/, "");

// export const DEFAULT_PAGE_SIZE = 20;



// Centralised API/socket configuration so we don't scatter env parsing.
const FALLBACK_API_BASE_URL = "https://schoolapi.xtown.in/api";

const rawBase =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  FALLBACK_API_BASE_URL;

const isRelativeApiBase = rawBase?.startsWith("/");

const browserOrigin =
  typeof window !== "undefined" ? window.location.origin : undefined;

// If the base ends with /api, strip it for sockets (which mount at root).
const derivedSocket =
  isRelativeApiBase
    ? browserOrigin
    : rawBase?.replace(/\/api$/, "") || rawBase || undefined;

export const API_BASE_URL = rawBase;

console.log("API_BASE_URL:", API_BASE_URL); // ✅ ADD ONLY THIS

export const SOCKET_BASE_URL =
  (import.meta.env.VITE_SOCKET_URL || "").replace(/\/$/, "") ||
  derivedSocket ||
  API_BASE_URL;

export const VOICE_SERVICE_URL =
  (import.meta.env.VITE_VOICE_SERVICE_URL || "").replace(/\/$/, "");

export const DEFAULT_PAGE_SIZE = 20;