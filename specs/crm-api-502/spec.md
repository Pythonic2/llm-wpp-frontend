# CRM: falha 502 no acesso à API

## Evidências e objetivo

- Em 26/11/2026, `/login` carrega no domínio `crm.gestcloud.com.br`, mas `/api/v1/auth/csrf/` nesse domínio retorna 502 pela Cloudflare e `/inbox` mostra erro de origem.
- O endpoint de CSRF no domínio direto `llm-wpp.gestcloud.com.br` abre. A rota do túnel aponta o CRM para `front-saas-frontend-1:80` e o backend para `saas-backend-1:8123`.
- O Nginx do frontend ainda encaminha `/api/` ao IP antigo `192.168.0.6:8123`. O host atual do backend é `ubuntu.local`; as duas stacks participam da rede Docker externa `pi_default`.
- Objetivo: encaminhar a API do CRM ao backend atual pela rede Docker sem depender do IP antigo nem da resolução mDNS de `ubuntu.local` no container.

## Cenários e critérios de aceitação

1. Dado o backend ativo na rede `pi_default`, quando o navegador chama `/api/v1/auth/csrf/` no domínio do CRM, então a requisição chega ao backend e retorna o JSON esperado, sem 502.
2. Dado o frontend ativo e o backend temporariamente indisponível, quando `/login` é aberto, então os arquivos estáticos continuam disponíveis; a API pode retornar 502 de modo controlado.
3. Dado um usuário autorizado, quando faz login no domínio do CRM, então CSRF, sessão e navegação para `/inbox` funcionam sem expor credenciais ou aceitar uma origem indevida.
4. A configuração Nginx deve validar sintaticamente; o Compose deve permanecer válido; o build e os testes do frontend devem passar.

## Segurança e limites

- Não alterar credenciais, banco, permissões, regras CSRF ou cookies neste reparo de conectividade. Atualizar o cabeçalho `Host` e encaminhar o `Origin` real do navegador para o Django.
- Não executar login com dados reais nem teste de escrita em produção sem autorização específica.
- A validação real de login e sessão após publicação é obrigatória antes de considerar o incidente resolvido. Se surgir 403, investigar `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` e protocolo encaminhado sem afrouxar a proteção.

## Matriz de verificação

| Critério | Verificação local | Verificação após publicação |
| --- | --- | --- |
| 1 | Destino Nginx e rede Compose | GET público de `/api/v1/auth/csrf/` sem 502 |
| 2 | Resolução DNS do Nginx em tempo de execução | Abrir `/login` durante indisponibilidade controlada do backend, se houver janela |
| 3 | Revisão dos cabeçalhos; confirmar `CSRF_TRUSTED_ORIGINS` para CRM e acesso local | Login manual com conta de teste e abertura de `/inbox` |
| 4 | `docker compose config`, `npm test`, lint e build; `nginx -t` quando disponível | Verificar logs do Nginx e do backend |
