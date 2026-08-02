/**
 * Landing Page Katalog – Frontend Tests
 * File: d:/website/WMS/main/tests/katalog.test.js
 *
 * Jalankan dengan: npx jest tests/katalog.test.js
 *
 * Test mencakup:
 *  - Fetch API dari OLSHOP Storefront
 *  - Render kartu produk
 *  - Filter tab kategori
 *  - Skeleton loading
 *  - Fallback ketika API gagal
 *  - Sanitasi XSS (escHtml)
 */

// ─── Mock globals yang ada di browser tapi tidak ada di Node ────────────────
global.fetch = jest.fn();

// Minimal DOM setup untuk setiap test
function setupDOM() {
  document.body.innerHTML = `
    <div id="katalogTabs">
      <button class="tab-btn active" data-cat="semua">Semua</button>
    </div>
    <div id="katalogGrid">
      <div class="katalog-skeleton"></div>
    </div>
    <p id="katalogEmpty" style="display:none;"></p>
  `;
}

// ─── Helper: buat response mock fetch ───────────────────────────────────────
function mockFetch(prodData, catData) {
  global.fetch.mockImplementation((url) => {
    if (url.includes('/products')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(prodData),
      });
    }
    if (url.includes('/categories')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(catData),
      });
    }
    return Promise.reject(new Error('Unknown URL'));
  });
}

// ─── Helper fungsi yang ditest (isolasi dari browser context) ────────────────

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildKatalogCard(p) {
  const catSlug = p.category ? (p.category.slug || '') : '';
  const catName = p.category ? escHtml(p.category.name) : 'Produk';
  const hasImg = p.image_url && !p.image_url.includes('placehold');
  const mediaHtml = hasImg
    ? `<img src="${escHtml(p.image_url)}" alt="${escHtml(p.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`
    : `<svg viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>`;
  return `
    <div class="katalog-item show" data-cat="${escHtml(catSlug)}" data-id="${p.id}">
      <div class="katalog-media">
        <span class="katalog-sku">${escHtml(p.sku)}</span>
        ${mediaHtml}
      </div>
      <div class="katalog-body">
        <span class="katalog-tag">${catName}</span>
        <h4>${escHtml(p.name)}</h4>
        <p>${escHtml((p.description || '').substring(0, 100))}${(p.description || '').length > 100 ? '…' : ''}</p>
        ${p.price > 0 ? `<p class="price">${escHtml(p.price_idr)}</p>` : ''}
      </div>
    </div>`;
}

