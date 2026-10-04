/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["localhost", "lh3.googleusercontent.com", "images.unsplash.com", "pxscdn.com"],
  },
  async rewrites() {
    const isDev = process.env.NODE_ENV === "development";
    const defaultBackend = isDev ? "http://127.0.0.1:8000" : "https://facefinder-backend-218725985655.us-central1.run.app";
    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || defaultBackend).replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

