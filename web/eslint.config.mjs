import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  { ignores: ['.next/**', 'node_modules/**'] },
  ...compat.extends('next/core-web-vitals'),
  // Admin thumbnails use plain <img>; they are tiny and never shown to shoppers.
  { files: ['app/admin/**'], rules: { '@next/next/no-img-element': 'off' } },
];

export default config;
