"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

// Server Actions de auth -- usadas pelo form de login (app/login/page.tsx)
// e pelo botão de logout (app/(app)/SignOutButton.tsx). Substituem as
// chamadas client-side ao supabase-js.
export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await auth.signIn.email({ email, password });
  if (error) return { error: error.message };

  redirect("/leads");
}

export async function signOutAction() {
  await auth.signOut();
  redirect("/login");
}

export async function signUpAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  const { error } = await auth.signUp.email({ email, password, name });
  if (error) return { error: error.message };

  redirect("/leads");
}
