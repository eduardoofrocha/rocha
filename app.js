/**
 * Copa Smart
 * App front-end em JS puro com persistência local.
 * Estrutura preparada para migração para Firebase/Auth + Firestore.
 */

const STORAGE_KEY = "copa-smart-db";
const LOW_STOCK_THRESHOLD_DEFAULT = 3;

const defaultData = {
  users: [
    { id: crypto.randomUUID(), username: "ana.paciente", password: "123456", role: "patient", shift: "manhã" },
    { id: crypto.randomUUID(), username: "copa.maria", password: "123456", role: "copa", shift: "tarde" },
    { id: crypto.randomUUID(), username: "admin.joao", password: "123456", role: "admin", shift: "manhã" },
    { id: crypto.randomUUID(), username: "atendimento.lu", password: "123456", role: "atendimento", shift: "noite" }
  ],
  categories: ["Lanchinhos", "Sucos", "Cafés/Chás", "Outros"],
  products: [
    { id: crypto.randomUUID(), name: "Misto Quente", category: "Lanchinhos", customizable: false, active: true, stock: 12, minStock: 2 },
    { id: crypto.randomUUID(), name: "Pão de Queijo", category: "Lanchinhos", customizable: false, active: true, stock: 20, minStock: 5 },
    { id: crypto.randomUUID(), name: "Bolo", category: "Lanchinhos", customizable: false, active: true, stock: 8, minStock: 3 },
    { id: crypto.randomUUID(), name: "Bolacha água e sal", category: "Lanchinhos", customizable: false, active: true, stock: 15, minStock: 4 },
    { id: crypto.randomUUID(), name: "Sequilho", category: "Lanchinhos", customizable: false, active: true, stock: 14, minStock: 4 },
    { id: crypto.randomUUID(), name: "Caju", category: "Sucos", customizable: true, active: true, stock: 9, minStock: 3 },
    { id: crypto.randomUUID(), name: "Manga", category: "Sucos", customizable: true, active: true, stock: 9, minStock: 3 },
    { id: crypto.randomUUID(), name: "Goiaba", category: "Sucos", customizable: true, active: true, stock: 9, minStock: 3 },
    { id: crypto.randomUUID(), name: "Pêssego", category: "Sucos", customizable: true, active: true, stock: 9, minStock: 3 },
    { id: crypto.randomUUID(), name: "Maracujá", category: "Sucos", customizable: true, active: true, stock: 9, minStock: 3 },
    { id: crypto.randomUUID(), name: "Café", category: "Cafés/Chás", customizable: true, active: true, stock: 25, minStock: 6 },
    { id: crypto.randomUUID(), name: "Café com Leite", category: "Cafés/Chás", customizable: true, active: true, stock: 18, minStock: 5 },
    { id: crypto.randomUUID(), name: "Chá Mate", category: "Cafés/Chás", customizable: true, active: true, stock: 16, minStock: 4 },
    { id: crypto.randomUUID(), name: "Leite com Toddy", category: "Outros", customizable: false, active: true, stock: 10, minStock: 3 },
    { id: crypto.randomUUID(), name: "Cappuccino", category: "Outros", customizable: true, active: true, stock: 11, minStock: 3 }
  ],
  stockInputs: [],
  orders: []
};

const CUSTOMIZATIONS = ["Açúcar", "Adoçante", "Puro", "Outros"];
const SHIFTS = ["todos", "manhã", "tarde", "noite"];
const STATUS_FLOW = ["Em preparo", "Em entrega", "Finalizado"];

let db = loadDb();
let currentUser = null;
let alertMuted = false;
let knownOrderCount = db.orders.length;

