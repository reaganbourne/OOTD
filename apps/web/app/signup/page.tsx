import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignupPage() {
  return (
    <AuthShell mode="signup">
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
