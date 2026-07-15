import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'WM Muebles Contemporáneos',
        short_name: 'WM ERP',
        description: 'Sistema ERP WM Muebles Contemporáneos',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#8B5E3C',

        icons: [
            {
                src: '/192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/icon.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    };
}