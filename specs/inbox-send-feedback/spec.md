# Feedback imediato ao enviar mensagem manual

## Objetivo

Ao enviar uma mensagem na caixa de entrada, mostrar a tentativa na conversa imediatamente e liberar o campo para o próximo rascunho, enquanto o backend conclui o envio pelo WhatsApp. Não indicar entrega antes da confirmação da API.

## Cenários e critérios de aceitação

1. **POST lento:** ao clicar em Enviar ou pressionar Enter, o texto sai do campo, aparece uma única bolha de saída com “Enviando…” e o campo continua editável. O botão de envio fica bloqueado enquanto a tentativa está em andamento.
2. **Sucesso:** a resposta da API substitui a bolha provisória pela mensagem persistida; nenhuma duplicata aparece. Um rascunho iniciado durante a espera não é apagado. A lista volta a acompanhar o fim da conversa.
3. **Falha definitiva:** a interface não mostra “Enviada”; informa a falha e recupera o texto enviado apenas se o campo estiver vazio. Um rascunho novo permanece intacto.
4. **Resultado incerto:** a interface distingue esse estado de sucesso, oferece consulta da tentativa e repetição com a **mesma chave de idempotência**. Não permite iniciar outro envio manual até a tentativa ser resolvida.
5. **Troca de conversa:** a bolha provisória fica apenas na conversa de origem, e a resposta atualiza o cache dessa conversa.

## Implementação e verificação

- Preservar o endpoint, o corpo e a chave de idempotência atuais. Nenhum envio automático ou retry implícito.
- Usar estado local para a bolha provisória e atualizar o cache de mensagens com a resposta real da API; a atualização periódica não deve duplicar a bolha durante o POST.
- Testes de componente com resposta controlada para espera, sucesso, falha e estado incerto; executar lint, build e suíte existente.
- Sem publicação ou envio de mensagem real nesta mudança. A latência da integração WhatsApp permanece a mesma; a mudança reduz a espera percebida e permite preparar o próximo rascunho.
