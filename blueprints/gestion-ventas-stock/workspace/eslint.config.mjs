import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    ignores: ["blueprints/**", ".next/**", "node_modules/**", "public/sw.js", "public/workbox-*.js"],
  },
];

export default config;
