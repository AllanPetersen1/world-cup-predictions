/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Stops your app being embedded in iframes (clickjacking)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Stops browsers guessing content types
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Hides your tech stack from the Referer header
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Stops browser features you don't need
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

module.exports = nextConfig