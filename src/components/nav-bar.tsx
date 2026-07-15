import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Gamepad2,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
  Compass,
  Heart,
  Home as HomeIcon,
  Menu,
  X,
} from "lucide-react";

export function NavBar() {
  const navigate = useNavigate();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  const NavLinks = () => (
    <>
      <NavItem to="/" icon={HomeIcon} label="Home" onClick={() => setOpen(false)} />
      <NavItem to="/jogos" icon={Compass} label="Explorar" onClick={() => setOpen(false)} />
      {email && (
        <>
          <NavItem to="/wishlist" icon={Heart} label="Desejos" onClick={() => setOpen(false)} />
          <NavItem to="/perfil" icon={UserIcon} label="Perfil" onClick={() => setOpen(false)} />
          <NavItem
            to="/configuracoes"
            icon={SettingsIcon}
            label="Config"
            onClick={() => setOpen(false)}
          />
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">
            Meu Ludi
          </span>
        </Link>

        <nav className="hidden items-center gap-5 text-xs font-medium uppercase tracking-[0.14em] md:flex">
          <NavLinks />
          {email ? (
            <button
              onClick={handleSignOut}
              className="ml-2 flex items-center gap-1.5 border border-border px-3 py-1.5 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          ) : (
            <Link
              to="/auth"
              className="ml-2 bg-brand px-4 py-1.5 font-semibold normal-case tracking-normal hover:opacity-90"
            >
              Entrar
            </Link>
          )}
        </nav>

        <button
          onClick={() => setOpen((v) => !v)}
          className="p-2 md:hidden"
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 text-sm uppercase tracking-wider">
            <NavLinks />
            {email ? (
              <button
                onClick={handleSignOut}
                className="mt-2 flex items-center gap-2 px-3 py-2 text-left text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="mt-2 bg-brand px-4 py-2 text-center font-semibold normal-case"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  onClick,
}: {
  to: string;
  icon: typeof Gamepad2;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to as never}
      onClick={onClick}
      className="flex items-center gap-1.5 border-b-2 border-transparent px-0.5 py-1 text-muted-foreground hover:text-foreground md:px-0"
      activeProps={{ className: "!text-foreground !border-brand" }}
    >
      <Icon className="h-3.5 w-3.5 md:hidden" /> {label}
    </Link>
  );
}
