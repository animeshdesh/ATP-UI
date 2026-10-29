import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Inverted from money (white tile, blue mark) so the two apps differ on a phone's home screen.
// The source is already a blue tile with the white mark, so "any" icons use it edge to edge.
const tile = { resizeOptions: { background: '#06AEEF' } };

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, ...tile },
    apple: { ...minimal2023Preset.apple, ...tile, padding: 0.15 },
  },
  images: ['public/atp-mark-tab.svg'],
});
