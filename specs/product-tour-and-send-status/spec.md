# Tour do produto e estado do envio manual

## Problema e evidências

O usuário quer entender os módulos, ações e campos do CRM por um tour clicável. Também relata demora com o botão “Enviando…” e erros 404 em prévia/uso da IA e assinaturas. O frontend publicado ainda mostra o compositor antigo, enquanto o código atual já possui bolha imediata e rascunho livre. As três rotas que retornam 404 existem no backend atual, mas a versão antiga está fixada no Compose de produção preparado na sessão anterior.

## Atores e regras

- Atendente vê ajuda apenas para módulos a que pode acessar.
- Administrador/dono vê também áreas administrativas; assinatura e nova empresa são exclusivas do dono.
- O tour é optativo, reabrível e não dispara envios, cobranças ou alterações de dados.
- O envio manual mostra tentativa imediatamente, sem afirmar entrega antes da confirmação da API/WhatsApp. Quando a API retorna pendência, a consulta automática deve ser mais rápida sem polling contínuo em conversas sem envio pendente.
- Erros 404 de produção exigem atualização do backend em execução e migrações compatíveis; a interface não deve mascarar esses erros como sucesso.

## Critérios e matriz de verificação

| Critério | Verificação |
| --- | --- |
| Botão Tour acessível no app, com navegação por módulo, etapas e link para a tela | Teste de componente com clique, teclado e navegação |
| Conteúdo explica propósito, ações e campos principais de cada módulo visível | Revisão da lista de rotas e papéis; teste de presença dos tópicos |
| Atendente não recebe links/etapas de administração; dono recebe assinatura | Teste por papel e checagem de rota protegida |
| Tour pode ser fechado e reaberto sem ação de negócio | Teste de componente; nenhuma mutation/API no tour |
| Envio pendente atualiza status mais cedo; demais conversas mantêm intervalo normal | Teste do polling por estado com relógio controlado ou inspeção do intervalo |
| URLs atuais de IA e cobrança batem com o backend versionado | Comparação de contrato e registro do bloqueio de deploy |

## Falhas, segurança e limites

O tour não expõe credenciais e respeita a autorização já aplicada nas rotas. Não coleta dados de uso nem marca ações como concluídas. A latência real da chamada síncrona à Meta permanece no backend; o código novo melhora o feedback e a consulta de estado, mas a tela de produção só muda após deploy. Não executar envio real, cancelamento de assinatura ou migrações em produção como teste.
