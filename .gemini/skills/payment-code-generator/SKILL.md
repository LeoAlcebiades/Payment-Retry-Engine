\---

name: payment-code-generator

description: Gera codigo NestJS e BullMQ para o motor de retentativas de pagamento. Use quando o usuario pedir codigo para producers, workers, entidades ou logica de retry.

\---



\# Payment Code Generator



\## Quando Usar

\- Ao implementar workers de processamento de filas no BullMQ.

\- Ao criar servicos transacionais de pagamentos em NestJS.



\## Diretrizes de Implementacao

1\. Utilize sempre tipagem estrita no TypeScript.

2\. Garanta tratamento de erros com blocos try/catch e registro de logs detalhados para falhas de gateways de pagamento.

3\. Configure politicas de exponential backoff e limite de tentativas em todos os jobs do BullMQ.

