# Gest Tech · frontend

Aplicação React + TypeScript independente do backend Django. O frontend consome exclusivamente a API autenticada sob `/api/v1/`; o webhook da Meta é configurado no backend e não é chamado pelo navegador.

## Executar localmente

Na pasta deste projeto:

```bash
cp .env.example .env
npm ci
npm run dev
```

O endereço padrão da API é `/api/v1`, encaminhado pelo Nginx de produção ao backend pela rede Docker `pi_default`. No desenvolvimento com Vite, configure `VITE_API_BASE_URL=http://ubuntu.local:8123/api/v1`. Nesse caso, o servidor Django deve permitir a origem do Vite em `FRONTEND_ORIGINS` e configurar `CSRF_TRUSTED_ORIGINS` a partir da mesma variável.

Também é possível iniciar frontend e backend juntos usando o Compose do backend:

```bash
cd ../llm-wpp
docker compose up --build
```

Abra `http://localhost:5173`. O PostgreSQL, Redis, backend e worker são gerenciados pelo Compose do backend; os arquivos React continuam neste projeto separado.

## Publicar o frontend com Docker Compose

No servidor, a stack usa a imagem versionada indicada em `docker-compose.yml`:

```bash
docker compose up -d
```

O Compose serve a imagem de produção por Nginx na porta 80 do container e publica a porta 8080 do host. Abra `http://IP-DO-SERVIDOR:8080`. O Nginx encaminha `/api/` ao backend em `ubuntu.local:8123`. O container do frontend precisa resolver `ubuntu.local` e alcançar a porta 8123 na rede local; estar na rede Docker `pi_default` por si só não garante esse acesso. Alterações locais em `nginx.conf` só entram na stack após gerar e publicar uma nova imagem versionada e atualizar sua tag no Compose/Portainer.

## Qualidade

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Autenticação e proteção de dados

A API usa sessão Django e cookie CSRF. O cliente obtém o token CSRF antes do login, mantém cookies de sessão no mesmo host e envia `X-CSRFToken` nas requisições de alteração. A troca de empresa invalida os dados de negócio em cache; as permissões continuam sendo verificadas pelo backend. Nenhuma credencial da Meta ou do Gemini é enviada ao navegador.

A sessão é renovada pelo endpoint autenticado `/api/v1/auth/refresh/` e, se expirar, o frontend limpa os dados em cache e retorna ao login. O cadastro manual de contatos exige o WhatsApp ID usado pela API. Números devem existir previamente na Meta; esta interface apenas cadastra os IDs existentes no Gest Tech e não simula conexão ou criação de números.
