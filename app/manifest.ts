import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Faithful Together',
    short_name: 'Faithful',
    description: 'A private family journey of faith, health, and steady discipline.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fffdf8',
    theme_color: '#315c48',
    orientation: 'portrait-primary',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
