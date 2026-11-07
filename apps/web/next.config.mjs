/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@oddly/shared", "@oddly/ui-tokens", "@oddly/api-client"],
  async rewrites() {
    const apiUrl = process.env.API_URL || "http://localhost:4000";
    return [
      {
        source: "/v1/:path*",
        destination: `${apiUrl}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

