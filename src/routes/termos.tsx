import { createFileRoute, Link } from "@tanstack/react-router";
import { NavBar } from "@/components/nav-bar";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso | Meu Ludi" },
      { name: "description", content: "Termos de Uso do Meu Ludi." },
    ],
  }),
  component: Termos,
});

function Termos() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">Termos de Uso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>

        <div className="prose prose-invert mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Aceitação</h2>
            <p className="mt-2">
              Ao criar uma conta ou usar o Meu Ludi, você declara ter no mínimo 13 anos e concorda
              integralmente com estes Termos de Uso e com a Política de Privacidade. Caso não
              concorde, não utilize o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Conta e cadastro</h2>
            <p className="mt-2">
              O cadastro exige nome, email e senha válidos. Você é responsável por manter suas
              credenciais em sigilo e por toda a atividade realizada na sua conta. Contas criadas
              com informações falsas podem ser suspensas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Verificação por email</h2>
            <p className="mt-2">
              Após o cadastro, enviamos um email de confirmação. O acesso completo à conta só é
              liberado após a verificação do endereço fornecido.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Conduta do usuário</h2>
            <p className="mt-2">
              Você concorda em não publicar conteúdo ilegal, ofensivo, discriminatório, spam ou que
              viole direitos de terceiros. Podemos remover conteúdo e suspender contas que violem
              estas regras.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Conteúdo do usuário</h2>
            <p className="mt-2">
              As resenhas, notas, listas e demais conteúdos publicados permanecem seus. Você nos
              concede uma licença não exclusiva para exibi-los dentro do Meu Ludi.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Encerramento</h2>
            <p className="mt-2">
              Você pode encerrar sua conta a qualquer momento nas Configurações. Podemos encerrar
              contas em caso de violação destes Termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Alterações</h2>
            <p className="mt-2">
              Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas por email ou no
              próprio site.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Contato</h2>
            <p className="mt-2">
              Dúvidas? Entre em contato pela página de suporte quando disponível.
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
