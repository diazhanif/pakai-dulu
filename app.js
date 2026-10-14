(() => {
  'use strict';

  const L = window.PakaiDuluLogic;
  const STORAGE_KEY = 'pakai-dulu.inventory.v1';
  const $ = (selector) => document.querySelector(selector);
  const form = $('#item-form');
  const nameInput = $('#item-name');
  const categoryInput = $('#item-category');
  const expiryInput = $('#item-date');
  const quantityInput = $('#item-quantity');
  const unitInput = $('#item-unit');
  const list = $('#items-list');
  const emptyState = $('#empty-state');
  const noResults = $('#no-results');
  const formMessage = $('#form-message');
  const searchInput = $('#search');
  const toast = $('#toast');
  const numberFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
  const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  let items = loadItems();
  let activeFilter = 'active';
  let toastTimer;

  function loadItems() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(L.isValidItem) : [];
    } catch {
      return [];
    }
  }

  function saveItems() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch {
      return false;
    }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2800);
  }

  function formatDate(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return dateFormat.format(new Date(year, month - 1, day, 12));
  }

  function statusLabel(item, todayKey) {
    if (item.consumed) return 'Sudah dipakai';
    const days = L.daysUntil(item.expiry, todayKey);
    if (days < 0) return `Lewat ${Math.abs(days)} hari`;
    if (days === 0) return 'Gunakan hari ini';
    if (days === 1) return 'Besok';
    if (days <= 3) return `${days} hari lagi`;
    return `Tanggal ${formatDate(item.expiry)}`;
  }

  function itemIcon(category) {
    const icons = { 'Sayur & buah': '✿', 'Daging & ikan': '≈', 'Susu & olahan': '◒', 'Roti & kue': '◡', 'Bahan kering': '▤', 'Bumbu': '✦', 'Lainnya': '•' };
    return icons[category] || '•';
  }

  function createItemCard(item, todayKey) {
    const row = document.createElement('li');
    const status = item.consumed ? 'done' : L.dateStatus(item.expiry, todayKey);
    row.className = 'item-card';
    row.dataset.status = status;

    const symbol = document.createElement('span');
    symbol.className = 'item-symbol';
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = itemIcon(item.category);

    const copy = document.createElement('div');
    copy.className = 'item-copy';
    const name = document.createElement('p');
    name.className = 'item-name';
    name.textContent = item.name;
    const meta = document.createElement('p');
    meta.className = 'item-meta';
    const description = document.createElement('span');
    description.textContent = `${numberFormat.format(item.quantity)} ${item.unit} · ${item.category}`;
    const badge = document.createElement('span');
    badge.className = `status-badge ${status}`;
    badge.textContent = statusLabel(item, todayKey);
    meta.append(description, badge);
    copy.append(name, meta);

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = `item-action${item.consumed ? ' restore' : ''}`;
    toggle.dataset.action = 'toggle';
    toggle.dataset.id = item.id;
    toggle.textContent = item.consumed ? 'Kembalikan' : 'Tandai habis';
    toggle.setAttribute('aria-label', item.consumed ? `Kembalikan ${item.name} ke daftar bahan` : `Tandai ${item.name} sudah dipakai`);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-button';
    remove.dataset.action = 'delete';
    remove.dataset.id = item.id;
    remove.textContent = '×';
    remove.title = 'Hapus bahan';
    remove.setAttribute('aria-label', `Hapus ${item.name} secara permanen`);
    actions.append(toggle, remove);
    row.append(symbol, copy, actions);
    return row;
  }

  function render() {
    const todayKey = L.localDateKey();
    const activeItems = items.filter((item) => !item.consumed);
    const priorityCount = activeItems.filter((item) => L.daysUntil(item.expiry, todayKey) <= 3).length;
    $('#priority-count').textContent = String(priorityCount);
    $('#stock-count').textContent = String(activeItems.length);
    $('#done-count').textContent = String(items.filter((item) => item.consumed).length);

    const visible = L.filterItems(items, activeFilter, searchInput.value, todayKey);
    list.replaceChildren(...visible.map((item) => createItemCard(item, todayKey)));
    $('#result-count').textContent = visible.length ? `${visible.length} bahan` : '';
    const hasAny = activeFilter === 'done' ? items.some((item) => item.consumed) : activeFilter === 'priority' ? items.some((item) => !item.consumed && L.daysUntil(item.expiry, todayKey) <= 3) : activeItems.length > 0;
    emptyState.hidden = hasAny;
    noResults.hidden = !hasAny || visible.length > 0;
    if (!hasAny) {
      const title = emptyState.querySelector('h3');
      const message = emptyState.querySelector('p');
      if (activeFilter === 'done') {
        title.textContent = 'Belum ada bahan yang ditandai habis';
        message.textContent = 'Bahan yang sudah dipakai akan muncul di sini.';
      } else if (activeFilter === 'priority') {
        title.textContent = 'Belum ada yang mendesak';
        message.textContent = 'Bahan dengan tanggal paling dekat akan muncul di sini.';
      } else {
        title.textContent = 'Daftarmu masih kosong';
        message.textContent = 'Mulai dengan mencatat satu bahan. Nanti, bahan yang perlu dipakai lebih dulu akan muncul di bagian atas.';
      }
    }
    list.hidden = visible.length === 0;
  }

  function setCategories() {
    categoryInput.replaceChildren();
    for (const category of L.CATEGORIES) {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryInput.append(option);
    }
  }

  function exportCsv() {
    const csv = L.toCsv(items);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `pakai-dulu-${L.localDateKey()}.csv`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast('Daftar bahan berhasil diekspor.');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    formMessage.textContent = '';
    const name = nameInput.value.trim();
    const quantity = quantityInput.valueAsNumber;
    const expiry = expiryInput.value;
    if (!name) {
      formMessage.textContent = 'Isi nama bahan terlebih dahulu.';
      nameInput.focus();
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      formMessage.textContent = 'Masukkan jumlah yang lebih besar dari nol.';
      quantityInput.focus();
      return;
    }
    if (!L.isValidDateKey(expiry)) {
      formMessage.textContent = 'Pilih tanggal yang valid.';
      expiryInput.focus();
      return;
    }
    const item = {
      id: (globalThis.crypto && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      name: name.slice(0, 60), category: categoryInput.value, quantity, unit: unitInput.value,
      expiry, addedAt: new Date().toISOString(), consumed: false, consumedAt: ''
    };
    items.push(item);
    const saved = saveItems();
    form.reset();
    expiryInput.value = L.localDateKey();
    unitInput.value = 'pcs';
    render();
    nameInput.focus();
    showToast(saved ? 'Bahan berhasil ditambahkan.' : 'Perubahan hanya tersimpan sementara; ekspor CSV sebelum menutup halaman.');
  });

  document.querySelectorAll('.filter-button').forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll('.filter-button').forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle('is-active', active);
        candidate.setAttribute('aria-pressed', String(active));
      });
      render();
    });
  });

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const item = items.find((entry) => entry.id === button.dataset.id);
    if (!item) return;
    if (button.dataset.action === 'toggle') {
      item.consumed = !item.consumed;
      item.consumedAt = item.consumed ? new Date().toISOString() : '';
      const saved = saveItems();
      render();
      showToast(saved ? (item.consumed ? 'Bahan ditandai sudah dipakai.' : 'Bahan dikembalikan ke daftar.') : 'Perubahan hanya tersimpan sementara; ekspor CSV sebelum menutup halaman.');
    } else if (button.dataset.action === 'delete') {
      if (!window.confirm(`Hapus “${item.name}” secara permanen dari daftar?`)) return;
      items = items.filter((entry) => entry.id !== item.id);
      const saved = saveItems();
      render();
      showToast(saved ? 'Bahan dihapus dari daftar.' : 'Perubahan hanya tersimpan sementara; ekspor CSV sebelum menutup halaman.');
    }
  });

  searchInput.addEventListener('input', render);
  $('#export-button').addEventListener('click', exportCsv);
  setCategories();
  expiryInput.value = L.localDateKey();
  render();
})();
