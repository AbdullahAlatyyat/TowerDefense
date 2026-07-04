import { apiFetch, ApiError } from "./api";

export interface Account {
  email: string;
  muted: boolean;
}

export async function signUp(email: string, password: string): Promise<Account> {
  return apiFetch<Account>("/signup", { method: "POST", body: JSON.stringify({ email, password }) });
}

export async function signIn(email: string, password: string): Promise<Account> {
  return apiFetch<Account>("/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export async function signOut(): Promise<void> {
  await apiFetch<void>("/logout", { method: "POST" });
}

/** Resolves the signed-in account, or null if there's no valid session (guest). */
export async function getSession(): Promise<Account | null> {
  try {
    return await apiFetch<Account>("/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}
