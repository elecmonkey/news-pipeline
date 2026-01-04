import type { PrismaClient as PrismaClientType } from "@prisma/client";

export const PrismaClient: typeof PrismaClientType;
export type PrismaClient = PrismaClientType;
export * from "@prisma/client";
