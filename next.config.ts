import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 è un modulo nativo: va lasciato a Node, non impacchettato.
  serverExternalPackages: [
    "@prisma/adapter-better-sqlite3",
    "better-sqlite3",
    "@prisma/client",
  ],
};

export default nextConfig;
