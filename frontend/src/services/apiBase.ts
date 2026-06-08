// Resolves the API URL prefix for production subpath deployments.
// VITE_API_URL is set at build time via --build-arg VITE_API_URL=/noc (no trailing slash).
// Empty string in local dev → /api/... calls go directly to the Vite dev-server proxy.
export const API_PREFIX: string = (import.meta.env.VITE_API_URL as string) || ''
