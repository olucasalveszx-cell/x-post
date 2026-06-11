import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade — XPost",
  description: "Saiba como coletamos, usamos e protegemos seus dados no XPost.",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#060606] text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-xs text-purple-400 hover:text-purple-300 transition-colors mb-6 inline-block">
            ← Voltar ao início
          </Link>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">Política de Privacidade</h1>
          <p className="text-sm text-gray-500">Última atualização: abril de 2025</p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed">
          <section>
            <h2 className="text-white font-bold text-base mb-3">1. Quem somos</h2>
            <p>
              O <strong className="text-white">XPost</strong> é uma plataforma online para criação de carrosséis e
              conteúdos visuais para redes sociais, desenvolvida e operada de forma independente. Nosso site está
              disponível em <strong className="text-white">xpostzone.com.br</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">2. Dados que coletamos</h2>
            <ul className="list-disc list-inside space-y-1.5 text-gray-400">
              <li><span className="text-gray-300">Nome e e-mail</span> — fornecidos no cadastro ou via login Google.</li>
              <li><span className="text-gray-300">Dados de uso</span> — carrosséis gerados, créditos consumidos e atividade na plataforma.</li>
              <li><span className="text-gray-300">Dados de pagamento</span> — processados diretamente pela Kirvano; não armazenamos dados de cartão.</li>
              <li><span className="text-gray-300">Token do Instagram</span> — caso você conecte sua conta, armazenamos temporariamente o token de acesso para publicar conteúdo em seu nome.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">3. Como usamos seus dados</h2>
            <ul className="list-disc list-inside space-y-1.5 text-gray-400">
              <li>Autenticação e acesso à plataforma.</li>
              <li>Controle de créditos e planos de assinatura.</li>
              <li>Publicação de conteúdo no Instagram quando autorizado por você.</li>
              <li>Melhoria do serviço e suporte ao usuário.</li>
            </ul>
            <p className="mt-3 text-gray-400">
              Não vendemos, alugamos nem compartilhamos seus dados com terceiros para fins comerciais.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">4. Integração com o Instagram / Meta</h2>
            <p className="text-gray-400">
              Ao conectar sua conta do Instagram, o XPost solicita permissão para publicar conteúdo em seu perfil.
              Utilizamos a API oficial da Meta (Facebook) para isso. Você pode revogar esse acesso a qualquer momento nas
              configurações do seu Instagram em{" "}
              <strong className="text-white">Configurações → Aplicativos e Sites</strong>.
            </p>
            <p className="mt-3 text-gray-400">
              Não acessamos mensagens privadas, lista de seguidores nem qualquer informação além das permissões
              explicitamente concedidas por você.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">5. Cookies e armazenamento</h2>
            <p className="text-gray-400">
              Utilizamos cookies de sessão para manter você autenticado. Não usamos cookies de rastreamento de terceiros
              nem pixels de publicidade.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">6. Seus direitos (LGPD)</h2>
            <p className="text-gray-400 mb-3">
              Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-gray-400">
              <li>Acessar os dados que armazenamos sobre você.</li>
              <li>Solicitar a correção de dados incorretos.</li>
              <li>Solicitar a exclusão da sua conta e de todos os seus dados.</li>
              <li>Revogar o consentimento para uso dos seus dados a qualquer momento.</li>
            </ul>
            <p className="mt-3 text-gray-400">
              Para exercer esses direitos, entre em contato pelo e-mail abaixo.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">7. Segurança</h2>
            <p className="text-gray-400">
              Seus dados são armazenados com criptografia em repouso e transmitidos via HTTPS. Senhas são armazenadas
              com hash seguro (bcrypt). Realizamos revisões periódicas de segurança.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">8. Retenção de dados</h2>
            <p className="text-gray-400">
              Mantemos seus dados enquanto sua conta estiver ativa. Após solicitação de exclusão, removemos seus dados
              em até 30 dias, exceto onde houver obrigação legal de retenção.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">9. Contato</h2>
            <p className="text-gray-400">
              Dúvidas, solicitações ou reclamações relacionadas à privacidade podem ser enviadas para:{" "}
              <a
                href="mailto:suporte@xpostzone.com.br"
                className="text-purple-400 hover:text-purple-300 underline transition-colors"
              >
                suporte@xpostzone.com.br
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold text-base mb-3">10. Alterações nesta política</h2>
            <p className="text-gray-400">
              Podemos atualizar esta política periodicamente. Quando houver mudanças relevantes, notificaremos por
              e-mail ou via aviso na plataforma. O uso contínuo do XPost após as alterações implica aceitação da
              nova política.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 text-center text-[11px] text-gray-700">
          © {new Date().getFullYear()} XPost · Todos os direitos reservados
        </div>
      </div>
    </div>
  );
}
