// Web (dev preview only): no push notifications. Metro picks this file
// instead of use-push.ts on web, so native-only notification APIs are
// never called there. Lists still update through Realtime.
export function usePush(_userId: string) {}
