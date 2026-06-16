// Ambient declaration for the `process.env.EXPO_PUBLIC_*` values Expo inlines at
// build time. Avoids pulling in all of @types/node just for `process`.
declare const process: { env: Record<string, string | undefined> };