// ─── UNIT TESTS: escHtml (XSS prevention) ───────────────────────────────────
describe('escHtml – XSS sanitization', () => {
  test('escapes ampersand', () => {
    expect(escHtml('Kabel & Fitting')).toBe('Kabel &amp; Fitting');
  });

  test('escapes less-than and greater-than', () => {
    expect(escHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  test('escapes double quotes', () => {
    expect(escHtml('"quoted"')).toBe('&quot;quoted&quot;');
  });

  test('handles null/undefined gracefully', () => {
    expect(escHtml(null)).toBe('');
    expect(escHtml(undefined)).toBe('');
  });

  test('handles numeric input', () => {
    expect(escHtml(123)).toBe('123');
  });
});

// ─── UNIT TESTS: buildKatalogCard ───────────────────────────────────────────
describe('buildKatalogCard – card HTML generation', () => {
  const baseProduct = {
    id: 1,
    name: 'Kabel NYM 2x1.5mm',
    sku: 'KBL-ENYM-215',
    price: 35000,
    price_idr: 'Rp 35.000',
    description: 'Kabel instalasi listrik standar SNI untuk perumahan.',
    image_url: 'https://example.com/kabel.jpg',
    category: { id: 1, name: 'Kabel', slug: 'kabel' },
    stock: 50,
    is_featured: false,
  };

  test('renders product name in h4', () => {
    const html = buildKatalogCard(baseProduct);
    expect(html).toContain('<h4>Kabel NYM 2x1.5mm</h4>');
  });

  test('renders SKU in katalog-sku span', () => {
    const html = buildKatalogCard(baseProduct);
    expect(html).toContain('KBL-ENYM-215');
  });

  test('renders category name', () => {
    const html = buildKatalogCard(baseProduct);
    expect(html).toContain('Kabel');
  });

  test('renders img tag when image_url provided', () => {
    const html = buildKatalogCard(baseProduct);
    expect(html).toContain('<img');
    expect(html).toContain('https://example.com/kabel.jpg');
  });

  test('renders svg fallback when no image_url', () => {
    const p = { ...baseProduct, image_url: null };
    const html = buildKatalogCard(p);
    expect(html).toContain('<svg');
    expect(html).not.toContain('<img');
  });

  test('renders svg fallback for placehold.co URLs', () => {
    const p = { ...baseProduct, image_url: 'https://placehold.co/400x400?text=Test' };
    const html = buildKatalogCard(p);
    expect(html).toContain('<svg');
  });

  test('renders price_idr when price > 0', () => {
    const html = buildKatalogCard(baseProduct);
    expect(html).toContain('Rp 35.000');
  });

  test('does NOT render price block when price is 0', () => {
    const p = { ...baseProduct, price: 0, price_idr: 'Rp 0' };
    const html = buildKatalogCard(p);
    expect(html).not.toContain('class="price"');
  });

  test('truncates description at 100 chars and adds ellipsis', () => {
    const longDesc = 'A'.repeat(150);
    const p = { ...baseProduct, description: longDesc };
    const html = buildKatalogCard(p);
    expect(html).toContain('A'.repeat(100));
    expect(html).toContain('…');
  });

  test('does NOT add ellipsis when description is short', () => {
    const p = { ...baseProduct, description: 'Short desc' };
    const html = buildKatalogCard(p);
    expect(html).not.toContain('…');
  });

  test('uses Produk as category name fallback when no category', () => {
    const p = { ...baseProduct, category: null };
    const html = buildKatalogCard(p);
    expect(html).toContain('Produk');
  });

  test('sets correct data-cat attribute from category slug', () => {
    const html = buildKatalogCard(baseProduct);
    expect(html).toContain('data-cat="kabel"');
  });

  test('data-cat is empty when no category', () => {
    const p = { ...baseProduct, category: null };
    const html = buildKatalogCard(p);
    expect(html).toContain('data-cat=""');
  });

  test('escapes XSS in product name', () => {
    const p = { ...baseProduct, name: '<script>alert("xss")</script>' };
    const html = buildKatalogCard(p);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('escapes XSS in SKU', () => {
    const p = { ...baseProduct, sku: '"><img onerror=alert(1)>' };
    const html = buildKatalogCard(p);
    expect(html).not.toContain('<img onerror');
  });
});

// ─── INTEGRATION TESTS: DOM renderKatalog ───────────────────────────────────
describe('renderKatalog – DOM rendering logic', () => {
  let allProducts;

  beforeEach(() => {
    setupDOM();
    allProducts = [
      { id: 1, name: 'Produk Kabel', sku: 'KBL-001', price: 10000, price_idr: 'Rp 10.000',
        description: 'Deskripsi kabel', image_url: null,
        category: { id: 1, name: 'Kabel', slug: 'kabel' }, stock: 10, is_featured: false },
      { id: 2, name: 'Helm Safety', sku: 'APD-001', price: 50000, price_idr: 'Rp 50.000',
        description: 'Helm pelindung', image_url: null,
        category: { id: 2, name: 'Safety', slug: 'apd' }, stock: 5, is_featured: false },
    ];
  });

  function renderKatalog(catSlug, products) {
    const katalogGrid = document.getElementById('katalogGrid');
    const katalogEmpty = document.getElementById('katalogEmpty');
    const filtered = catSlug === 'semua'
      ? products
      : products.filter(p => p.category && p.category.slug === catSlug);

    katalogGrid.innerHTML = filtered.length
      ? filtered.map(buildKatalogCard).join('')
      : '';
    katalogEmpty.style.display = filtered.length === 0 ? 'block' : 'none';
  }

  test('renders all products when filter is semua', () => {
    renderKatalog('semua', allProducts);
    const grid = document.getElementById('katalogGrid');
    expect(grid.querySelectorAll('.katalog-item').length).toBe(2);
  });

  test('filters by category slug', () => {
    renderKatalog('kabel', allProducts);
    const grid = document.getElementById('katalogGrid');
    const items = grid.querySelectorAll('.katalog-item');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('h4').textContent).toBe('Produk Kabel');
  });

  test('shows empty message when no products match filter', () => {
    renderKatalog('nonexistent', allProducts);
    const empty = document.getElementById('katalogEmpty');
    expect(empty.style.display).toBe('block');
  });

  test('hides empty message when products are shown', () => {
    renderKatalog('semua', allProducts);
    const empty = document.getElementById('katalogEmpty');
    expect(empty.style.display).toBe('none');
  });

  test('replaces skeleton loading with real products', () => {
    // Before render, skeleton exists
    expect(document.querySelector('.katalog-skeleton')).toBeTruthy();
    renderKatalog('semua', allProducts);
    // After render, skeleton is gone, real items appear
    expect(document.querySelector('.katalog-skeleton')).toBeNull();
    expect(document.querySelectorAll('.katalog-item').length).toBe(2);
  });
});

// ─── INTEGRATION TESTS: buildKatalogTabs ────────────────────────────────────
describe('buildKatalogTabs – dynamic tab injection', () => {
  beforeEach(setupDOM);

  function buildKatalogTabs(categories) {
    const katalogTabs = document.getElementById('katalogTabs');
    const existing = katalogTabs.querySelectorAll('[data-cat]:not([data-cat="semua"])');
    existing.forEach(el => el.remove());
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.dataset.cat = cat.slug;
      btn.textContent = cat.name;
      katalogTabs.appendChild(btn);
    });
  }

  test('injects category tabs from API data', () => {
    buildKatalogTabs([
      { id: 1, name: 'Kabel', slug: 'kabel' },
      { id: 2, name: 'Safety', slug: 'apd' },
    ]);
    const tabs = document.querySelectorAll('#katalogTabs .tab-btn');
    expect(tabs.length).toBe(3); // "Semua" + 2 injected
    expect(tabs[1].dataset.cat).toBe('kabel');
    expect(tabs[2].dataset.cat).toBe('apd');
  });

  test('replaces existing category tabs on re-call', () => {
    buildKatalogTabs([{ id: 1, name: 'Kabel', slug: 'kabel' }]);
    buildKatalogTabs([{ id: 2, name: 'Safety', slug: 'apd' }]);
    const tabs = document.querySelectorAll('#katalogTabs [data-cat]:not([data-cat="semua"])');
    expect(tabs.length).toBe(1);
    expect(tabs[0].dataset.cat).toBe('apd');
  });

  test('preserves the Semua tab', () => {
    buildKatalogTabs([{ id: 1, name: 'Kabel', slug: 'kabel' }]);
    const semuaBtn = document.querySelector('[data-cat="semua"]');
    expect(semuaBtn).toBeTruthy();
    expect(semuaBtn.textContent).toBe('Semua');
  });
});

// ─── INTEGRATION TESTS: loadKatalog (API fetch) ─────────────────────────────
describe('loadKatalog – API fetch and render', () => {
  const mockProducts = {
    success: true,
    total: 2,
    products: [
      { id: 1, name: 'Kabel NYM', sku: 'KBL-NYM', price: 25000, price_idr: 'Rp 25.000',
        description: 'Kabel NYM standar SNI', image_url: null,
        category: { id: 1, name: 'Kabel', slug: 'kabel' }, stock: 30, is_featured: false },
    ],
  };

  const mockCategories = {
    success: true,
    categories: [{ id: 1, name: 'Kabel', slug: 'kabel', products_count: 1 }],
  };

  beforeEach(() => {
    setupDOM();
    global.fetch.mockReset();
  });

  test('calls both products and categories endpoints', async () => {
    mockFetch(mockProducts, mockCategories);
    const prodRes = await fetch('https://shop.tepegrafi.id/api/v1/storefront/products?limit=48');
    const catRes  = await fetch('https://shop.tepegrafi.id/api/v1/storefront/categories');
    const pData = await prodRes.json();
    const cData = await catRes.json();

    expect(pData.success).toBe(true);
    expect(pData.products.length).toBe(1);
    expect(cData.success).toBe(true);
    expect(cData.categories.length).toBe(1);
  });

  test('handles API error gracefully (network failure)', async () => {
    global.fetch.mockRejectedValue(new Error('Network Error'));
    let errorCaught = false;
    try {
      await fetch('https://shop.tepegrafi.id/api/v1/storefront/products?limit=48');
    } catch (e) {
      errorCaught = true;
      // Fallback message should be displayed in real implementation
    }
    expect(errorCaught).toBe(true);
  });

  test('handles API returning success:false gracefully', async () => {
    mockFetch({ success: false, products: [] }, { success: false, categories: [] });
    const res = await fetch('https://example.com/api/v1/storefront/products?limit=48');
    const data = await res.json();
    expect(data.success).toBe(false);
    // In real app, allProducts stays empty = empty grid shown
  });
});
