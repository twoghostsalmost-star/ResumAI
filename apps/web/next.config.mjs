/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@resumeforge/shared"],
  // The Descope Vercel integration injects DESCOPE_PROJECT_ID (a server-side
  // name). Next.js only exposes NEXT_PUBLIC_* to the browser, so bridge it here:
  // the client gets the project id whether you set NEXT_PUBLIC_DESCOPE_PROJECT_ID
  // yourself or the integration set DESCOPE_PROJECT_ID.
  env: {
    NEXT_PUBLIC_DESCOPE_PROJECT_ID:
      process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID ??
      process.env.DESCOPE_PROJECT_ID ??
      "",
  },
};

export default nextConfig;
