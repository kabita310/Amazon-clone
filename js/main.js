
const Cart = (() => {
  const STORAGE_KEY = 'amazon_clone_cart';

  function load() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function save(items) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function getItems() {
    return load();
  }

  function addItem(item) {
    const items = load();
    const existing = items.find(i => i.id === item.id);
    if (existing) {
      existing.qty += item.qty || 1;
    } else {
      items.push({ ...item, qty: item.qty || 1 });
    }
    save(items);
    updateCartBadge();
  }

  function removeItem(id) {
    const items = load().filter(i => i.id !== id);
    save(items);
    updateCartBadge();
  }

  function updateQty(id, qty) {
    const items = load();
    const item = items.find(i => i.id === id);
    if (item) {
      item.qty = qty;
      if (item.qty <= 0) return removeItem(id);
    }
    save(items);
    updateCartBadge();
  }

  function totalCount() {
    return load().reduce((sum, i) => sum + i.qty, 0);
  }

  function subtotal() {
    return load().reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  function clear() {
    save([]);
    updateCartBadge();
  }

  return { getItems, addItem, removeItem, updateQty, totalCount, subtotal, clear };
})();

/** Update every cart badge on the current page. */
function updateCartBadge() {
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = Cart.totalCount();
  });
}

/** Show a temporary toast notification. */
function showToast(message, type = 'success') {
  // Remove any existing toast
  document.querySelectorAll('.clone-toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `clone-toast clone-toast--${type}`;
  toast.innerHTML = `
    <span class="clone-toast__icon">${type === 'success' ? '✓' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add('clone-toast--show'));

  // Auto-dismiss
  setTimeout(() => {
    toast.classList.remove('clone-toast--show');
    setTimeout(() => toast.remove(), 400);
  }, 2800);
}

/** Inject shared toast CSS once. */
(function injectToastCSS() {
  if (document.getElementById('clone-toast-style')) return;
  const style = document.createElement('style');
  style.id = 'clone-toast-style';
  style.textContent = `
    .clone-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(80px);
      background: #232f3e;
      color: #fff;
      padding: 12px 22px;
      border-radius: 4px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 9999;
      box-shadow: 0 4px 16px rgba(0,0,0,0.35);
      transition: transform 0.35s cubic-bezier(.22,1,.36,1), opacity 0.35s;
      opacity: 0;
      pointer-events: none;
    }
    .clone-toast--show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    .clone-toast--success .clone-toast__icon { color: #FF9900; }
    .clone-toast--info .clone-toast__icon { color: #aad; }
  `;
  document.head.appendChild(style);
})();


/* ──────────────────────────────────────────────────────────────
   2. HEADER — shared across all pages
   ────────────────────────────────────────────────────────────── */

function initHeader() {
  updateCartBadge();

  /* Search form submit */
  const searchBtn = document.querySelector('.search-bar button[type="submit"]');
  const searchInput = document.querySelector('.search-bar input[type="text"]');

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query) {
        // Navigate to products page with query string (static sim)
        window.location.href = `products.html?q=${encodeURIComponent(query)}`;
      } else {
        searchInput.focus();
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchBtn.click();
    });
  }

  const hamburger = document.querySelector('.hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      const nav = document.querySelector('.main-nav');
      if (nav) nav.classList.toggle('main-nav--open');
    });
  }
}


/* ──────────────────────────────────────────────────────────────
   3. INDEX PAGE  (index.html)
   ────────────────────────────────────────────────────────────── */

function initIndexPage() {
  document.querySelectorAll('.product-card').forEach((card, idx) => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('add-to-cart-btn')) {
        e.stopPropagation();
        const title = card.querySelector('h3')?.textContent || `Product ${idx + 1}`;
        const priceText = card.querySelector('.current-price')?.textContent || '$0.00';
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
        Cart.addItem({ id: `featured-${idx}`, title, price });
        showToast(`"${title}" added to cart`);
      }
    });
  });

}


/* ──────────────────────────────────────────────────────────────
   4. PRODUCTS PAGE  (products.html)
   ────────────────────────────────────────────────────────────── */

function initProductsPage() {
  /* Highlight active sort option */
  const sortSelect = document.getElementById('sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      showToast(`Sorted by: ${sortSelect.options[sortSelect.selectedIndex].text}`, 'info');
      // Static: no real re-sort; just acknowledge
    });
  }

  /* Filter checkboxes — show toast feedback */
  document.querySelectorAll('.filter-section input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const label = document.querySelector(`label[for="${cb.id}"]`)?.textContent || cb.id;
      showToast(cb.checked ? `Filter applied: ${label}` : `Filter removed: ${label}`, 'info');
    });
  });

  /* Pre-fill search box if ?q= param present */
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) {
    const searchInput = document.querySelector('.search-bar input[type="text"]');
    if (searchInput) searchInput.value = decodeURIComponent(q);
    const resultsInfo = document.querySelector('.results-info p');
    if (resultsInfo) {
      resultsInfo.textContent = `Results for "${decodeURIComponent(q)}"`;
    }
  }

  /* Product item click — already handled by inline onclick; add "Add to Cart" shortcut */
  document.querySelectorAll('.product-item').forEach((item, idx) => {
    const title = item.querySelector('h3')?.textContent || `Product ${idx + 1}`;
    const priceText = item.querySelector('.current-price')?.textContent || '$0.00';
    const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

    // Inject "Add to Cart" button if not present
    if (!item.querySelector('.add-to-cart-btn')) {
      const btn = document.createElement('button');
      btn.className = 'add-to-cart-btn';
      btn.textContent = 'Add to Cart';
      btn.style.cssText = `
        margin-top: 8px;
        background: #FF9900;
        border: none;
        padding: 7px 14px;
        border-radius: 20px;
        font-weight: 600;
        cursor: pointer;
        font-size: 13px;
        transition: background 0.2s;
      `;
      btn.addEventListener('mouseenter', () => btn.style.background = '#e68900');
      btn.addEventListener('mouseleave', () => btn.style.background = '#FF9900');
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Don't trigger item click navigation
        Cart.addItem({ id: `product-${idx}`, title, price });
        showToast(`"${title}" added to cart`);
        updateCartBadge();
      });
      item.querySelector('.product-info')?.appendChild(btn);
    }
  });
}


/* ──────────────────────────────────────────────────────────────
   5. PRODUCT DETAIL PAGE  (product-detail.html)
   ────────────────────────────────────────────────────────────── */

function initProductDetailPage() {
  /* Thumbnail image switcher */
  window.changeImage = function (src) {
    const mainImage = document.getElementById('mainImage');
    if (mainImage) {
      mainImage.style.opacity = '0';
      setTimeout(() => {
        mainImage.src = src;
        mainImage.style.opacity = '1';
      }, 150);
      mainImage.style.transition = 'opacity 0.15s';
    }
  };

  /* Active thumbnail highlight */
  document.querySelectorAll('.thumbnail-images img').forEach(thumb => {
    thumb.style.cursor = 'pointer';
    thumb.addEventListener('click', function () {
      document.querySelectorAll('.thumbnail-images img').forEach(t =>
        t.style.outline = 'none'
      );
      this.style.outline = '2px solid #FF9900';
    });
  });

  /* Quantity selector */
  const qtySelect = document.getElementById('quantity');

  /* Add to Cart button */
  const addToCartBtn = document.querySelector('.add-to-cart-btn, #addToCartBtn, .atc-btn');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      const title = document.querySelector('.product-info h1')?.textContent || 'Product';
      const priceText = document.querySelector('.current-price')?.textContent || '0';
      const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      const qty = qtySelect ? parseInt(qtySelect.value) : 1;
      Cart.addItem({ id: 'product-detail', title: title.trim(), price, qty });
      showToast(`"${title.trim().slice(0, 40)}…" added to cart`);
    });
  }

  /* Buy Now button */
  const buyNowBtn = document.querySelector('.buy-now-btn, #buyNowBtn');
  if (buyNowBtn) {
    buyNowBtn.addEventListener('click', () => {
      const title = document.querySelector('.product-info h1')?.textContent || 'Product';
      const priceText = document.querySelector('.current-price')?.textContent || '0';
      const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      const qty = qtySelect ? parseInt(qtySelect.value) : 1;
      Cart.addItem({ id: 'product-detail', title: title.trim(), price, qty });
      window.location.href = 'cart.html';
    });
  }
}


/* ──────────────────────────────────────────────────────────────
   6. CART PAGE  (cart.html)
   ────────────────────────────────────────────────────────────── */

window.removeItem = function (btn) {
  const cartItem = btn.closest('.cart-item');
  if (!cartItem) return;

  // Animate out
  cartItem.style.transition = 'opacity 0.3s, max-height 0.4s, padding 0.3s';
  cartItem.style.overflow = 'hidden';
  cartItem.style.opacity = '0';
  cartItem.style.maxHeight = cartItem.scrollHeight + 'px';
  requestAnimationFrame(() => {
    cartItem.style.maxHeight = '0';
    cartItem.style.padding = '0';
  });

  setTimeout(() => {
    cartItem.remove();
    recalcCartTotals();
    showToast('Item removed from cart');

    // Show empty state if no items left
    const remaining = document.querySelectorAll('.cart-item');
    if (remaining.length === 0) showCartEmpty();
  }, 400);
};

/**
 * updateQuantity(selectEl, unitPrice) — called by inline onchange on qty selects.
 */
window.updateQuantity = function (selectEl, unitPrice) {
  const qty = parseInt(selectEl.value);
  const cartItem = selectEl.closest('.cart-item');
  if (!cartItem) return;

  const priceEl = cartItem.querySelector('.price-value');
  if (priceEl) {
    priceEl.textContent = `$${(unitPrice * qty).toFixed(2)}`;
  }
  recalcCartTotals();
};

/** Recalculate and render subtotals from DOM state. */
function recalcCartTotals() {
  let total = 0;
  let count = 0;

  document.querySelectorAll('.cart-item').forEach(item => {
    const priceText = item.querySelector('.price-value')?.textContent || '$0';
    const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
    const checked = item.querySelector('input[type="checkbox"]')?.checked !== false;
    if (checked) {
      total += price;
      // Determine qty from select or assume 1
      const qty = parseInt(item.querySelector('select')?.value || '1');
      count += qty;
    }
  });

  // Update all subtotal elements
  document.querySelectorAll('.subtotal-price, .total-price').forEach(el => {
    el.textContent = `$${total.toFixed(2)}`;
  });
  document.querySelectorAll('.subtotal-text, .total-text').forEach(el => {
    el.textContent = `Subtotal (${count} item${count !== 1 ? 's' : ''}): `;
  });
  updateCartBadge();
}

function showCartEmpty() {
  const cartContent = document.querySelector('.cart-content');
  if (!cartContent) return;
  cartContent.innerHTML = `
    <div style="text-align:center; padding: 60px 20px;">
      <h2 style="font-size:1.6rem; color:#232f3e;">Your Amazon Cart is empty.</h2>
      <p style="color:#555; margin: 12px 0 24px;">Your shopping cart is waiting. Give it purpose – fill it with groceries, clothing, household supplies, electronics, and more.</p>
      <a href="index.html" style="
        display:inline-block;
        background:#FF9900;
        color:#111;
        padding: 10px 22px;
        border-radius: 20px;
        font-weight: 600;
        text-decoration: none;
      ">Continue Shopping</a>
    </div>
  `;
}

/** Proceed to checkout — static simulation. */
window.proceedToCheckout = function () {
  const items = document.querySelectorAll('.cart-item');
  if (items.length === 0) {
    showToast('Your cart is empty!', 'info');
    return;
  }
  // Static: redirect to login (as a real Amazon flow would)
  showToast('Redirecting to checkout…', 'info');
  setTimeout(() => window.location.href = 'login.html', 1500);
};

function initCartPage() {
  // Wire up checkboxes to recalculate totals on toggle
  document.querySelectorAll('.cart-item input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', recalcCartTotals);
  });

  // "Deselect all items"
  const deselectAll = document.querySelector('.deselect-all');
  if (deselectAll) {
    deselectAll.style.cursor = 'pointer';
    deselectAll.addEventListener('click', () => {
      const allChecked = [...document.querySelectorAll('.cart-item input[type="checkbox"]')]
        .every(cb => cb.checked);
      document.querySelectorAll('.cart-item input[type="checkbox"]').forEach(cb => {
        cb.checked = !allChecked;
      });
      deselectAll.textContent = allChecked ? 'Select all items' : 'Deselect all items';
      recalcCartTotals();
    });
  }

  // "Save for later" buttons
  document.querySelectorAll('.save-later-btn').forEach(btn => {
    btn.addEventListener('click', () => showToast('Item saved for later', 'info'));
  });

  // "Compare with similar items" buttons
  document.querySelectorAll('.compare-btn').forEach(btn => {
    btn.addEventListener('click', () => showToast('Comparison feature coming soon', 'info'));
  });

  // "Share" buttons
  document.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard', 'info');
      } else {
        showToast('Share: ' + window.location.href, 'info');
      }
    });
  });

  // Recommended "Add to Cart" buttons
  document.querySelectorAll('.recommended-item .add-to-cart-btn').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      const info = btn.closest('.recommended-item');
      const title = info?.querySelector('h4')?.textContent || `Recommended item ${idx + 1}`;
      const priceText = info?.querySelector('.price')?.textContent || '$0';
      const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      Cart.addItem({ id: `rec-${idx}`, title, price });
      showToast(`"${title}" added to cart`);
    });
  });

  // Initial calc
  recalcCartTotals();
}


/* ──────────────────────────────────────────────────────────────
   7. LOGIN PAGE  (login.html)
   ────────────────────────────────────────────────────────────── */

/** handleLogin(event) — called by form onsubmit */
window.handleLogin = function (e) {
  e.preventDefault();
  // Static: just validate fields and show feedback
  const email = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;

  clearFormErrors();

  let valid = true;
  if (!email || !isValidEmail(email)) {
    showFieldError('email', 'Please enter a valid email address.');
    valid = false;
  }
  if (!password || password.length < 6) {
    showFieldError('password', 'Your password is incorrect.');
    valid = false;
  }

  if (valid) {
    showToast('Signing in…');
    setTimeout(() => window.location.href = 'index.html', 1500);
  }
};

/** signIn() — called by the "Sign in" button directly */
window.signIn = function () {
  const email = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;

  clearFormErrors();

  let valid = true;
  if (!email || !isValidEmail(email)) {
    showFieldError('email', 'Please enter a valid email address.');
    valid = false;
  }
  if (!password || password.length < 6) {
    showFieldError('password', 'Your password is incorrect.');
    valid = false;
  }

  if (valid) {
    showToast('Signing in…');
    setTimeout(() => window.location.href = 'index.html', 1500);
  }
};

function initLoginPage() {
  // "Continue" button — just focus password if email is valid
  const continueBtn = document.querySelector('.continue-btn');
  if (continueBtn) {
    continueBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const email = document.getElementById('email')?.value.trim();
      clearFormErrors();
      if (!email || !isValidEmail(email)) {
        showFieldError('email', 'Please enter a valid email address.');
      } else {
        document.getElementById('password')?.focus();
      }
    });
  }

  // Password visibility toggle
  injectPasswordToggle('password');
}


/* ──────────────────────────────────────────────────────────────
   8. REGISTER PAGE  (register.html)
   ────────────────────────────────────────────────────────────── */

/** handleRegister(event) — called by form onsubmit */
window.handleRegister = function (e) {
  e.preventDefault();
  clearFormErrors();

  const name = document.getElementById('name')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;
  const confirmPassword = document.getElementById('confirmPassword')?.value;

  let valid = true;

  if (!name || name.length < 2) {
    showFieldError('name', 'Please enter your name.');
    valid = false;
  }
  if (!email || !isValidEmail(email)) {
    showFieldError('email', 'Please enter a valid email address.');
    valid = false;
  }
  if (!password || password.length < 6) {
    showFieldError('password', 'Passwords must be at least 6 characters.');
    valid = false;
  }
  if (password !== confirmPassword) {
    showFieldError('confirmPassword', 'Passwords do not match.');
    valid = false;
  }

  if (valid) {
    showToast('Account created! Redirecting…');
    setTimeout(() => window.location.href = 'index.html', 1600);
  }
};

function initRegisterPage() {
  // Live password strength indicator
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    injectPasswordStrengthBar();
    passwordInput.addEventListener('input', () => {
      updatePasswordStrength(passwordInput.value);
    });
  }

  // Live confirm-password match check
  const confirmInput = document.getElementById('confirmPassword');
  if (confirmInput && passwordInput) {
    confirmInput.addEventListener('input', () => {
      clearFieldError('confirmPassword');
      if (confirmInput.value && confirmInput.value !== passwordInput.value) {
        showFieldError('confirmPassword', 'Passwords do not match.');
      }
    });
  }

  // Visibility toggles
  injectPasswordToggle('password');
  injectPasswordToggle('confirmPassword');
}


/* ──────────────────────────────────────────────────────────────
   9. FORM HELPERS
   ────────────────────────────────────────────────────────────── */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(fieldId, message) {
  clearFieldError(fieldId);
  const input = document.getElementById(fieldId);
  if (!input) return;

  input.style.borderColor = '#c40000';
  const err = document.createElement('p');
  err.className = 'field-error';
  err.id = `${fieldId}-error`;
  err.style.cssText = 'color:#c40000; font-size:13px; margin:4px 0 0;';
  err.textContent = message;
  input.parentNode.insertBefore(err, input.nextSibling);
}

function clearFieldError(fieldId) {
  const input = document.getElementById(fieldId);
  if (input) input.style.borderColor = '';
  document.getElementById(`${fieldId}-error`)?.remove();
}

function clearFormErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.remove());
  document.querySelectorAll('.login-form input, .login-form input').forEach(i => {
    i.style.borderColor = '';
  });
}

function injectPasswordToggle(fieldId) {
  const input = document.getElementById(fieldId);
  if (!input) return;

  const wrapper = input.parentNode;
  wrapper.style.position = 'relative';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.textContent = 'Show';
  toggle.style.cssText = `
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #007185;
    cursor: pointer;
    font-size: 13px;
    padding: 0;
  `;
  toggle.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    toggle.textContent = isPassword ? 'Hide' : 'Show';
  });

  // Only inject if label is a sibling (form-group pattern)
  wrapper.style.display = 'flex';
  wrapper.style.flexWrap = 'wrap';
  wrapper.appendChild(toggle);
}

function injectPasswordStrengthBar() {
  const passwordGroup = document.getElementById('password')?.parentNode;
  if (!passwordGroup || document.getElementById('strength-bar')) return;

  const container = document.createElement('div');
  container.id = 'strength-bar';
  container.innerHTML = `
    <div style="display:flex; gap:4px; margin-top:6px;">
      <div class="seg" style="height:4px; flex:1; border-radius:2px; background:#ddd;"></div>
      <div class="seg" style="height:4px; flex:1; border-radius:2px; background:#ddd;"></div>
      <div class="seg" style="height:4px; flex:1; border-radius:2px; background:#ddd;"></div>
      <div class="seg" style="height:4px; flex:1; border-radius:2px; background:#ddd;"></div>
    </div>
    <p id="strength-label" style="font-size:12px; margin:4px 0 0; color:#555;"></p>
  `;
  passwordGroup.appendChild(container);
}

function updatePasswordStrength(value) {
  const segs = document.querySelectorAll('#strength-bar .seg');
  const label = document.getElementById('strength-label');
  if (!segs.length) return;

  let score = 0;
  if (value.length >= 6) score++;
  if (value.length >= 10) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;

  const colors = ['#c40000', '#e47911', '#007600', '#007600'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];

  segs.forEach((seg, i) => {
    seg.style.background = i < score ? colors[score - 1] : '#ddd';
    seg.style.transition = 'background 0.3s';
  });

  if (label) {
    label.textContent = value.length ? `Password strength: ${labels[score - 1] || 'Weak'}` : '';
    label.style.color = score > 0 ? colors[score - 1] : '#555';
  }
}


/* ──────────────────────────────────────────────────────────────
   10. PAGE DETECTION & INIT
   ────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // Always init header
  initHeader();

  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1).toLowerCase();

  if (page === '' || page === 'index.html') {
    initIndexPage();
  } else if (page === 'products.html') {
    initProductsPage();
  } else if (page === 'product-detail.html') {
    initProductDetailPage();
  } else if (page === 'cart.html') {
    initCartPage();
  } else if (page === 'login.html') {
    initLoginPage();
  } else if (page === 'register.html') {
    initRegisterPage();
  } else {
    initIndexPage();
    initProductsPage();
    initProductDetailPage();
    initCartPage();
    initLoginPage();
    initRegisterPage();
  }
});