const refs = {
  authScreen: document.getElementById("authScreen"),
  patientScreen: document.getElementById("patientScreen"),
  copaScreen: document.getElementById("copaScreen"),
  adminScreen: document.getElementById("adminScreen"),
  loginForm: document.getElementById("loginForm"),
  logoutBtn: document.getElementById("logoutBtn"),
  currentUserBadge: document.getElementById("currentUserBadge"),
  menuContainer: document.getElementById("menuContainer"),
  productSelect: document.getElementById("productSelect"),
  customizationField: document.getElementById("customizationField"),
  customizationSelect: document.getElementById("customizationSelect"),
  patientOrderForm: document.getElementById("patientOrderForm"),
  patientOrders: document.getElementById("patientOrders"),
  shiftFilter: document.getElementById("shiftFilter"),
  copaOrders: document.getElementById("copaOrders"),
  dailyHistory: document.getElementById("dailyHistory"),
  clearAlertsBtn: document.getElementById("clearAlertsBtn"),
  categoryForm: document.getElementById("categoryForm"),
  newCategory: document.getElementById("newCategory"),
  productForm: document.getElementById("productForm"),
  newProductCategory: document.getElementById("newProductCategory"),
  adminMenuTable: document.getElementById("adminMenuTable"),
  stockTable: document.getElementById("stockTable"),
  userForm: document.getElementById("userForm"),
  usersTable: document.getElementById("usersTable"),
  reportsView: document.getElementById("reportsView"),
  reportStart: document.getElementById("reportStart"),
  reportEnd: document.getElementById("reportEnd"),
  refreshReports: document.getElementById("refreshReports"),
  exportPdf: document.getElementById("exportPdf"),
  exportExcel: document.getElementById("exportExcel"),
  toast: document.getElementById("toast"),
  sound: document.getElementById("notificationSound")
};

initialize();

function initialize() {
  renderShiftFilter();
  renderTabs();
  bindEvents();
  renderAll();
  setInterval(simulateRealtimeRefresh, 2500);
}

function bindEvents() {
  refs.loginForm.addEventListener("submit", handleLogin);
  refs.logoutBtn.addEventListener("click", logout);
  refs.patientOrderForm.addEventListener("submit", createOrder);
  refs.productSelect.addEventListener("change", onSelectProduct);
  refs.clearAlertsBtn.addEventListener("click", () => {
    alertMuted = true;
    showToast("Alertas sonoros silenciados temporariamente.");
  });

  refs.categoryForm.addEventListener("submit", createCategory);
  refs.productForm.addEventListener("submit", createProduct);
  refs.userForm.addEventListener("submit", createUser);
  refs.refreshReports.addEventListener("click", renderReports);
  refs.exportPdf.addEventListener("click", () => exportReport("pdf"));
  refs.exportExcel.addEventListener("click", () => exportReport("excel"));
}

function loadDb() {
  const fromStorage = localStorage.getItem(STORAGE_KEY);
  if (fromStorage) return JSON.parse(fromStorage);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
  return JSON.parse(JSON.stringify(defaultData));
}

function persistDb() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function roleLabel(role) {
  return ({ patient: "Paciente", copa: "Copa", admin: "Administrador", atendimento: "Atendimento" }[role] || role);
}

function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const user = db.users.find((u) => u.username === username && u.password === password);

  if (!user) {
    showToast("Usuário ou senha inválidos.");
    return;
  }

  currentUser = user;
  refs.currentUserBadge.textContent = `${roleLabel(user.role)} • turno ${user.shift}`;
  refs.logoutBtn.classList.remove("hidden");
  refs.authScreen.classList.add("hidden");
  showToast(`Bem-vindo(a), ${user.username}!`);
  renderAll();
}

function logout() {
  currentUser = null;
  refs.currentUserBadge.textContent = "Modo Visitante";
  refs.authScreen.classList.remove("hidden");
  refs.logoutBtn.classList.add("hidden");
  renderAll();
}

