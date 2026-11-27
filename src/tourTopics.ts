import type { Role } from "./types";

export type TourStep = {
  title: string;
  description: string;
  items: Array<[label: string, explanation: string]>;
};

export type TourTopic = {
  id: string;
  title: string;
  path: string;
  access: "all" | "manager" | "owner";
  summary: string;
  steps: TourStep[];
};

export const tourTopics: TourTopic[] = [
  {
    id: "dashboard", title: "Visão geral", path: "/dashboard", access: "all",
    summary: "Acompanhe o atendimento e encontre o próximo trabalho da equipe.",
    steps: [
      { title: "Indicadores", description: "Os cartões resumem o período e ajudam a identificar o que precisa de atenção.", items: [["Conversas abertas", "Atendimentos ainda em andamento."], ["Atendimento humano", "Conversas assumidas pela equipe, com a IA pausada."], ["Mensagens e alertas", "Volume de mensagens e falhas que precisam de revisão."]] },
      { title: "Acesso rápido", description: "Use os atalhos para abrir a tela correspondente sem alterar dados.", items: [["Conversas recentes", "Abre o atendimento do contato escolhido."], ["Pedidos e avisos", "Leva aos pedidos aguardando decisão ou comunicação."], ["Empresa ativa", "Troca o espaço de trabalho quando você participa de mais de uma empresa."]] },
    ],
  },
  {
    id: "inbox", title: "Caixa de entrada", path: "/inbox", access: "all",
    summary: "Leia conversas, responda pelo WhatsApp e acompanhe a IA.",
    steps: [
      { title: "Encontrar uma conversa", description: "A lista à esquerda reúne os atendimentos da empresa ou unidade selecionada.", items: [["Busca", "Procura por nome, telefone ou WhatsApp ID."], ["Filtros", "Limitam por status, IA/pessoa, responsável e número."], ["Ocultar encerradas", "Retira conversas finalizadas da lista sem apagá-las."]] },
      { title: "Enviar e acompanhar", description: "A mensagem aparece na conversa assim que você envia; aguarde a confirmação antes de considerar o envio concluído.", items: [["Escreva uma mensagem", "Digite uma resposta; Enter envia e Shift+Enter cria uma linha."], ["Enviando, pendente e enviada", "Estados diferentes: a Meta ainda pode rejeitar uma tentativa pendente."], ["Templates aprovados", "Consulta mensagens prontas da Meta para casos permitidos; abrir a lista não envia nada."]] },
      { title: "Detalhes e responsabilidade", description: "O painel do contato concentra decisões de atendimento.", items: [["Responsável", "Atribui a conversa a alguém da equipe."], ["Pausar ou reativar IA", "Define se a IA pode responder automaticamente nessa conversa."], ["Encerrar conversa", "Finaliza o atendimento; pode ser reaberto depois."], ["Análise comercial", "Mostra sinais, objeções e sugestão da IA; confira com a conversa antes de agir."]] },
    ],
  },
  {
    id: "contacts", title: "Contatos", path: "/contacts", access: "all",
    summary: "Organize pessoas e abra o histórico de atendimento.",
    steps: [
      { title: "Cadastro e busca", description: "O contato identifica a pessoa atendida pelo WhatsApp.", items: [["Nome", "Nome usado para localizar e identificar o contato."], ["Telefone e WhatsApp ID", "Dados do destinatário; confira antes de iniciar uma conversa."], ["Busca", "Encontra contatos já cadastrados na empresa."]] },
      { title: "Histórico e autorização", description: "As conversas e consentimentos ficam vinculados ao contato.", items: [["Conversas", "Abre os atendimentos anteriores desse contato."], ["Autorização de retorno", "Administradores registram onde a pessoa autorizou o contato automático."], ["Revogar autorização", "Impede novos retornos automáticos quando o consentimento é retirado."]] },
    ],
  },
  {
    id: "orders", title: "Pedidos", path: "/orders", access: "all",
    summary: "Revise solicitações identificadas pela IA antes de confirmar algo ao cliente.",
    steps: [
      { title: "Ler o pedido", description: "A IA prepara uma solicitação; isso ainda não é uma venda nem uma confirmação ao cliente.", items: [["Status", "Aguardando aprovação, aprovado, rejeitado ou cancelado."], ["Itens e prazo", "Confira produto, quantidade, valor e data solicitada na conversa original."], ["Resumo", "Texto da análise que ajuda a equipe a validar o pedido."]] },
      { title: "Decidir e acompanhar", description: "Dono ou administrador registra a decisão humana.", items: [["Aprovar / Rejeitar", "Registra a decisão sobre o pedido pendente."], ["Aviso ao cliente", "Mostra se a comunicação da decisão foi enviada, bloqueada ou falhou."], ["Registrar venda deste pedido", "Após aprovação, abre Vendas para conferir valores e fechar o negócio."]] },
    ],
  },
  {
    id: "numbers", title: "WhatsApp", path: "/numbers", access: "all",
    summary: "Consulte os números conectados e a disponibilidade do atendimento.",
    steps: [
      { title: "Conexão", description: "Cada número pertence à empresa e pode estar associado a uma unidade de negócio.", items: [["Status da conexão", "Indica se o número está pronto para enviar e receber mensagens."], ["Número exibido", "Identifica o canal usado nas conversas."], ["Conectar pela Meta", "Administradores seguem o fluxo oficial de autorização para adicionar um número."]] },
      { title: "Operação", description: "Revise a configuração antes de ativar a IA no canal.", items: [["Ativo", "Define se o número pode ser usado pela operação."], ["IA ativada", "Permite respostas automáticas quando a conversa não está pausada."], ["Unidade de negócio", "Separa atendimento e conhecimento por atividade da empresa."]] },
    ],
  },
  {
    id: "sales", title: "Vendas", path: "/sales", access: "manager",
    summary: "Registre negócios confirmados e acompanhe recebimentos separadamente.",
    steps: [
      { title: "Registrar venda", description: "Uma venda pode ser manual ou vinculada a conversa e pedido aprovado.", items: [["Contato e conversa", "Identificam quem comprou e de onde veio o atendimento."], ["Pedido aprovado", "Vínculo opcional que traz os itens para revisão; aprovação sozinha não cria venda."], ["Responsável e data", "Registram quem conduziu e quando ocorreu o fechamento."]] },
      { title: "Itens e valores", description: "Confira o acordo comercial antes de confirmar.", items: [["Item, tipo e quantidade", "Produto ou serviço vendido e volume negociado."], ["Preço e descontos", "Formam o valor final da venda."], ["Custo e despesas", "Ajudam nas estimativas financeiras; dados ausentes não viram zero automaticamente."]] },
      { title: "Após confirmar", description: "Venda e pagamento são eventos diferentes.", items: [["Recebimento", "Registre valor, data e meio quando o dinheiro entrar."], ["Reembolso", "Vincule ao recebimento original."], ["Origem da venda", "Classifica assistência da IA ou atendimento humano com evidência."]] },
    ],
  },
  {
    id: "catalog", title: "Catálogo", path: "/catalog", access: "manager",
    summary: "Cadastre produtos e serviços usados pela equipe e pela IA.",
    steps: [
      { title: "Organização", description: "Categorias ajudam a localizar os itens da empresa.", items: [["Categoria", "Agrupa produtos e serviços semelhantes."], ["Unidade", "Associa o item à atividade correspondente, quando aplicável."], ["Ativo", "Controla se o item aparece para novas operações."]] },
      { title: "Valores", description: "Use informações atuais para evitar promessas incorretas.", items: [["Preço de venda", "Valor de referência para a equipe."], ["Preço promocional", "Condição alternativa quando cadastrada."], ["Custo", "Usado nas estimativas de resultado, quando informado."]] },
    ],
  },
  {
    id: "finance", title: "Financeiro", path: "/finance", access: "manager",
    summary: "Analise vendas confirmadas, pagamentos e estimativas do período.",
    steps: [
      { title: "Filtros", description: "Mude o recorte sem alterar os lançamentos.", items: [["De / Até", "Selecionam o intervalo de datas."], ["Unidade e responsável", "Limitam os resultados ao negócio ou atendente escolhido."], ["Exportar CSV", "Baixa o agrupamento selecionado para análise externa."]] },
      { title: "Indicadores", description: "O painel diferencia receita registrada de dinheiro recebido.", items: [["Faturamento", "Soma das vendas confirmadas no recorte."], ["Recebido líquido", "Recebimentos menos reembolsos registrados."], ["Resultado estimado", "Depende de custos, taxas, impostos e despesas informados; não substitui contabilidade."]] },
    ],
  },
  {
    id: "knowledge", title: "Conhecimento", path: "/knowledge", access: "manager",
    summary: "Mantenha os documentos que a IA pode consultar ao responder.",
    steps: [
      { title: "Bases e documentos", description: "Separe assuntos e revise a origem das respostas.", items: [["Base de conhecimento", "Agrupa documentos relacionados."], ["Documentos", "Arquivos enviados para processamento e busca."], ["Compartilhamento", "Controla a disponibilidade do documento para unidades autorizadas."]] },
      { title: "Processamento", description: "A IA só pode usar conteúdo após o processamento.", items: [["Estado", "Mostra se o documento está processando, pronto ou falhou."], ["Reprocessar", "Tenta novamente um documento com falha."], ["Atualização", "Substitua conteúdo desatualizado antes de confiar nas respostas."]] },
    ],
  },
  {
    id: "media", title: "Mídias da IA", path: "/media", access: "manager",
    summary: "Organize imagens e outros arquivos usados no atendimento.",
    steps: [
      { title: "Biblioteca", description: "Cada mídia fica na empresa e pode ser separada por categoria.", items: [["Categoria", "Ajuda a encontrar o arquivo correto."], ["Nome e descrição", "Explicam quando a mídia deve ser usada."], ["Upload e prévia", "Permitem cadastrar e conferir o arquivo antes do uso."]] },
      { title: "Manutenção", description: "Revise a disponibilidade dos arquivos para a equipe.", items: [["Estado", "Indica processamento ou falha."], ["Excluir", "Retira um arquivo que não deve mais ser usado; confira antes de confirmar."]] },
    ],
  },
  {
    id: "team", title: "Equipe", path: "/team", access: "manager",
    summary: "Defina quem atende e quem administra cada empresa.",
    steps: [
      { title: "Adicionar pessoa", description: "O administrador cria acesso e escolhe as empresas da pessoa.", items: [["Usuário e senha inicial", "Credenciais para o primeiro acesso; a troca de senha é exigida."], ["Papel", "Atendente opera conversas; administrador também gerencia configurações."], ["Negócios com acesso", "Limita a quais empresas o membro pode entrar."]] },
      { title: "Revisar acessos", description: "A tabela mostra permissões atuais.", items: [["Modificar papel", "Altera as permissões do membro na empresa."], ["Remover acesso", "Desvincula a pessoa desta empresa após confirmação."]] },
    ],
  },
  {
    id: "settings", title: "Configurações", path: "/settings", access: "manager",
    summary: "Ajuste empresa, unidades, IA e integrações sem expor credenciais.",
    steps: [
      { title: "Empresa e unidades", description: "A unidade separa atendimento, números e conhecimento por atividade.", items: [["Unidade padrão", "Atividade usada quando nenhuma outra é escolhida."], ["Instruções da unidade", "Complementam ou substituem as instruções gerais da IA."], ["Perfil comercial", "Abre as configurações de preços, custos e regras comerciais."]] },
      { title: "IA e automação", description: "Teste mudanças antes de usá-las no atendimento.", items: [["Instruções de atendimento", "Definem tom, objetivos e limites da IA para esta empresa."], ["Pergunta de teste", "Gera uma prévia sem enviar mensagem pelo WhatsApp."], ["Follow-up automático", "Exige consentimento do contato e respeita limites de horário e frequência."]] },
      { title: "Integrações e consumo", description: "Indicadores ajudam a verificar disponibilidade e uso.", items: [["WhatsApp e Gemini", "Mostram se as integrações estão configuradas, sem revelar tokens."], ["Uso da IA", "Exibe chamadas, tokens e custo estimado no período."], ["Webhook da Meta", "URL pública para receber eventos; token e segredo ficam no servidor."]] },
    ],
  },
  {
    id: "commercial-settings", title: "Configurações comerciais", path: "/commercial-settings", access: "manager",
    summary: "Ajuste parâmetros usados nas estimativas de venda e resultado.",
    steps: [
      { title: "Custos e condições", description: "Esses parâmetros apoiam relatórios; não fazem lançamentos automaticamente.", items: [["Imposto estimado", "Percentual considerado nos cálculos quando aplicável."], ["Margem desejada", "Referência para análise comercial."], ["Meios de pagamento", "Opções usadas ao registrar recebimentos."]] },
    ],
  },
  {
    id: "subscriptions", title: "Assinaturas", path: "/billing/subscriptions", access: "owner",
    summary: "Consulte recorrências e o período pago de cada assinatura.",
    steps: [
      { title: "Cobrança", description: "Apenas o proprietário pode administrar suas assinaturas.", items: [["Estado", "Mostra se a assinatura está ativa ou com renovação encerrada."], ["Acesso pago até", "Data informada pelo provedor para o fim do período pago."], ["Encerrar renovação", "Exige confirmação; não apaga vendas ou atendimentos da empresa."]] },
    ],
  },
  {
    id: "new-company", title: "Adicionar empresa", path: "/companies/new", access: "owner",
    summary: "Crie outro espaço com dados e atendimento separados.",
    steps: [
      { title: "Novo espaço", description: "A contratação só começa após você confirmar os dados e seguir para o pagamento.", items: [["Nome da empresa", "Identifica o novo espaço de trabalho."], ["Dados de cobrança", "Informações exigidas pelo provedor quando ainda não estão cadastradas."], ["Vagas de WhatsApp", "Capacidade adicional pode ser contratada separadamente."]] },
    ],
  },
];

export function visibleTourTopics(role: Role): TourTopic[] {
  return tourTopics.filter((topic) => topic.access === "all"
    || (topic.access === "manager" && ["owner", "admin"].includes(role))
    || (topic.access === "owner" && role === "owner"));
}
