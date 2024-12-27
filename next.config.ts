/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config: any) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
      'ws': 'commonjs ws',
    });
    return config;
  },
  async headers() {
    return [
      {
        source: '/api/transcription-status',
        headers: [
          { key: 'Upgrade', value: 'websocket' },
          { key: 'Connection', value: 'Upgrade' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/transcription-status',
        destination: '/api/transcription-status',
      },
    ];
  },
}

module.exports = nextConfig