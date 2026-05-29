import type { ApiFieldErrors } from "@/lib/api-client";

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_BYTES = 72;

export type AuthMode = "login" | "signup";

export type AuthValues = {
  username: string;
  email: string;
  identifier: string; // login only: email or username
  password: string;
  confirmPassword: string;
};

export type AuthErrors = Partial<Record<keyof AuthValues | "form", string>>;

export function createInitialAuthValues(): AuthValues {
  return {
    username: "",
    email: "",
    identifier: "",
    password: "",
    confirmPassword: ""
  };
}

export function validateAuthForm(mode: AuthMode, values: AuthValues): AuthErrors {
  const errors: AuthErrors = {};

  if (mode === "signup" && values.username.trim().length < 3) {
    errors.username = "Choose a username with at least 3 characters.";
  }

  if (mode === "login") {
    if (!values.identifier?.trim()) {
      errors.email = "Email or username is required.";
    }
  } else {
    if (!values.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      errors.email = "Enter a valid email address.";
    }
  }

  const passwordByteLength = new TextEncoder().encode(values.password).length;

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (mode === "signup" && values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  } else if (passwordByteLength > MAX_PASSWORD_BYTES) {
    errors.password = `Password must be ${MAX_PASSWORD_BYTES} bytes or fewer.`;
  }

  if (mode === "signup") {
    if (!values.confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (values.confirmPassword !== values.password) {
      errors.confirmPassword = "Passwords do not match.";
    }
  }

  return errors;
}

export function toAuthErrors(errors?: ApiFieldErrors): AuthErrors | undefined {
  if (!errors) {
    return undefined;
  }

  const nextErrors: AuthErrors = {};

  for (const [field, message] of Object.entries(errors)) {
    if (
      field === "form" ||
      field === "username" ||
      field === "email" ||
      field === "password" ||
      field === "confirmPassword"
    ) {
      nextErrors[field] = message;
    }
  }

  return Object.keys(nextErrors).length > 0 ? nextErrors : undefined;
}
