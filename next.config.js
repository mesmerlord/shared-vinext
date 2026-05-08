// QUIRK: next.config.js is kept around even though vinext is not Next.js —
// vinext reads it for image-pipeline shims (custom loader + remote patterns).
// Phase 6b can remove this if next/image is replaced with a Worker-native
// <Img> component. See canonical.md Topic 1.
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
