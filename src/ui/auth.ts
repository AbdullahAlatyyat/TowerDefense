import { ApiError } from "../net/api";
import { signIn, signUp, type Account } from "../net/auth";

export interface AuthScreen {
  show(): void;
  hide(): void;
}

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Enter a valid email and a password (8+ characters).",
  email_taken: "That email already has an account — try signing in instead.",
  invalid_credentials: "Wrong email or password.",
  too_many_attempts: "Too many attempts — wait a few minutes and try again.",
};

export function createAuthScreen(opts: {
  onSignedIn: (account: Account) => void;
  onGuest: () => void;
}): AuthScreen {
  const screen = el("screen-auth");
  const tabSignIn = el<HTMLButtonElement>("btn-auth-tab-signin");
  const tabSignUp = el<HTMLButtonElement>("btn-auth-tab-signup");
  const form = el<HTMLFormElement>("auth-form");
  const emailInput = el<HTMLInputElement>("auth-email");
  const passwordInput = el<HTMLInputElement>("auth-password");
  const errorEl = el("auth-error");
  const submitBtn = el<HTMLButtonElement>("btn-auth-submit");
  const guestBtn = el<HTMLButtonElement>("btn-auth-guest");

  let mode: "signin" | "signup" = "signin";

  function setMode(next: "signin" | "signup"): void {
    mode = next;
    tabSignIn.classList.toggle("active", mode === "signin");
    tabSignUp.classList.toggle("active", mode === "signup");
    submitBtn.textContent = mode === "signin" ? "Sign in" : "Sign up";
    passwordInput.autocomplete = mode === "signin" ? "current-password" : "new-password";
    errorEl.hidden = true;
  }

  tabSignIn.addEventListener("click", () => setMode("signin"));
  tabSignUp.addEventListener("click", () => setMode("signup"));
  guestBtn.addEventListener("click", () => opts.onGuest());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    submitBtn.disabled = true;
    try {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const account = mode === "signin" ? await signIn(email, password) : await signUp(email, password);
      passwordInput.value = "";
      opts.onSignedIn(account);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "unknown_error";
      errorEl.textContent = ERROR_MESSAGES[code] ?? "Something went wrong. Try again.";
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });

  return {
    show() {
      setMode("signin");
      screen.hidden = false;
    },
    hide() {
      screen.hidden = true;
    },
  };
}
