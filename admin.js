(() => {
  const url = window.HF_SUPABASE_URL || "";
  const key = window.HF_SUPABASE_ANON_KEY || "";
  const setupNotice = document.getElementById("setupNotice");
  const loginPanel = document.getElementById("loginPanel");
  const dashboard = document.getElementById("dashboard");
  const logoutBtn = document.getElementById("logoutBtn");
  if (!url || !key || !window.supabase) {
    setupNotice.classList.remove("hidden");
    loginPanel.classList.add("hidden");
    return;
  }
  const db = window.supabase.createClient(url, key);
  const money = n => "Rs. " + Number(n || 0).toLocaleString("en-PK");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let products = [];
  async function requireAdmin() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) { loginPanel.classList.remove("hidden"); dashboard.classList.add("hidden"); logoutBtn.classList.add("hidden"); return false; }
    const role = session.user.app_metadata?.role;
    if (role !== "admin") { await db.auth.signOut(); document.getElementById("loginError").textContent = "This account does not have store administrator access."; return false; }
    loginPanel.classList.add("hidden"); dashboard.classList.remove("hidden"); logoutBtn.classList.remove("hidden");
    await loadDashboard(); return true;
  }
  async function loadDashboard() {
    const [ordersRes, productsRes] = await Promise.all([
      db.from("orders").select("id,order_number,customer_name,customer_phone,total_pkr,status,created_at").order("created_at",{ascending:false}).limit(30),
      db.from("products").select("*").order("id")
    ]);
    if (ordersRes.error || productsRes.error) { alert((ordersRes.error || productsRes.error).message); return; }
    products = productsRes.data || [];
    const orders = ordersRes.data || [];
    document.getElementById("statOrders").textContent = orders.length;
    document.getElementById("statPending").textContent = orders.filter(o => o.status === "pending").length;
    document.getElementById("statProducts").textContent = products.length;
    document.getElementById("statLowStock").textContent = products.filter(p => p.stock_quantity <= 5).length;
    document.getElementById("ordersBody").innerHTML = orders.map(o => '<tr><td><b>'+esc(o.order_number)+'</b></td><td>'+esc(o.customer_name)+'<br><small>'+esc(o.customer_phone)+'</small></td><td>'+money(o.total_pkr)+'</td><td><select data-order-status="'+o.id+'">'+["pending","confirmed","processing","shipped","delivered","cancelled"].map(s=>'<option '+(o.status===s?'selected':'')+'>'+s+'</option>').join("")+'</select></td><td>'+new Date(o.created_at).toLocaleString()+'</td></tr>').join("") || '<tr><td colspan="5">No orders yet.</td></tr>';
    document.getElementById("productsBody").innerHTML = products.map(p => '<tr><td><b>'+esc(p.name)+'</b><br><small>'+esc(p.category)+'</small></td><td>'+money(p.price_pkr)+'</td><td class="'+(p.stock_quantity<=5?'stock-low':'')+'">'+p.stock_quantity+'</td><td>'+(p.is_active?'Yes':'No')+'</td><td><button class="table-action" data-edit-product="'+p.id+'">Edit</button></td></tr>').join("") || '<tr><td colspan="5">No products found.</td></tr>';
  }
  function openProduct(p) {
    document.getElementById("productDialogTitle").textContent = p ? "Edit product" : "Add product";
    document.getElementById("productId").value = p?.id || "";
    document.getElementById("productName").value = p?.name || "";
    document.getElementById("productBrand").value = p?.brand || "Hamza Fragrance";
    document.getElementById("productCategory").value = p?.category || "Men";
    document.getElementById("productPrice").value = p?.price_pkr ?? "";
    document.getElementById("productCompare").value = p?.compare_at_price_pkr ?? "";
    document.getElementById("productStock").value = p?.stock_quantity ?? 0;
    document.getElementById("productTag").value = p?.tag || "";
    document.getElementById("productNotes").value = p?.fragrance_notes || "";
    document.getElementById("productDescription").value = p?.description || "";
    document.getElementById("productImage").value = p?.image_url || "";
    document.getElementById("productActive").checked = p?.is_active ?? true;
    document.getElementById("productError").textContent = "";
    document.getElementById("productDialog").showModal();
  }
  document.getElementById("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const { error } = await db.auth.signInWithPassword({email:document.getElementById("adminEmail").value,password:document.getElementById("adminPassword").value});
    document.getElementById("loginError").textContent = error?.message || "";
    if (!error) await requireAdmin();
  });
  document.getElementById("logoutBtn").addEventListener("click", async () => { await db.auth.signOut(); await requireAdmin(); });
  document.getElementById("refreshBtn").addEventListener("click", loadDashboard);
  document.getElementById("addProductBtn").addEventListener("click", () => openProduct(null));
  document.getElementById("closeProductDialog").addEventListener("click", () => document.getElementById("productDialog").close());
  document.getElementById("productForm").addEventListener("submit", async e => {
    e.preventDefault();
    const id = document.getElementById("productId").value;
    const row = {
      name:document.getElementById("productName").value.trim(), brand:document.getElementById("productBrand").value.trim(),
      category:document.getElementById("productCategory").value, price_pkr:Number(document.getElementById("productPrice").value),
      compare_at_price_pkr:document.getElementById("productCompare").value ? Number(document.getElementById("productCompare").value) : null,
      stock_quantity:Number(document.getElementById("productStock").value), tag:document.getElementById("productTag").value.trim() || null,
      fragrance_notes:document.getElementById("productNotes").value.trim(), description:document.getElementById("productDescription").value.trim(),
      image_url:document.getElementById("productImage").value.trim(), is_active:document.getElementById("productActive").checked
    };
    const { error } = id ? await db.from("products").update(row).eq("id",id) : await db.from("products").insert(row);
    if (error) { document.getElementById("productError").textContent = error.message; return; }
    document.getElementById("productDialog").close(); await loadDashboard();
  });
  document.getElementById("productsBody").addEventListener("click", e => {
    const b=e.target.closest("[data-edit-product]"); if(b) openProduct(products.find(p=>String(p.id)===b.dataset.editProduct));
  });
  document.getElementById("ordersBody").addEventListener("change", async e => {
    const id=e.target.dataset.orderStatus; if(!id) return;
    const { error } = await db.from("orders").update({status:e.target.value,updated_at:new Date().toISOString()}).eq("id",id);
    if(error) { alert(error.message); await loadDashboard(); }
  });
  db.auth.onAuthStateChange(() => { requireAdmin(); });
  requireAdmin();
})();
