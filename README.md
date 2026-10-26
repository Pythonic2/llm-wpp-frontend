# Gest Tech · frontend

Aplicação React + TypeScript independente do backend Django. O frontend consome exclusivamente a API autenticada sob `/api/v1/`; o webhook da Meta é configurado no backend e não é chamado pelo navegador.

## Executar localmente

Na pasta deste projeto:

```bash
cp .env.example .env
npm ci
npm run dev
```

O endereço padrão da API é `https://llm-wpp.gestcloud.com.br/api/v1` e pode ser substituído por `VITE_API_BASE_URL`. Para apontar para um backend local durante o desenvolvimento, configure `VITE_API_BASE_URL=http://localhost:8123/api/v1`. Nesse caso, o servidor Django deve permitir a origem do Vite em `FRONTEND_ORIGINS` e configurar `CSRF_TRUSTED_ORIGINS` a partir da mesma variável.

Também é possível iniciar frontend e backend juntos usando o Compose do backend:

```bash
cd ../llm-wpp
docker compose up --build
```

Abra `http://localhost:5173`. O PostgreSQL, Redis, backend e worker são gerenciados pelo Compose do backend; os arquivos React continuam neste projeto separado.

## Publicar o frontend com Docker Compose

No servidor, implante este projeto pelo Portainer ou copie-o e execute:

```bash
docker compose up --build -d
```

O Compose constrói a versão de produção, servida por Nginx na porta 80 dentro da rede Docker externa `pi_default`, como no Compose do backend. O proxy reverso conectado a essa rede deve encaminhar o domínio do frontend ao serviço `frontend` na porta 80. A API padrão é `https://llm-wpp.gestcloud.com.br/api/v1`; para substituí-la, defina `VITE_API_BASE_URL` nas variáveis do stack antes do build.

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
