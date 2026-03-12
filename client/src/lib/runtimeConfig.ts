declare global {
  interface Window {
    __APP_CONFIG__?: {
      VITE_API_URL?: string
    }
  }
}

export const getApiBaseUrl = (): string => {
  const runtimeUrl = window.__APP_CONFIG__?.VITE_API_URL?.trim()
  if (runtimeUrl) {
    return runtimeUrl
  }

  const buildTimeUrl = import.meta.env.VITE_API_URL?.trim()
  if (buildTimeUrl) {
    return buildTimeUrl
  }

  return 'http://localhost:3000'
}