function renderAll() {
  [refs.patientScreen, refs.copaScreen, refs.adminScreen].forEach((el) => el.classList.add("hidden"));

  renderMenu();
  renderProductSelect();
  renderPatientOrders();
  renderCopaOrders();
  renderDailyHistory();
  renderAdminCategoryOptions();
  renderAdminMenuTable();
  renderStockTable();
  renderUsersTable();
  renderReports();
  notifyLowStock();

  if (!currentUser) return;
  if (["patient", "atendimento"].includes(currentUser.role)) refs.patientScreen.classList.remove("hidden");
  if (["copa", "admin"].includes(currentUser.role)) refs.copaScreen.classList.remove("hidden");
  if (currentUser.role === "admin") refs.adminScreen.classList.remove("hidden");
}

function renderMenu() {
  const activeProducts = db.products.filter((p) => p.active);
  const grouped = db.categories.map((cat) => ({
    category: cat,
    items: activeProducts.filter((p) => p.category === cat)
  }));

  refs.menuContainer.innerHTML = grouped
    .map(
      (group) => `
      <div class="menu-category">
        <strong>${group.category}</strong>
        <ul>${group.items.map((item) => `<li>${item.name}</li>`).join("") || "<li>Sem itens</li>"}</ul>
      </div>`
    )
    .join("");
}

function renderProductSelect() {
  const options = db.products
    .filter((p) => p.active)
    .map((p) => `<option value="${p.id}">${p.name} (${p.stock} em estoque)</option>`)
    .join("");
  refs.productSelect.innerHTML = options;
  refs.customizationSelect.innerHTML = CUSTOMIZATIONS.map((c) => `<option>${c}</option>`).join("");
  onSelectProduct();
}

function onSelectProduct() {
  const selected = db.products.find((p) => p.id === refs.productSelect.value);
  if (!selected) return;
  refs.customizationField.classList.toggle("hidden", !selected.customizable);
}

function detectShift(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "manhã";
  if (hour < 18) return "tarde";
  return "noite";
}

function createOrder(event) {
  event.preventDefault();
  const product = db.products.find((p) => p.id === refs.productSelect.value);
  if (!product) return;
  if (product.stock <= 0) {
    showToast("Produto indisponível em estoque.");
    return;
  }

  product.stock -= 1;
  db.stockInputs.push({
    id: crypto.randomUUID(),
    productId: product.id,
    change: -1,
    reason: "Baixa automática por pedido",
    at: new Date().toISOString()
  });

  db.orders.unshift({
    id: crypto.randomUUID(),
    patientName: document.getElementById("patientName").value.trim(),
    room: document.getElementById("patientRoom").value.trim(),
    items: [product.name],
    customization: product.customizable ? refs.customizationSelect.value : "-",
    note: document.getElementById("orderNote").value.trim() || "Sem observações",
    status: "Em preparo",
    shift: detectShift(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  persistDb();
  refs.patientOrderForm.reset();
  renderAll();
  showToast("Pedido confirmado e enviado para a copa!");
  playNotification();
}

function renderPatientOrders() {
  const orders = currentUser?.role === "patient"
    ? db.orders.filter((o) => o.patientName.toLowerCase().includes("ana") || o.patientName.toLowerCase().includes(currentUser.username.split(".")[0]))
    : db.orders;

  refs.patientOrders.innerHTML = renderTable(
    ["Paciente", "Quarto", "Itens", "Customização", "Observação", "Status"],
    orders.slice(0, 10).map((order) => [
      order.patientName,
      order.room,
      order.items.join(", "),
      order.customization,
      order.note,
      statusChip(order.status)
    ])
  );
}

function renderShiftFilter() {
  refs.shiftFilter.innerHTML = SHIFTS.map((s) => `<option value="${s}">${s}</option>`).join("");
  refs.shiftFilter.addEventListener("change", renderCopaOrders);
}

function renderCopaOrders() {
  const selectedShift = refs.shiftFilter.value;
  const activeOrders = db.orders.filter((order) => order.status !== "Finalizado");
  const filtered = selectedShift === "todos" ? activeOrders : activeOrders.filter((o) => o.shift === selectedShift);

  refs.copaOrders.innerHTML = renderTable(
    ["Paciente", "Leito", "Itens", "Obs.", "Status", "Ações"],
    filtered.map((order) => [
      order.patientName,
      order.room,
      order.items.join(", "),
      order.note,
      statusChip(order.status),
      `<button data-order="${order.id}" data-action="next">${nextActionLabel(order.status)}</button>`
    ])
  );

  refs.copaOrders.querySelectorAll("button[data-order]").forEach((btn) => {
    btn.addEventListener("click", () => advanceOrder(btn.dataset.order));
  });
}

function renderDailyHistory() {
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.orders
    .filter((o) => o.createdAt.slice(0, 10) === today)
    .map((o) => [o.patientName, o.items.join(", "), o.shift, o.status, new Date(o.createdAt).toLocaleTimeString("pt-BR")]);

  refs.dailyHistory.innerHTML = renderTable(["Paciente", "Itens", "Turno", "Status", "Hora"], rows);
}

function advanceOrder(orderId) {
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return;
  const idx = STATUS_FLOW.indexOf(order.status);
  order.status = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
  order.updatedAt = new Date().toISOString();
  persistDb();
  renderAll();
}

function nextActionLabel(status) {
  if (status === "Em preparo") return "Pedido pronto";
  if (status === "Em entrega") return "Finalizar entrega";
  return "Finalizado";
}

function renderTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".admin-tab").forEach((panel) => panel.classList.add("hidden"));
      tab.classList.add("active");
      document.getElementById(`tab-${tab.dataset.tab}`).classList.remove("hidden");
    });
  });
}

