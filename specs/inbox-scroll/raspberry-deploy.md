# Scroll das conversas e deploy no Raspberry — 15/11/2026

## Objetivo e critérios

- Ao abrir uma conversa, mostrar as últimas mensagens no fim da lista.
- Com o usuário perto do fim, acompanhar mensagens recebidas por atualização automática e mensagens enviadas por ele.
- Quando o usuário sobe para ler o histórico, novas mensagens não deslocam sua leitura.
- Ao carregar mensagens antigas, conservar a mensagem que estava na tela.

## Mudança e validação

- `src/App.tsx` acompanha o estado do scroll e a conversa selecionada; ajusta a posição após renderização das mensagens e ancora o histórico paginado.
- Testes de comportamento em `src/App.test.tsx`: abertura no fim, atualização perto/longe do fim e carregamento de mensagens antigas sem salto.
- `npm test`: 29 testes passaram; `npm run lint` passou; `npm run build` passou. O Vite mostrou avisos de comentários `@__PURE__` em dependências Zod, sem falha.
- A imagem ARM64 `sha-72af0fae2e9294b25deadd4d69242214e32971f2` foi publicada pelo GitHub Actions com sucesso. `docker compose config` confirmou a tag fixa e `pull_policy: always`.

## Publicação e recuperação

- O Compose anterior foi preservado em `/home/pi/gesttech-scroll-20261115/backup/docker-compose.yml` no Raspberry.
- A imagem fixa foi baixada e aplicada somente à stack `front-saas`; backend, banco e migrations não foram alterados.
- O webhook GitOps oficial da stack foi acionado sem expor seu identificador. O arquivo Compose em cache do Portainer convergiu para a mesma tag fixa; o container está `running`, com rótulo OCI de revisão correspondente.
- `/inbox` local e público responderam HTTP 200. Não houve teste manual com sessão real no navegador; o comportamento do scroll foi coberto nos testes do componente.
- Se a nova imagem falhar, restaurar o Compose anterior, recriar somente o frontend e alinhar a referência no Git/Portainer para evitar nova aplicação automática da versão com problema. Não há migração de dados a reverter.
