# Copa Smart

Aplicativo web responsivo para controle de pedidos de lanches e bebidas em ambiente hospitalar/clínico.

## Funcionalidades implementadas

- **Tela do Paciente**
  - Cardápio por categorias (Lanchinhos, Sucos, Cafés/Chás e Outros).
  - Seleção de item e customização (Açúcar, Adoçante, Puro, Outros) quando aplicável.
  - Campo de observação.
  - Confirmação de pedido.
  - Visualização de status (`Em preparo`, `Em entrega`, `Finalizado`).

- **Tela da Copa**
  - Recebimento de pedidos com notificação visual e sonora.
  - Exibição de nome do paciente, quarto/leito, itens e observações.
  - Ações de fluxo: `Pedido pronto` e `Finalizar entrega`.
  - Filtro por turno.
  - Histórico de pedidos do dia.

- **Tela Administrativa**
  - Gestão de cardápio (categorias/produtos, ativar/desativar/excluir).
  - Controle de estoque com baixa automática no pedido.
  - Alertas de estoque mínimo.
  - Gestão de usuários com perfis e turno.
  - Relatórios por período, itens consumidos, consumo por paciente e por turno.
  - Exportação em formato texto/CSV (simulando PDF/Excel).

## Stack atual

- HTML + CSS + JavaScript (vanilla)
- Identidade visual com logo Ser Infusão e paleta hospitalar em tons de azul
- Persistência local via `localStorage`

> O código está estruturado para permitir migração futura para Firebase Auth + Firestore.

## Estrutura de dados (base local)

```js
{
  users: [{ id, username, password, role, shift }],
  categories: ["Lanchinhos", "Sucos", ...],
  products: [{ id, name, category, customizable, active, stock, minStock }],
  stockInputs: [{ id, productId, change, reason, at }],
  orders: [{
    id, patientName, room, items, customization, note,
    status, shift, createdAt, updatedAt
  }]
}
```

## Executar localmente

```bash
python -m http.server 4173
```

Acesse `http://localhost:4173`.
