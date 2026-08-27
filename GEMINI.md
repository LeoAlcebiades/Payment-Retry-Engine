# Contexto do Projeto: Payment Retry Engine

## Stack Tecnológica
- NestJS (TypeScript, Node.js)
- BullMQ + Redis (Fila e mensageria assíncrona)
- PostgreSQL + TypeORM (Persistência relacional)
- Docker & Docker Compose (Infraestrutura local)

## Regras de Arquitetura e Desenvolvimento
- Seguir estritamente o modo estrito (*strict mode*) do TypeScript.
- Manter o desacoplamento entre produtores e consumidores de filas.
- Tratar transações de pagamento com foco em resiliência e tratamento de erros.
- Verificar se o código do projeto todo segue perfeitamente todos os requisitos de segurança necessários.
- Desenvolver toda e qualquer solução a fim de manter o projeto 100% seguro, usável, estável e escalonável.
