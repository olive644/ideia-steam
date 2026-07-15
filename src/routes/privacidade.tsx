import { createFileRoute, Link } from "@tanstack/react-router";
import { NavBar } from "@/components/nav-bar";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | Meu Ludi" },
      { name: "description", content: "Política de Privacidade do Meu Ludi." },
    ],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Dados coletados</h2>
            <p className="mt-2">
              Coletamos nome, email, foto de perfil (opcional) e bio (opcional) fornecidos por você.
              Também armazenamos dados de autenticação necessários para manter sua sessão.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Uso dos dados</h2>
            <p className="mt-2">
              Utilizamos seus dados para autenticar seu acesso, exibir seu perfil público, enviar
              emails transacionais (confirmação de cadastro, redefinição de senha) e melhorar o
              serviço.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Login social</h2>
            <p className="mt-2">
              Ao entrar via Google ou Discord, recebemos do provedor seu nome, email e foto pública.
              Nunca temos acesso à sua senha desses serviços.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Armazenamento</h2>
            <p className="mt-2">
              Seus dados são armazenados em provedores de nuvem seguros. Aplicamos políticas de
              acesso restritas: cada usuário só pode alterar os próprios dados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Compartilhamento</h2>
            <p className="mt-2">
              Não vendemos seus dados. Compartilhamos apenas com provedores essenciais ao
              funcionamento do serviço (autenticação, envio de email) e quando exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Seus direitos</h2>
            <p className="mt-2">
              Você pode acessar, corrigir ou excluir seus dados a qualquer momento nas
              Configurações. Para exclusão total da conta, entre em contato conosco.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Cookies</h2>
            <p className="mt-2">
              Usamos cookies e armazenamento local apenas para manter sua sessão ativa. Não usamos
              cookies de rastreamento publicitário.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Contato</h2>
            <p className="mt-2">
              Dúvidas sobre privacidade? Entre em contato pela página de suporte quando disponível.
            </p>
          </section>
        </div>

        <div className="mt-10">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Voltar
          </Link>
        </div>
      </main>
    </div>
  );
}
