// src/types/next-auth.d.ts
// This file extends NextAuth types to include additional user fields
import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    email: string
    name: string | null
    image: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
  }
}