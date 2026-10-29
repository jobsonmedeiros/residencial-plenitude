# Residenciais Plenitude

> Catálogo imobiliário com consulta pública de apartamentos e painel administrativo para gestão dos imóveis.

[Acessar demonstração](https://jobsonmedeiros.github.io/residencial-plenitude/)

## Sobre o projeto

O Residenciais Plenitude é uma aplicação web para apresentar os empreendimentos e facilitar a consulta de apartamentos disponíveis. O catálogo público é integrado a um painel protegido, permitindo que a equipe mantenha as informações dos imóveis atualizadas sem alterar o código do site.

O projeto foi desenvolvido para aproximar clientes e consultores: além de explorar os imóveis, visitantes podem iniciar uma conversa pelo WhatsApp com uma mensagem contextualizada sobre o apartamento.

## Funcionalidades

- Catálogo de apartamentos com busca por residencial ou unidade.
- Filtros por empreendimento e situação do imóvel.
- Exibição de preço, disponibilidade e detalhes técnicos e financeiros cadastrados.
- Galeria de imagens e navegação responsiva para dispositivos móveis.
- Contato com consultor pelo WhatsApp diretamente a partir do site.
- Login administrativo para cadastrar residenciais e gerenciar apartamentos.
- Controle de acesso às alterações com autenticação e políticas de segurança no Supabase.

## Tecnologias

- **React 18** e **TypeScript**
- **Vite**
- **Supabase** (PostgreSQL, autenticação e Row Level Security)
- **Lucide React**
- **GitHub Pages** e **GitHub Actions** para publicação

## Executar localmente

### Pré-requisitos

- Node.js 20 ou superior
- npm
- Um projeto no [Supabase](https://supabase.com/)

### Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. No SQL Editor do Supabase, execute [`supabase/setup.sql`](supabase/setup.sql). O script cria as tabelas e políticas de acesso, mas não insere residenciais nem apartamentos. O cadastro é feito pelo painel administrativo.
3. Crie o usuário administrador em **Authentication → Users → Add user**.
4. Execute o comando comentado ao final de `supabase/setup.sql`, substituindo o e-mail pelo do administrador. Somente usuários com perfil `admin` podem editar apartamentos.
5. Copie `.env.example` para `.env.local` e informe a URL do projeto e a chave pública (anon/publishable), disponíveis em **Project Settings → API**:

   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-publica-anon-ou-publishable
   ```

6. Inicie o servidor local:

   ```bash
   npm run dev
   ```

O catálogo permite leitura pública; alterações exigem login e são protegidas por Row Level Security. Nunca use a chave `service_role` no navegador nem a inclua no repositório.

## Atualizar um projeto Supabase existente

Se o banco já foi configurado anteriormente, execute no SQL Editor as migrações necessárias. Para habilitar nomes personalizados e impedir nomes repetidos, execute `supabase/add-residential-name.sql` se a coluna ainda não existir e, em seguida, `supabase/add-unique-residential-name.sql`. A migração de unicidade também adiciona a coluna caso necessário. Se encontrar residenciais sem nome, nomes duplicados ou unidades do mesmo residencial com nomes divergentes, ela interrompe a execução sem excluir registros; corrija os dados existentes manualmente e execute-a novamente.

| Arquivo | Finalidade |
| --- | --- |
| [`supabase/add-residential-management.sql`](supabase/add-residential-management.sql) | Permite que administradores criem residenciais e apartamentos. |
| [`supabase/add-apartment-details.sql`](supabase/add-apartment-details.sql) | Adiciona campos técnicos e financeiros aos apartamentos. |
| [`supabase/add-apartment-price-optional.sql`](supabase/add-apartment-price-optional.sql) | Permite preço não definido; o anúncio exibe “A consultar”. |
| [`supabase/add-residential-name.sql`](supabase/add-residential-name.sql) | Permite nomes personalizados para novos residenciais. |
| [`supabase/add-unique-residential-name.sql`](supabase/add-unique-residential-name.sql) | Exige nome em novos cadastros e bloqueia nomes repetidos, ignorando maiúsculas/minúsculas e espaços excedentes. Detecta conflitos existentes sem apagá-los. |
| [`supabase/add-apartment-deletion.sql`](supabase/add-apartment-deletion.sql) | Habilita a exclusão de apartamentos e residenciais. A exclusão de um residencial também remove suas unidades. |
| [`supabase/remove-seed-residentials.sql`](supabase/remove-seed-residentials.sql) | Remove dados antigos de exemplo. **Apaga permanentemente apartamentos e residenciais**; faça backup antes de executar. |

Após configurar a gestão de residenciais, entre no site como administrador e selecione **Novo residencial**. Informe explicitamente o nome e a quantidade de apartamentos por andar. A criação é permitida apenas a administradores; o banco rejeita nomes vazios e nomes já utilizados em outro residencial.

## Publicação

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) publica o site no GitHub Pages a cada push para `main`. Para configurar:

1. Em **Settings → Pages**, selecione **GitHub Actions** como origem.
2. Em **Settings → Secrets and variables → Actions**, crie os secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do Supabase.
3. Envie as alterações para `main` e acompanhe o workflow em **Actions**.

A URL publicada para este repositório é [jobsonmedeiros.github.io/residencial-plenitude](https://jobsonmedeiros.github.io/residencial-plenitude/).
