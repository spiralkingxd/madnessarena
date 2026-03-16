"use server"

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function toggleLocale() {
  const cookieStore = await cookies();
  const current = cookieStore.get("NEXT_LOCALE")?.value || "pt";
  const next = current === "pt" ? "en" : "pt";
  
  cookieStore.set("NEXT_LOCALE", next, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  revalidatePath("/", "layout");
}
