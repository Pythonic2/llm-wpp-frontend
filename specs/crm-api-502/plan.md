# Plano de correção

1. Trocar o destino do proxy `/api/` por `ubuntu.local:8123`, host atual informado pelo usuário. Resolver via DNS do container em tempo de execução para manter o frontend estático disponível caso o nome falhe.
2. Substituir o IP antigo no cabeçalho `Host` por `ubuntu.local`. Remover a reescrita de `Origin` para o Django validar a origem real do navegador. Manter os cookies como estão nesta etapa.
3. Validar Compose, testes do frontend, lint, build e sintaxe do Nginx se o binário estiver disponível.
4. Sem publicação automática: após autorização específica, publicar imagem versionada, atualizar apenas a stack do frontend e verificar CSRF, login e inbox. Observar logs de Nginx e backend.

## Recuperação

Se o novo proxy falhar, restaurar a tag anterior da imagem do frontend na stack e investigar a resolução de `ubuntu.local`, a conectividade TCP na porta 8123 e os logs do backend. Não há migração de banco ou alteração de dados a reverter.

## Validação local em 26/11/2026

- `docker compose config --quiet`: passou.
- `npm test`: 38 testes passaram.
- `npm run lint`: passou.
- `npm run build`: passou; Rollup emitiu apenas avisos sobre comentários de dependência Zod.
- `docker run --rm --pull=never --network none ... nginx:alpine nginx -t`: sintaxe Nginx passou.
- Portainer mostra o frontend conectado a `pi_default`; isso não comprova acesso à máquina `ubuntu.local`.
- Pendentes: conexão real do Nginx ao backend, status do endpoint CSRF no CRM e login com conta de teste após publicação.

## Checklist de publicação

- Confirmar que o container do frontend resolve `ubuntu.local` (`docker exec front-saas-frontend-1 getent hosts ubuntu.local`) e alcança o backend (`docker exec front-saas-frontend-1 wget -q -O /dev/null http://ubuntu.local:8123/api/v1/auth/csrf/`); não imprimir o corpo da resposta, que contém token CSRF. Confirmar também que `DJANGO_ALLOWED_HOSTS` aceita `ubuntu.local`.
- Confirmar que `CSRF_TRUSTED_ORIGINS` contém o domínio HTTPS do CRM e a origem HTTP local usada pela equipe, sem expor valores de outras variáveis.
- Publicar imagem versionada somente após autorização específica, atualizar somente a stack do frontend e verificar `GET /api/v1/auth/csrf/`, login e `/inbox`.
- Se houver 502, conferir logs de Nginx e disponibilidade do backend; se houver 403, conferir a configuração de Host e CSRF sem desativar a proteção.
