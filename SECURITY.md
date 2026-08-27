# Política de Segurança e Arquitetura - Payment Retry Engine

Este documento estabelece o modelo de ameaças, o perímetro defensivo e as diretrizes estritas de desenvolvimento para o motor de retentativa de pagamentos. Sendo um componente de infraestrutura financeira, este sistema opera sob os mais altos padrões de conformidade da indústria, incluindo **PCI-DSS** e **OWASP ASVS (Nível 2/3)**.

## 1. Perfil Arquitetural e Escopo
- **Natureza do Sistema:** *Background Worker* de alta confiabilidade e microsserviço de retaguarda.
- **Exposição de Rede:** Comunicação estritamente *server-to-server* com adquirentes e gateways de pagamento (ex: Stripe, Adyen). 
- **Restrição de Interface:** O sistema **NÃO** possui interface de usuário (*frontend*), não renderiza HTML e não interage diretamente com navegadores web de usuários finais.

## 2. Dependências e Controles Permitidos
- **Idempotência Obrigatória:** Toda transação de retentativa deve ser acoplada a chaves de idempotência atreladas ao banco de dados para evitar cobranças duplicadas em falhas de rede.
- **Tratamento de Erros Global:** Obrigatório o uso de *Global Exception Filters* para interceptar qualquer exceção e garantir que respostas de erro sejam estritamente estruturadas em `application/json`, impedindo o vazamento de *stack traces* ou strings HTML.
- **Rate Limiting Dinâmico:** Implementação de limitação de taxa baseada em contexto (heurísticas para mitigar ataques de *carding* e evitar *Self-Inflicted DoS* contra adquirentes).
- **Trilha de Auditoria Imutável:** Logs estruturados de todas as tentativas de transação, falhas e alterações de estado, mascarando dados sensíveis de cartões (PAN).

## 3. Dependências e Práticas PROIBIDAS (Anti-Patterns)
- **PROIBIDO O USO DE HELMET:** Como a aplicação não interage com navegadores, bibliotecas de injeção de cabeçalhos orientadas ao *client-side* (como Helmet) são estritamente vedadas por gerarem complexidade ociosa e poluição da árvore de dependências (*supply chain*).
- **Proibido Armazenamento de PAN:** O número completo do cartão de crédito (PAN) ou códigos CVV jamais devem ser salvos em logs, em memória de longa duração ou no banco de dados da aplicação. O sistema deve operar exclusivamente com *Tokens* fornecidos pelo gateway homologado.
- **Proibido Tratamento Silencioso de Falhas:** Falhas de comunicação com adquirentes durante o *backoff* exponencial nunca devem ser suprimidas sem registro de métrica e auditoria forense.