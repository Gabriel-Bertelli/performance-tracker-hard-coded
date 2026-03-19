# Performance Tracker com Assistente Analítico

Aplicação React/Vite para exploração de base extensa com:

- executor local para tratamento e agregação de grandes volumes
- fluxo de 2 agentes (Planner + Analyst)
- suporte a Google Gemini, OpenAI e Anthropic Claude
- resposta do Analyst em HTML renderizado no próprio app, no formato de relatório

## Como rodar

1. Instale as dependências:
   `npm install`
2. Configure as chaves em `.env.local` se quiser pré-preenchimento:
   - `VITE_GEMINI_API_KEY`
   - `VITE_OPENAI_API_KEY`
   - `VITE_ANTHROPIC_API_KEY`
3. Execute:
   `npm run dev`

## O que mudou nesta versão

- remoção de corte fixo do contexto analítico
- builder de contexto mais adequado para bases grandes
- Anthropic Claude como opção de motor de IA
- Analyst instruído a responder em HTML
- relatório renderizado diretamente na interface, em vez de apenas markdown de chat

## Observações

- para bases muito grandes, a base inteira deve continuar sendo tratada localmente; o LLM recebe contexto analítico resumido
- o Planner só deve usar `limit` quando a pergunta pedir explicitamente top N, ranking limitado ou equivalente
