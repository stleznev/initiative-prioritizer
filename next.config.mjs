/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true
  },
  i18n: {
    locales: ['ru', 'en'],
    defaultLocale: 'ru'
  }
};

export default nextConfig;