function createCategory(event) {
  event.preventDefault();
  const name = refs.newCategory.value.trim();
  if (!name || db.categories.includes(name)) return;
  db.categories.push(name);
  persistDb();
  refs.categoryForm.reset();
  renderAll();
}

function renderAdminCategoryOptions() {
  refs.newProductCategory.innerHTML = db.categories.map((c) => `<option>${c}</option>`).join("");
}

function createProduct(event) {
  event.preventDefault();
  const name = document.getElementById("newProductName").value.trim();
  const category = refs.newProductCategory.value;
  const stock = Number(document.getElementById("newProductStock").value);
  const minStock = Number(document.getElementById("newProductMinStock").value || LOW_STOCK_THRESHOLD_DEFAULT);
  const customizable = document.getElementById("newProductCustomizable").checked;

  db.products.push({
    id: crypto.randomUUID(),
    name,
    category,
    customizable,
    active: true,
    stock,
    minStock
  });

  persistDb();
  refs.productForm.reset();
  renderAll();
}

function renderAdminMenuTable() {
  refs.adminMenuTable.innerHTML = renderTable(
    ["Produto", "Categoria", "Customização", "Ativo", "Ações"],
    db.products.map((product) => [
      product.name,
      product.category,
      product.customizable ? "Sim" : "Não",
      product.active ? "Ativo" : "Inativo",
      `<button data-product="${product.id}" data-action="toggle" class="secondary">${product.active ? "Desativar" : "Ativar"}</button>
       <button data-product="${product.id}" data-action="remove" class="danger">Excluir</button>`
    ])
  );

  refs.adminMenuTable.querySelectorAll("button[data-product]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { product: id, action } = btn.dataset;
      if (action === "toggle") toggleProduct(id);
      if (action === "remove") removeProduct(id);
    });
  });
}

function toggleProduct(id) {
  const product = db.products.find((p) => p.id === id);
  if (!product) return;
  product.active = !product.active;
  persistDb();
  renderAll();
}

function removeProduct(id) {
  db.products = db.products.filter((p) => p.id !== id);
  persistDb();
  renderAll();
}

function renderStockTable() {
  refs.stockTable.innerHTML = renderTable(
    ["Produto", "Saldo", "Mínimo", "Status"],
    db.products.map((p) => [
      p.name,
      p.stock,
      p.minStock,
      p.stock <= p.minStock ? "⚠️ Baixo" : "OK"
    ])
  );
}

