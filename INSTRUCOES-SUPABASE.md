# Preparar a publicação da Plenitude

A página e a conexão do projeto já estão montadas. Antes de publicar:

1. No projeto Supabase informado, abra o **SQL Editor** e execute `supabase-setup.sql`.
2. Em **Authentication → Users**, crie o usuário do proprietário com e-mail e senha. Desative a criação pública de contas.
3. No SQL Editor, autorize esse usuário, substituindo o e-mail pelo cadastrado:

   ```sql
   insert into public.site_admins (user_id)
   select id from auth.users where email = 'EMAIL_DO_PROPRIETARIO';
   ```

4. O arquivo `supabase-config.js` já contém a URL e a chave pública do projeto. Não troque por chave `service_role` ou `secret`.
5. Renomeie `residencial-demo.html` para `index.html` e publique na raiz do repositório junto com `plenitude-app.js`, `supabase-config.js` e `plenitude-fachada.png`. Sirva por HTTP/HTTPS; abrir o arquivo diretamente no computador não permite a conexão com o banco.
6. No GitHub, ative Pages para a branch `main` e a pasta raiz, se essa for a hospedagem escolhida.

## Antes de divulgar

- Atualize os preços, as características e a disponibilidade no banco. O SQL inicial usa valores ilustrativos e marca todas as unidades XI–XIII como disponíveis.
- Troque o telefone fictício `(83) 90000-0000` pelo número que será usado no WhatsApp.
- Confirme se são 12 ou 13 empreendimentos: a sequência Plenitude I–XIII contém 13.
- Substitua os textos e imagens indicados como ilustrativos pelos materiais aprovados da construtora.

A chave pública pode ficar no navegador; o SQL aplica Row Level Security (RLS), permitindo leitura pública dos empreendimentos XI–XIII e edição apenas ao usuário autorizado em `site_admins`. Não publique senha do proprietário, `service_role` ou chaves `secret`.
