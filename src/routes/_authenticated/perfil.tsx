import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/nav-bar";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Perfil | Meu Ludi" }] }),
  component: MyProfileRedirect,
});

function MyProfileRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/perfil/$id", params: { id: data.user.id }, replace: true });
    });
  }, [navigate]);
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto flex max-w-md justify-center px-4 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </main>
    </div>
  );
}
