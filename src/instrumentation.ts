import { validateRequiredEnv } from "@/lib/env";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    validateRequiredEnv();
  }
}
