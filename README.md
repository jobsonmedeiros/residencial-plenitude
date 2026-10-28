# Residenciais Plenitude

Site público para consulta da disponibilidade dos apartamentos e painel autenticado para atualizar imóveis usando Supabase.

## Configuração

1. Crie um projeto no [Supabase](https://supabase.com/).
2. No SQL Editor do projeto, execute o conteúdo de `supabase/setup.sql`. O script cria os apartamentos I a XIII (seis por residencial), as políticas de acesso e a tabela de perfis. Os apartamentos começam como **A confirmar** para evitar anunciar disponibilidade incorreta; revise a situação e os valores no painel antes de divulgar o catálogo.
3. Crie o usuário administrador em **Authentication → Users → Add user**.
4. No SQL Editor, execute o comando comentado no final de `supabase/setup.sql`, trocando o e-mail pelo do administrador. Somente usuários com perfil `admin` podem editar apartamentos.
5. Copie `.env.example` para `.env.local` e informe a URL do projeto e a chave pública (anon/publishable) em **Project Settings → API**.
6. Execute `npm install` e `npm run dev`.

O catálogo é público e somente leitura. As alterações exigem login e são protegidas por Row Level Security no banco; nunca use a chave `service_role` no navegador.

## Adicionar residenciais a um projeto existente

Se o projeto Supabase já foi configurado, execute `supabase/add-residential-management.sql` uma vez no SQL Editor. Essa migração amplia os limites da tabela e permite que administradores criem apartamentos com segurança.

Depois, entre como administrador no site e clique em **Novo residencial**. Informe a quantidade de apartamentos em cada andar; use **Adicionar andar** para incluir outros andares. O site gera o próximo número romano e numera as unidades por andar (por exemplo, 101, 102 no térreo e 201 no primeiro andar).

## Publicar no GitHub Pages

O workflow `.github/workflows/deploy.yml` publica automaticamente o site quando há um push para `main`. No repositório, abra **Settings → Pages** e selecione **GitHub Actions** como origem. Em **Settings → Secrets and variables → Actions**, crie os secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do `.env.local`; nunca configure a chave `service_role`.

Após enviar as alterações para `main`, acompanhe a execução em **Actions**. Quando o deploy terminar, o endereço do site estará em **Settings → Pages**. Para este repositório, o caminho esperado é `https://jobsonmedeiros.github.io/residencial-plenitude/`.
