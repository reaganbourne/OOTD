export type AuthMode = "login" | "signup";

export type AuthValues = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type AuthErrors = Partial<Record<keyof AuthValues | "form", string>>;

type MockSubmitResult =
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

export async function mockSubmitAuth(
  mode: AuthMode,
  values: AuthValues
): Promise<MockSubmitResult> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  const normalizedEmail = values.email.trim().toLowerCase();

  if (mode === "signup" && normalizedEmail.includes("taken")) {
    return {
      ok: false,
      message: "This mocked signup path is simulating an email conflict from the API.",
      errors: {
        email: "That email is already taken in the mocked response."
      }
    };
  }

  if (mode === "login" && normalizedEmail.includes("locked")) {
    return {
      ok: false,
      message: "This mocked login path is simulating a locked or invalid account.",
      errors: {
        form: "Unable to sign in with those mocked credentials."
      }
    };
  }

  return {
    ok: true,
    message:
      mode === "login"
        ? "Mock login succeeded. Next step is wiring this form to Reagan's auth endpoints."
        : "Mock signup succeeded. Next step is connecting this to the shared auth API contract."
  };
}

export function getMockQaNotes(mode: AuthMode): string[] {
  if (mode === "signup") {
    return [
      "Use any valid email for the mocked success path.",
      "Use an email containing 'taken' to trigger the mocked conflict state.",
      "Use mismatched passwords to verify field-level validation."
    ];
  }

  return [
    "Use any valid email and password for the mocked success path.",
    "Use an email containing 'locked' to trigger the mocked failure state.",
    "Use a password shorter than 8 characters to verify validation."
  ];
}
