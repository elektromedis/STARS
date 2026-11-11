import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    nama: string;
    peran: string;
    unitKerjaId: number | null;
    unitKerja: string | null;
  }
  interface Session {
    user: {
      id: string;
      nama: string;
      peran: string;
      unitKerjaId: number | null;
      unitKerja: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    nama?: string;
    peran?: string;
    unitKerjaId?: number | null;
    unitKerja?: string | null;
  }
}