function notifyLowStock() {
  const low = db.products.filter((p) => p.stock <= p.minStock);
  if (low.length) showToast(`Alerta de estoque baixo: ${low.map((p) => p.name).join(", ")}`);
}

function createUser(event) {
  event.preventDefault();
  const username = document.getElementById("newUsername").value.trim();
  if (db.users.some((u) => u.username === username)) {
    showToast("Usuário já existe.");
    return;
  }

  db.users.push({
    id: crypto.randomUUID(),
    username,
    password: document.getElementById("newUserPassword").value,
    role: document.getElementById("newUserRole").value,
    shift: document.getElementById("newUserShift").value
  });

  persistDb();
  refs.userForm.reset();
  renderAll();
}

function renderUsersTable() {
  refs.usersTable.innerHTML = renderTable(
    ["Usuário", "Perfil", "Turno"],
    db.users.map((u) => [u.username, roleLabel(u.role), u.shift])
  );
}

function renderReports() {
  const [start, end] = [refs.reportStart.value, refs.reportEnd.value];
  const filtered = db.orders.filter((o) => {
    const day = o.createdAt.slice(0, 10);
    if (start && day < start) return false;
    if (end && day > end) return false;
    return true;
  });

  const byItem = Object.create(null);
  const byPatient = Object.create(null);
  const byShift = Object.create(null);

  filtered.forEach((order) => {
    order.items.forEach((item) => (byItem[item] = (byItem[item] || 0) + 1));
    byPatient[order.patientName] = (byPatient[order.patientName] || 0) + 1;
    byShift[order.shift] = (byShift[order.shift] || 0) + 1;
  });

  refs.reportsView.innerHTML = `
    <p><strong>Pedidos no período:</strong> ${filtered.length}</p>
    <h4>Itens mais consumidos</h4>
    ${renderTable(["Item", "Qtd"], Object.entries(byItem).sort((a, b) => b[1] - a[1]))}
    <h4>Consumo por paciente</h4>
    ${renderTable(["Paciente", "Qtd"], Object.entries(byPatient).sort((a, b) => b[1] - a[1]))}
    <h4>Relatório por turno</h4>
    ${renderTable(["Turno", "Qtd"], Object.entries(byShift).sort((a, b) => b[1] - a[1]))}
  `;

  const lateOrders = db.orders.filter((o) => o.status !== "Finalizado" && Date.now() - new Date(o.createdAt).getTime() > 1000 * 60 * 30);
  if (lateOrders.length) showToast(`Aviso: ${lateOrders.length} pedido(s) atrasado(s).`);
}

function exportReport(type) {
  const rows = [
    ["Paciente", "Leito", "Itens", "Status", "Turno", "Criado em"],
    ...db.orders.map((o) => [o.patientName, o.room, o.items.join(";"), o.status, o.shift, o.createdAt])
  ];
  const content = rows.map((line) => line.join(type === "excel" ? ";" : " | ")).join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `relatorio-copa-smart.${type === "excel" ? "csv" : "txt"}`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function renderTable(headers, rows) {
  return `
    <table>
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.length ? rows.map((row) => `<tr>${row.map((col) => `<td>${col}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${headers.length}">Sem dados</td></tr>`}
      </tbody>
    </table>
  `;
}

function statusChip(status) {
  return `<span class="status ${status.toLowerCase().replace(" ", "-")}">${status}</span>`;
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => refs.toast.classList.add("hidden"), 3600);
}

function playNotification() {
  if (alertMuted) return;
  refs.sound.currentTime = 0;
  refs.sound.play().catch(() => null);
}

function simulateRealtimeRefresh() {
  if (db.orders.length > knownOrderCount) {
    knownOrderCount = db.orders.length;
    playNotification();
  }
  renderCopaOrders();
}
