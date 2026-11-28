# Incidente: API e webhook retornando 500 em 27/11/2026

## Objetivo e evidências

Restabelecer autenticação e processamento do webhook sem perda de mensagens. Às 11:05 (America/Sao_Paulo), o backend retornou 500 em `/api/v1/auth/me/`, `/api/v1/auth/csrf/`, `/api/v1/public/prices/` e `/api/webhooks/whatsapp/`. Os arquivos estáticos do frontend responderam 200.

Os logs do worker `saas-worker-1` no Portainer, às 11:12, mostram `django.db.utils.OperationalError`: a conexão IPv4 ao Neon foi recusada com `Your account or project has exceeded the quota. Upgrade your plan to increase limits.` As tentativas IPv6 também falharam por falta de rota, mas a recusa IPv4 por cota é a evidência decisiva. Não há evidência de defeito no formulário de login ou no proxy Nginx para este incidente.

Às 11:16, requisições sem sessão a `/api/v1/auth/csrf/` retornaram 200 nos domínios do CRM e do backend. `/api/v1/public/prices/` retornou 404 sem sessão, enquanto o código local do backend contém essa rota. O container `saas-backend-1` ainda executa a imagem da revisão `9b222917...`; a atualização preparada está descrita em `../llm-wpp/specs/releases/raspberry-20261126-order-dedup-inbox.md` e requer checagem de migrations antes da publicação. O webhook continuou retornando 500 após o teste de CSRF.

## Cenários e critérios de aceitação

1. O Neon volta a aceitar conexões e uma consulta somente leitura ao schema configurado passa a responder sem `OperationalError`.
2. Depois de verificar o estado das migrations e de fazer backup, a versão compatível do backend pode ser aplicada; `showmigrations` e os endpoints públicos confirmam a versão esperada.
3. O login com conta de teste retorna sucesso, `/auth/me/` funciona com sessão e a página de configurações carrega sem 500.
4. O webhook assinado volta a responder 200, preservando assinatura e idempotência; a fila Celery processa tarefas sem falhas de conexão. Não enviar mensagens reais como teste.
5. Os containers do backend, worker, agendador e frontend exibem os digests esperados, sem processo antigo concorrente, e os logs deixam de mostrar 500 recorrentes.

## Plano e verificações

1. Liberar a cota do projeto Neon ou aguardar sua renovação. Não mudar plano nem criar recurso pago sem autorização específica.
2. Confirmar conectividade e consulta somente leitura ao banco a partir do ambiente do Raspberry. Identificar schema, versão aplicada e espaço para backup. Se o banco continuar inacessível, interromper o deploy.
3. Seguir a sequência de backup, migrations aditivas e atualização das stacks descrita na especificação de release do backend. Preservar os manifestos e digests atuais para recuperação.
4. Validar CSRF, preços públicos, login com conta de teste, webhook/worker e ausência de 500. A consulta pública de CSRF sozinha não valida a recuperação do banco.

## Segurança e recuperação

O webhook exige assinatura; não enfraquecer essa verificação nem aceitar duplicatas para ocultar os 500. Não usar credenciais de produção para escritas de diagnóstico. Se a nova versão falhar após o banco voltar, restaurar apenas os digests/Compose anteriores; não reverter migrations ou restaurar dados sem análise específica. O acesso SSH deste ambiente a `192.168.0.6` falhou com `No route to host`, portanto não houve acesso ao host nem deploy neste incidente.

## Retomada em 27/11/2026

Após a atualização do plano pelo usuário, uma consulta somente leitura ao Neon confirmou conexão e schema configurado. A última migration aplicada é `0022_plan_pricing`; `0023` a `0025` continuam pendentes. O acesso SSH funciona em `pi@192.168.0.5`; os containers de produção ainda usam as revisões antigas do backend (`9b222917...`) e do frontend (`afe9802...`). As configurações atuais das stacks foram preservadas em diretório privado no Raspberry antes de qualquer atualização. O frontend passou em 47 testes, lint e build; `manage.py check` passou. O `docker compose config` do backend foi validado com valores fictícios para não expor credenciais locais durante interpolação.

## Publicação e verificação em 27/11/2026

- Backup privado do schema `crm` em `/home/pi/gesttech-release-20261127/backup/crm-pre-0023-20261127.dump`, SHA-256 `e7b8f407470d4aa2434e460d3fb6a469c0b93fbb0c731587d6006141b63e49a3`, catálogo legível e dados de 46 tabelas.
- Migrations `0023`, `0024` e `0025` aplicadas uma única vez após parar backend, worker e agendador antigos. Os três containers novos executam a revisão `41e2f4af...`; o frontend executa `70371da7...`.
- `/`, `/login`, `/api/v1/auth/csrf/`, `/api/v1/public/prices/` e assets versionados retornaram 200 no domínio CRM. Rotas de unidades e uso da IA retornaram 403 sem sessão, confirmando que existem e exigem autenticação. Worker Celery respondeu ao ping; 17 webhooks recentes retornaram 200, sem 500 ou reinícios nos logs verificados.
- Digests publicados em `main` dos dois repositórios e aplicados no Raspberry. O cache do Portainer para o backend sincronizou pelo GitOps; o do frontend foi alinhado ao manifesto publicado e à imagem em execução, preservando o Compose anterior no backup privado.
- Login autenticado e operações de cobrança não foram executados como teste por falta de conta de teste e por envolverem dados reais. A chave Asaas do arquivo privado difere do valor efetivo recebido pelo container após a interpolação do Compose; a configuração foi preservada e exige correção separada autorizada.
