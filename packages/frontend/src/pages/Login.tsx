import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginPage() {
  const { login } = useAuthStore();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground dark">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl">
            SG
          </div>
          <CardTitle className="text-2xl">StreamGuard</CardTitle>
          <CardDescription>
            Self-hosted Twitch Bot Platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={login} className="w-full" size="lg">
            Login with Twitch
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
