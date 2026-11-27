# Instruções do projeto Gest Tech

- Este repositório contém o frontend React. O backend Django está em `../llm-wpp`; preserve o trabalho local de ambos os projetos.
- Em 27/11/2026, o usuário concedeu autorização recorrente para publicar correções e atualizações do Gest Tech nas stacks `front-saas` e `saas` do Raspberry Pi quando solicitar esse trabalho. Não peça nova autorização para o deploy dessas stacks após preparar e validar uma mudança concreta. Essa autorização pode ser revogada pelo usuário.
- Antes de publicar, confira a saúde do PostgreSQL/Neon, o estado das migrations, os testes pertinentes, os digests atuais e o caminho de recuperação. Não faça deploy se esses requisitos não puderem ser verificados ou se o ambiente estiver indisponível.
- A autorização recorrente não abrange troca de plano ou criação de recursos pagos, alterações de credenciais, migrações destrutivas, restauração de backup, alteração de DNS, outros serviços ou ambientes. Essas ações exigem autorização específica.
- Não divulgue segredos, strings de conexão, tokens nem conteúdo de sessões nos logs ou nas respostas.
