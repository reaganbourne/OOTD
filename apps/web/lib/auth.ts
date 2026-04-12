import { authApiClient } from "@/lib/api-client";

export type AuthMode = "login" | "signup";

export type AuthValues = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type AuthErrors = Partial<Record<keyof AuthValues | "form", string>>;

type SubmitAuthResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
      errors?: AuthErrors;
    };

export function createInitialAuthValues(): AuthValues {
  return {
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  };
}

export function validateAuthForm(mode: AuthMode, values: AuthValues): AuthErrors {
  const errors: AuthErrors = {};

  if (mode === "signup" && values.username.trim().length < 3) {
    errors.username = "Choose a username with at least 3 characters.";
  }

  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (values.password.length < 8) {
    errors.password = "Password must be at least 8 characters long.";
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

function toAuthErrors(errors?: Record<string, string>): AuthErrors | undefined {
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

export async function submitAuth(
  mode: AuthMode,
  values: AuthValues
): Promise<SubmitAuthResult> {
  const result =
    mode === "signup"
      ? await authApiClient.register({
          username: values.username.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password
        })
      : await authApiClient.login({
          email: values.email.trim().toLowerCase(),
          password: values.password
        });

  if (result.ok) {
    return {
      ok: true,
      message: result.message
    };
  }

  return {
    ok: false,
    message: result.message,
    errors: toAuthErrors(result.errors)
  };
}
