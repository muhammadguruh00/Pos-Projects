// =================================================================
// MODULAR JAVASCRIPT ARCHITECTURE (Stable Version)
// =================================================================

/**
 * Simple Event Bus for decoupled communication between modules.
 */
const EventBus = (function() {
    const events = {};
    function on(eventName, fn) { events[eventName] = events[eventName] || []; events[eventName].push(fn); }
    function off(eventName, fn) { if (events[eventName]) { events[eventName] = events[eventName].filter(eventFn => fn !== eventFn); } }
    function emit(eventName, data) { if (events[eventName]) { events[eventName].forEach(fn => fn(data)); } }
    return { on, off, emit };
})();

/**
 * Application State Manager
 */
const AppState = (function() {
    let state = {
        products: [],
        orders: [],
        cart: [],
        settings: { taxEnabled: true, taxRate: 10, serviceName: 'Kasir', storeName: 'Servis Pusat' },
        ui: { currentFilter: 'all', searchTerm: '', currentPage: 1, itemsPerPage: 12 }
    };
    function getState() { return state; }
    function setState(newState) { state = { ...state, ...newState }; EventBus.emit('stateChanged', state); }
    function updateState(updates) { state = { ...state, ...updates }; EventBus.emit('stateUpdated', updates); }
    return { getState, setState, updateState };
})();

/**
 * Storage Service - Handles all data persistence
 */
const StorageService = (function() {
    const KEYS = { PRODUCTS: 'greattech_products', ORDERS: 'greattech_orders', SETTINGS: 'greattech_settings' };
    const defaultProducts = [
        { id: 1, sku: 'SPR001', name: 'LCD iPhone 11', type: 'product', price: 750000, stock: 10, image: 'https://via.placeholder.com/80x80/555555/FFFFFF?text=LCD' },
        { id: 2, sku: 'SPR002', name: 'Baterai Xiaomi Redmi Note 9', type: 'product', price: 150000, stock: 25, image: 'https://via.placeholder.com/80x80/4CAF50/FFFFFF?text=BAT' },
        { id: 3, sku: 'SPR003', name: 'SSD NVMe 512GB', type: 'product', price: 650000, stock: 5, image: 'https://via.placeholder.com/80x80/2196F3/FFFFFF?text=SSD' },
        { id: 4, sku: 'SPR004', name: 'Flex Cable iPhone', type: 'product', price: 50000, stock: 50, image: 'https://via.placeholder.com/80x80/FF9800/FFFFFF?text=Cable' },
        { id: 5, sku: 'SPR005', name: 'RAM DDR4 8GB', type: 'product', price: 450000, stock: 12, image: 'https://via.placeholder.com/80x80/9C27B0/FFFFFF?text=RAM' },
        { id: 101, sku: 'SVC001', name: 'Servis Ganti LCD HP', type: 'service', price: 150000, duration: 60, image: 'https://via.placeholder.com/80x80/00BCD4/FFFFFF?text=Service' },
        { id: 102, sku: 'SVC002', name: 'Instalasi Ulang Laptop', type: 'service', price: 200000, duration: 120, image: 'https://via.placeholder.com/80x80/607D8B/FFFFFF?text=Install' },
        { id: 103, sku: 'SVC003', name: 'Cuci Full Laptop', type: 'service', price: 100000, duration: 90, image: 'https://via.placeholder.com/80x80/795548/FFFFFF?text=Clean' },
        { id: 104, sku: 'SVC004', name: 'Cek Kerusakan HP/Laptop', type: 'service', price: 50000, duration: 30, image: 'https://via.placeholder.com/80x80/E91E63/FFFFFF?text=Check' },
    ];
    function save(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); return true; } catch (e) { console.error(`Failed to save ${key}:`, e); return false; } }
    function load(key, defaultValue = null) { try { const data = localStorage.getItem(key); return data ? JSON.parse(data) : defaultValue; } catch (e) { console.error(`Failed to load ${key}:`, e); return defaultValue; } }
    function loadInitialData() {
        const products = load(KEYS.PRODUCTS, defaultProducts);
        const orders = load(KEYS.ORDERS, []);
        const settings = load(KEYS.SETTINGS, AppState.getState().settings);
        AppState.setState({ products, orders, settings });
    }
    function saveProducts(products) { return save(KEYS.PRODUCTS, products); }
    function saveOrders(orders) { return save(KEYS.ORDERS, orders); }
    function saveSettings(settings) { return save(KEYS.SETTINGS, settings); }
    return { loadInitialData, saveProducts, saveOrders, saveSettings };
})();

/**
 * UI Service - Handles all DOM manipulations and rendering
 */
const UIService = (function() {
    function showModal(modalId) { document.getElementById(modalId).style.display = 'block'; }
    function hideModal(modalId) { document.getElementById(modalId).style.display = 'none'; }
    function renderProductGrid(products) {
        const grid = document.getElementById('productGrid'); grid.innerHTML = '';
        if (products.length === 0) { grid.innerHTML = '<p style="text-align: center; color: #777; grid-column: 1/-1;">Tidak ada produk yang ditemukan.</p>'; return; }
        products.forEach(product => {
            const isOutOfStock = product.type === 'product' && product.stock <= 0;
            const card = document.createElement('div'); card.className = `product-card ${isOutOfStock ? 'out-of-stock' : ''}`; card.dataset.productId = product.id;
            const stockInfo = product.type === 'product' ? `<p class="stock">Stok: ${product.stock}</p>` : `<p class="stock">Durasi: ${product.duration} menit</p>`;
            card.innerHTML = `<img src="${product.image}" alt="${product.name}"><h3>${product.name}</h3><p class="price">Rp ${product.price.toLocaleString('id-ID')}</p>${stockInfo}`;
            grid.appendChild(card);
        });
    }
    function renderPagination(totalItems, currentPage, itemsPerPage) {
        const container = document.getElementById('paginationContainer'); container.innerHTML = '';
        const totalPages = Math.ceil(totalItems / itemsPerPage); if (totalPages <= 1) return;
        const prevBtn = createPaginationButton('Previous', currentPage > 1, () => AppState.updateState({ ui: { ...AppState.getState().ui, currentPage: currentPage - 1 } })); container.appendChild(prevBtn);
        for (let i = 1; i <= totalPages; i++) { if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) { const pageBtn = createPaginationButton(i, true, () => AppState.updateState({ ui: { ...AppState.getState().ui, currentPage: i } })); if (i === currentPage) pageBtn.classList.add('active'); container.appendChild(pageBtn); } else if (i === currentPage - 2 || i === currentPage + 2) { const dots = document.createElement('span'); dots.textContent = '...'; dots.className = 'pagination-info'; container.appendChild(dots); } }
        const nextBtn = createPaginationButton('Next', currentPage < totalPages, () => AppState.updateState({ ui: { ...AppState.getState().ui, currentPage: currentPage + 1 } })); container.appendChild(nextBtn);
        const info = document.createElement('span'); info.className = 'pagination-info'; info.textContent = `Page ${currentPage} of ${totalPages}`; container.appendChild(info);
    }
    function createPaginationButton(text, enabled, onClick) { const button = document.createElement('button'); button.className = 'pagination-button'; button.textContent = text; button.disabled = !enabled; if (enabled) button.onclick = onClick; return button; }
    function renderCart(cart) {
        const container = document.getElementById('cartItems'); const clearBtn = document.getElementById('clearCartBtn');
        if (cart.length === 0) { container.innerHTML = '<p style="text-align: center; color: #777;">Keranjang masih kosong.</p>'; clearBtn.style.display = 'none'; }
        else {
            clearBtn.style.display = 'flex';
            container.innerHTML = cart.map(item => `
                <div class="cart-item" data-cart-item-id="${item.id}">
                    <div class="cart-item-info"><div class="cart-item-name">${item.name}</div><div class="cart-item-price">Rp ${item.price.toLocaleString('id-ID')} x ${item.quantity}</div></div>
                    <div class="quantity-control"><button class="quantity-decrease">-</button><span>${item.quantity}</span><button class="quantity-increase">+</button></div>
                </div>
            `).join('');
        }
        updateCartSummary(cart);
    }
    function updateCartSummary(cart) {
        const state = AppState.getState(); const { settings } = state;
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0); let tax = 0; let total = subtotal;
        if (settings.taxEnabled) { tax = subtotal * (settings.taxRate / 100); total = subtotal + tax; document.getElementById('taxLabel').textContent = `Pajak (${settings.taxRate}%)`; document.getElementById('tax').textContent = `Rp ${tax.toLocaleString('id-ID')}`; document.getElementById('taxRow').style.display = 'flex'; }
        else { document.getElementById('taxRow').style.display = 'none'; }
        document.getElementById('subtotal').textContent = `Rp ${subtotal.toLocaleString('id-ID')}`; document.getElementById('total').textContent = `Rp ${total.toLocaleString('id-ID')}`; document.getElementById('payButton').disabled = cart.length === 0;
    }
    function updateUserInfo(settings) { const span = document.getElementById('userInfoSpan'); if (span) { span.textContent = `Kasir: ${settings.serviceName} | Toko: ${settings.storeName}`; } }
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast'); const toastMessage = document.getElementById('toastMessage'); const icon = toast.querySelector('i');
        toastMessage.textContent = message; toast.className = `toast ${type}`;
        if (type === 'success') icon.className = 'fas fa-check-circle'; else if (type === 'error') icon.className = 'fas fa-exclamation-circle'; else if (type === 'warning') icon.className = 'fas fa-exclamation-triangle';
        toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3000);
    }
    function showLoading() { document.getElementById('loadingModal').style.display = 'block'; }
    function hideLoading() { document.getElementById('loadingModal').style.display = 'none'; }
    return { showModal, hideModal, renderProductGrid, renderPagination, renderCart, updateUserInfo, showToast, showLoading, hideLoading };
})();

/**
 * Product Service - Manages product data and logic
 */
const ProductService = (function() {
    function getFilteredProducts() {
        const state = AppState.getState(); const { products, ui } = state; const { currentFilter, searchTerm } = ui;
        return products.filter(p => {
            const matchesFilter = currentFilter === 'all' || p.type === currentFilter;
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesFilter && matchesSearch;
        });
    }
    function getPaginatedProducts() {
        const state = AppState.getState(); const { ui } = state; const { currentPage, itemsPerPage } = ui;
        const filtered = getFilteredProducts(); const startIndex = (currentPage - 1) * itemsPerPage; const endIndex = startIndex + itemsPerPage;
        return { products: filtered.slice(startIndex, endIndex), totalItems: filtered.length };
    }
    function addProductToCart(productId) {
        const state = AppState.getState(); const { products, cart } = state; const product = products.find(p => p.id === productId);
        if (!product) return; if (product.type === 'product' && product.stock <= 0) { UIService.showToast('Produk ini sudah habis!', 'warning'); return; }
        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) { if (product.type === 'product' && existingItem.quantity >= product.stock) { UIService.showToast('Stok tidak mencukupi!', 'warning'); return; } existingItem.quantity++; }
        else { cart.push({ ...product, quantity: 1 }); }
        if (product.type === 'product') { product.stock--; }
        AppState.updateState({ cart, products }); StorageService.saveProducts(products); UIService.showToast(`${product.name} ditambahkan ke keranjang`, 'success');
    }
    function updateCartItemQuantity(itemId, change) {
        const state = AppState.getState(); const { cart, products } = state; const item = cart.find(i => i.id === itemId); const product = products.find(p => p.id === itemId);
        if (!item || !product) return;
        if (product.type === 'product' && change > 0 && item.quantity >= product.stock) { UIService.showToast('Stok tidak mencukupi!', 'warning'); return; }
        item.quantity += change; if (item.quantity <= 0) { const index = cart.findIndex(i => i.id === itemId); cart.splice(index, 1); }
        if (product.type === 'product' && change < 0) { product.stock += Math.abs(change); }
        AppState.updateState({ cart, products }); StorageService.saveProducts(products);
    }
    function clearCart() { if (!confirm('Apakah Anda yakin ingin mengosongkan keranjang?')) return; const state = AppState.getState(); const { cart, products } = state; cart.forEach(item => { const product = products.find(p => p.id === item.id); if (product && product.type === 'product') { product.stock += item.quantity; } }); AppState.updateState({ cart: [], products }); StorageService.saveProducts(products); UIService.showToast('Keranjang dikosongkan', 'success'); }
    return { getFilteredProducts, getPaginatedProducts, addProductToCart, updateCartItemQuantity, clearCart };
})();

/**
 * Settings Module - REFACTOR UNTUK KEMUDAHAN DAN STABILITAS
 */
const SettingsModule = (function() {
    let productImageData = null;
    let serviceImageData = null;
    let productIdForStockUpdate = null;
    let stockActionType = 'add';

    function showSettings() { UIService.showModal('settingsModal'); renderSettingsContent(); }
    
    function renderSettingsContent() {
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                const tabId = tab.dataset.tab + '-tab';
                document.getElementById(tabId).classList.add('active');
                
                if (tab.dataset.tab === 'product') { renderProductTab(); } 
                else if (tab.dataset.tab === 'service') { renderServiceTab(); } 
                else if (tab.dataset.tab === 'app') { renderAppTab(); }
            };
        });
        renderProductTab(); // Render default tab
    }

    // ==========================================================
    // RENDER TAB PRODUK
    // ==========================================================
    function renderProductTab() {
    resetProductForm();
    const state = AppState.getState(); 
    const { products } = state;
    const productItems = products.filter(p => p.type === 'product');
    const tbody = document.getElementById('productTableBody'); 
    tbody.innerHTML = '';
    
    productItems.forEach(product => {
      const row = `
        <tr>
          <td>${product.sku || '-'}</td>
          <td>${product.name}</td>
          <td>Rp ${(product.cost || 0).toLocaleString('id-ID')}</td>
          <td>Rp ${product.price.toLocaleString('id-ID')}</td>
          <td>${product.stock}</td>
          <td class="actions">
            <button class="btn-success" onclick="SettingsModule.showAddStockModal(${product.id})">+ Stok</button>
            <button class="btn-warning" onclick="SettingsModule.showSubtractStockModal(${product.id})">- Stok</button>
            <button class="btn-edit" onclick="SettingsModule.populateProductFormForEdit(${product.id})">Edit</button>
            <button class="btn-delete" onclick="SettingsModule.deleteItem(${product.id})">Hapus</button>
          </td>
        </tr>
      `;
      tbody.innerHTML += row;
    });
  }

    // ==========================================================
    // RENDER TAB JASA
    // ==========================================================
    function renderServiceTab() {
        resetServiceForm();
        const state = AppState.getState(); const { products } = state;
        const serviceItems = products.filter(p => p.type === 'service');
        const tbody = document.getElementById('serviceTableBody'); tbody.innerHTML = '';
        serviceItems.forEach(service => {
            const row = `<tr><td>${service.sku || '-'}</td><td>${service.name}</td><td>Rp ${service.price.toLocaleString('id-ID')}</td><td>${service.duration} menit</td><td class="actions"><button class="btn-edit" onclick="SettingsModule.populateServiceFormForEdit(${service.id})">Edit</button><button class="btn-delete" onclick="SettingsModule.deleteItem(${service.id})">Hapus</button></td></tr>`;
            tbody.innerHTML += row;
        });
    }

    function renderAppTab() {
        const state = AppState.getState(); const { settings } = state;
        document.getElementById('taxEnabled').value = settings.taxEnabled.toString();
        document.getElementById('taxRate').value = settings.taxRate;
        document.getElementById('cashierName').value = settings.serviceName;
        document.getElementById('storeName').value = settings.storeName;
        document.getElementById('taxRateGroup').style.display = settings.taxEnabled ? 'block' : 'none';
    }
    
    // ==========================================================
    // FUNGSI FORM PRODUK
    // ==========================================================
    function resetProductForm() {
        document.getElementById('productForm').reset();
        document.getElementById('productId').value = '';
        productImageData = null;
        updateProductImagePreview(null);
        document.getElementById('submitProductBtn').textContent = 'Tambah Produk';
    }

    function populateProductFormForEdit(id) {
        const state = AppState.getState(); const { products } = state; const product = products.find(p => p.id === id);
        if (!product) return;

        document.getElementById('productId').value = product.id;
        document.getElementById('productSKU').value = product.sku || '';
        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stock || 0;
        
        productImageData = product.image;
        updateProductImagePreview(product.image);
        document.getElementById('submitProductBtn').textContent = 'Update Produk';
    }

    function handleProductFormSubmit(event) {
    event.preventDefault();
    const state = AppState.getState(); 
    let { products } = state;
    const id = document.getElementById('productId').value;
    
    const productData = {
      id: id ? parseInt(id) : Date.now(),
      sku: document.getElementById('productSKU').value,
      name: document.getElementById('productName').value,
      type: 'product',
      cost: parseInt(document.getElementById('productCost').value) || 0,
      price: parseInt(document.getElementById('productPrice').value),
      stock: parseInt(document.getElementById('productStock').value) || 0,
    };

        const fileInput = document.getElementById('productImage');
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                productData.image = e.target.result;
                saveItemData(productData, products, id, 'product');
            };
            reader.readAsDataURL(file);
        } else {
            if (id) {
                const existingItem = products.find(p => p.id == id);
                productData.image = productImageData || existingItem.image;
            } else {
                productData.image = `https://via.placeholder.com/80x80/cccccc/FFFFFF?text=${encodeURIComponent(document.getElementById('productName').value.substring(0, 5))}`;
            }
            saveItemData(productData, products, id, 'product');
        }
    }

    // Fungsi untuk memperbarui preview gambar produk
   function updateServiceImagePreview(imageSrc) {
    const previewContainer = document.getElementById('serviceImagePreview');
    if (imageSrc) {
      previewContainer.innerHTML = `<img src="${imageSrc}" alt="Preview"><button type="button" class="remove-image-btn" onclick="event.stopPropagation(); SettingsModule.removeServiceImage();">&times;</button>`;
    } else {
      previewContainer.innerHTML = `<i class="fas fa-image placeholder-icon"></i>`;
    }
  }
    function removeProductImage() { productImageData = null; document.getElementById('productImage').value = ''; updateProductImagePreview(null); }

    // ==========================================================
    // FUNGSI FORM JASA
    // ==========================================================
    function resetServiceForm() {
        document.getElementById('serviceForm').reset();
        document.getElementById('serviceId').value = '';
        serviceImageData = null;
        updateServiceImagePreview(null);
        document.getElementById('submitServiceBtn').textContent = 'Tambah Jasa';
    }

    function populateServiceFormForEdit(id) {
        const state = AppState.getState(); const { products } = state; const service = products.find(p => p.id === id);
        if (!service) return;

        document.getElementById('serviceId').value = service.id;
        document.getElementById('serviceSKU').value = service.sku || '';
        document.getElementById('serviceName').value = service.name;
        document.getElementById('servicePrice').value = service.price;
        document.getElementById('serviceDuration').value = service.duration || 0;
        
        serviceImageData = service.image;
        updateServiceImagePreview(service.image);
        document.getElementById('submitServiceBtn').textContent = 'Update Jasa';
    }

    function handleServiceFormSubmit(event) {
        event.preventDefault();
        const state = AppState.getState(); let { products } = state;
        const id = document.getElementById('serviceId').value;
        
        const serviceData = {
            id: id ? parseInt(id) : Date.now(),
            sku: document.getElementById('serviceSKU').value,
            name: document.getElementById('serviceName').value,
            type: 'service',
            price: parseInt(document.getElementById('servicePrice').value),
            duration: parseInt(document.getElementById('serviceDuration').value) || 0,
        };

        const fileInput = document.getElementById('serviceImage');
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                serviceData.image = e.target.result;
                saveItemData(serviceData, products, id, 'service');
            };
            reader.readAsDataURL(file);
        } else {
            if (id) {
                const existingItem = products.find(p => p.id == id);
                serviceData.image = serviceImageData || existingItem.image;
            } else {
                serviceData.image = `https://via.placeholder.com/80x80/cccccc/FFFFFF?text=${encodeURIComponent(document.getElementById('serviceName').value.substring(0, 5))}`;
            }
            saveItemData(serviceData, products, id, 'service');
        }
    }

    function updateServiceImagePreview(imageSrc) {
        const previewContainer = document.getElementById('serviceImagePreview');
        if (imageSrc) {
            previewContainer.innerHTML = `<img src="${imageSrc}" alt="Preview"><button type="button" class="remove-image-btn" onclick="event.stopPropagation(); SettingsModule.removeServiceImage();">&times;</button>`;
        } else {
            previewContainer.innerHTML = `<i class="fas fa-image placeholder-icon"></i>`;
        }
    }
    function removeServiceImage() { serviceImageData = null; document.getElementById('serviceImage').value = ''; updateServiceImagePreview(null); }

    // ==========================================================
    // FUNGSI UMUM
    // ==========================================================
    function saveItemData(itemData, products, id, type) {
        if (id) {
            const index = products.findIndex(p => p.id == id);
            if (index !== -1) products[index] = itemData;
        } else {
            products.push(itemData);
        }
        AppState.updateState({ products }); StorageService.saveProducts(products);
        if (type === 'product') renderProductTab(); else renderServiceTab();
        UIService.showToast(`Item berhasil ${id ? 'diperbarui' : 'ditambahkan'}`, 'success');
    }

    function deleteItem(id) {
        if (!confirm('Apakah Anda yakin ingin menghapus item ini?')) return;
        const state = AppState.getState(); let { products } = state; products = products.filter(p => p.id !== id);
        AppState.updateState({ products }); StorageService.saveProducts(products);
        const activeTab = document.querySelector('.settings-tab.active').dataset.tab;
        if (activeTab === 'product') renderProductTab(); else if (activeTab === 'service') renderServiceTab();
        UIService.showToast('Item berhasil dihapus', 'success');
    }

    function handleAppSettingsFormSubmit(event) {
        event.preventDefault();
        const newSettings = {
            taxEnabled: document.getElementById('taxEnabled').value === 'true',
            taxRate: parseFloat(document.getElementById('taxRate').value),
            serviceName: document.getElementById('cashierName').value.trim() || 'Kasir',
            storeName: document.getElementById('storeName').value.trim() || 'Servis Pusat'
        };
        AppState.updateState({ settings: newSettings }); StorageService.saveSettings(newSettings); UIService.updateUserInfo(newSettings); UIService.renderCart(AppState.getState().cart); UIService.showToast('Pengaturan berhasil disimpan!', 'success');
    }

    // ==========================================================
    // FUNGSI UNTUK STOK (Hanya untuk produk)
    // ==========================================================
    function showAddStockModal(productId) { stockActionType = 'add'; showStockModal(productId); }
    function showSubtractStockModal(productId) { stockActionType = 'subtract'; showStockModal(productId); }
    
    function showStockModal(productId) {
        const state = AppState.getState();
        const product = state.products.find(p => p.id === productId);
        if (!product || product.type !== 'product') {
            UIService.showToast('Hanya produk fisik yang bisa diubah stoknya.', 'warning');
            return;
        }
        
        productIdForStockUpdate = productId;
        
        // Perbarui informasi produk di modal
        document.getElementById('stockModalProductName').textContent = product.name;
        document.getElementById('stockModalProductPrice').textContent = `Rp ${product.price.toLocaleString('id-ID')}`;
        document.getElementById('stockModalProductStock').textContent = product.stock;
        
        const modalTitle = document.getElementById('stockModalTitle');
        const inputLabel = document.getElementById('stockModalLabel');
        const confirmBtn = document.getElementById('confirmAddStockBtn');

        if (stockActionType === 'add') {
            modalTitle.textContent = 'Tambah Stok Produk';
            inputLabel.textContent = 'Jumlah Stok yang Ditambahkan:';
            confirmBtn.textContent = 'Tambah Stok';
        } else {
            modalTitle.textContent = 'Kurangi Stok Produk';
            inputLabel.textContent = 'Jumlah Stok yang Dikurangi:';
            confirmBtn.textContent = 'Kurangi Stok';
        }
        
        document.getElementById('addStockAmount').value = '';
        UIService.showModal('addStockModal');
        }

    function confirmStockAdjustment() {
        const amountToAdjust = parseInt(document.getElementById('addStockAmount').value);
        if (isNaN(amountToAdjust) || amountToAdjust <= 0) { UIService.showToast('Jumlah stok tidak valid.', 'error'); return; }
        const state = AppState.getState(); let { products } = state; const productIndex = products.findIndex(p => p.id === productIdForStockUpdate);
        if (productIndex !== -1) {
            let newStock = products[productIndex].stock; let actionMessage = '';
            if (stockActionType === 'add') { newStock += amountToAdjust; actionMessage = `${amountToAdjust} stok berhasil ditambahkan`; }
            else { if (amountToAdjust > products[productIndex].stock) { UIService.showToast('Jumlah pengurangan stok melebihi stok yang ada.', 'error'); return; } newStock -= amountToAdjust; actionMessage = `${amountToAdjust} stok berhasil dikurangi`; }
            products[productIndex].stock = newStock;
            AppState.updateState({ products }); StorageService.saveProducts(products);
            renderProductTab();
            UIService.hideModal('addStockModal');
            UIService.showToast(`${actionMessage} untuk ${products[productIndex].name}. Stok baru: ${newStock}.`, 'success');
        }
        productIdForStockUpdate = null;
    }

    return { 
        showSettings, 
        populateProductFormForEdit,
        populateServiceFormForEdit,
        deleteItem, 
        handleProductFormSubmit, 
        handleServiceFormSubmit,
        handleAppSettingsFormSubmit,
        removeProductImage,
        removeServiceImage,
        updateProductImagePreview, // TAMBAH INI
        updateServiceImagePreview, // TAMBAH INI
        showAddStockModal,
        showSubtractStockModal,
        confirmStockAdjustment
        };
})();


/**
 * Dashboard Module - Handles rendering of dashboard charts and metrics
 */
const DashboardModule = (function() {
    let revenueChartInstance = null;
    let bestSellingChartInstance = null;

    function showDashboard() {
        UIService.showModal('dashboardModal');
        renderDashboard('today');
        setupDashboardFilters();
    }

    function setupDashboardFilters() {
        document.querySelectorAll('.dashboard-filters button').forEach(button => {
            button.replaceWith(button.cloneNode(true));
        });
        document.querySelectorAll('.dashboard-filters button').forEach(button => {
            button.addEventListener('click', function() {
                renderDashboard(this.dataset.filter);
            });
        });
    }

    function renderDashboard(filter) {
        const state = AppState.getState();
        const { orders } = state;
        const today = new Date();
        let targetDate, dateLabel, ordersToRender;

        switch(filter) {
            case 'today':
                targetDate = today.toISOString().split('T')[0];
                dateLabel = 'Hari Ini';
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                targetDate = yesterday.toISOString().split('T')[0];
                dateLabel = 'Hari Kemarin';
                break;
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                targetDate = weekStart.toISOString().split('T')[0];
                dateLabel = 'Minggu Ini';
                break;
            case 'month':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                targetDate = monthStart.toISOString().split('T')[0];
                dateLabel = 'Bulan Ini';
                break;
            default:
                targetDate = today.toISOString().split('T')[0];
                dateLabel = 'Hari Ini';
        }

        if (filter === 'week' || filter === 'month') {
            ordersToRender = orders.filter(order => new Date(order.timestamp) >= new Date(targetDate));
        } else {
            ordersToRender = orders.filter(order => order.timestamp.startsWith(targetDate));
        }

        let totalIncome = 0;
        let totalTransactions = ordersToRender.length;
        let totalItemsSold = 0;

        ordersToRender.forEach(order => {
            totalIncome += order.totalAmount;
            order.items.forEach(item => {
                totalItemsSold += item.quantity;
            });
        });

        const metricsContainer = document.getElementById('dashboardMetrics');
        metricsContainer.innerHTML = `
            <div class="metric-card">
                <i class="fas fa-cash-register"></i>
                <h3>${totalTransactions}</h3>
                <p>Total Transaksi (${dateLabel})</p>
            </div>
            <div class="metric-card">
                <i class="fas fa-money-bill-trend-up"></i>
                <h3>Rp ${totalIncome.toLocaleString('id-ID')}</h3>
                <p>Total Pendapatan (${dateLabel})</p>
            </div>
            <div class="metric-card">
                <i class="fas fa-box"></i>
                <h3>${totalItemsSold}</h3>
                <p>Total Item Terjual (${dateLabel})</p>
            </div>
        `;

        document.querySelectorAll('.dashboard-filters button').forEach(btn => { 
            btn.classList.remove('active'); 
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });

        renderRevenueChart();
        renderBestSellingChart();
    }

    function renderRevenueChart() {
        const ctx = document.getElementById('revenueChart').getContext('2d');
        if (revenueChartInstance) { revenueChartInstance.destroy(); }
        const state = AppState.getState(); const { orders } = state;
        const labels = []; const data = []; const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today); date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayOrders = orders.filter(order => order.timestamp.startsWith(dateStr));
            const dayRevenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
            labels.push(date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }));
            data.push(dayRevenue);
        }
        revenueChartInstance = new Chart(ctx, { 
            type: 'line', 
            data: { 
                labels: labels, 
                datasets: [{ 
                    label: 'Pendapatan (Rp)', 
                    data: data, 
                    borderColor: 'rgba(0, 168, 232, 1)', 
                    backgroundColor: 'rgba(0, 168, 232, 0.2)', 
                    borderWidth: 2, 
                    fill: true, 
                    tension: 0.3 
                }] 
            }, 
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        ticks: { 
                            callback: function(value) { 
                                return 'Rp ' + value.toLocaleString('id-ID'); 
                            } 
                        } 
                    } 
                }, 
                plugins: { 
                    legend: { display: false }, 
                    tooltip: { 
                        callbacks: { 
                            label: function(context) { 
                                let label = context.dataset.label || ''; 
                                if (label) { label += ': '; } 
                                if (context.parsed.y !== null) { 
                                    label += 'Rp ' + context.parsed.y.toLocaleString('id-ID'); 
                                } 
                                return label; 
                            } 
                        } 
                    } 
                } 
            } 
        });
    }

    function renderBestSellingChart() {
        const ctx = document.getElementById('bestSellingChart').getContext('2d');
        if (bestSellingChartInstance) { bestSellingChartInstance.destroy(); }
        const state = AppState.getState(); const { orders } = state;
        const productSales = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
            });
        });
        const sortedSales = Object.entries(productSales).sort(([, a], [, b]) => b - a).slice(0, 5);
        const labels = sortedSales.map(([name]) => name);
        const data = sortedSales.map(([, quantity]) => quantity);
        bestSellingChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Jumlah Terjual',
                    data: data,
                    backgroundColor: 'rgba(0, 193, 124, 0.6)',
                    borderColor: 'rgba(0, 193, 124, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: '5 Produk/Jasa Terlaris',
                        font: { size: 16 }
                    }
                }
            }
        });
    }
    return { showDashboard };
})();

/**
 * History Module
 */
const HistoryModule = (function() {
    function showHistory() { 
        UIService.showModal('historyModal'); 
        renderHistoryTable(); 
        populateMonthFilter(); 
    }
    function renderHistoryTable() {
        const state = AppState.getState(); 
        const { orders } = state;
        const tbody = document.getElementById('historyTableBody'); 
        tbody.innerHTML = '';
        if (orders.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tidak ada transaksi.</td></tr>'; 
            return; 
        }
        orders.forEach(order => {
            const itemsList = order.items.map(item => `${item.name}(${item.quantity})`).join(', ');
            const row = `
                <tr>
                    <td>${order.orderNumber}</td>
                    <td>${new Date(order.timestamp).toLocaleDateString('id-ID')}</td>
                    <td>Rp ${order.totalAmount.toLocaleString('id-ID')}</td>
                    <td>${itemsList}</td>
                    <td>${order.paymentMethod.replace('-', ' ').toUpperCase()}</td>
                    <td>
                        <button class="btn-edit" onclick="HistoryModule.viewOrderReceipt('${order.orderNumber}')">Lihat</button>
                        <button class="btn-delete" onclick="HistoryModule.deleteOrder('${order.orderNumber}')">Hapus</button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }
    function deleteOrder(orderNumber) {
        if (!confirm(`Apakah Anda yakin ingin menghapus transaksi ${orderNumber}?`)) { return; }
        const state = AppState.getState(); let { orders } = state;
        orders = orders.filter(order => order.orderNumber !== orderNumber);
        AppState.updateState({ orders }); StorageService.saveOrders(orders);
        renderHistoryTable(); UIService.showToast('Transaksi berhasil dihapus', 'success');
    }
    function populateMonthFilter() {
        const state = AppState.getState(); const { orders } = state;
        const monthFilter = document.getElementById('historyMonthFilter'); monthFilter.innerHTML = '<option value="">Semua Bulan</option>';
        const months = new Set(); orders.forEach(order => { 
            const date = new Date(order.timestamp); 
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; 
            months.add(monthYear); 
        }); 
        Array.from(months).sort().reverse().forEach(month => { 
            const [year, monthNum] = month.split('-'); 
            const monthName = new Date(year, monthNum - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }); 
            monthFilter.innerHTML += `<option value="${month}">${monthName}</option>`; 
        });
    }
    function filterHistory() {
        const state = AppState.getState(); let { orders } = state;
        const dateFilter = document.getElementById('historyDateFilter').value;
        const monthFilter = document.getElementById('historyMonthFilter').value;
        const searchFilter = document.getElementById('historySearchFilter').value.toLowerCase();
        orders = orders.filter(order => {
            const orderDate = new Date(order.timestamp).toISOString().split('T')[0];
            const orderMonth = orderDate.substring(0, 7);
            const dateMatch = !dateFilter || orderDate === dateFilter;
            const monthMatch = !monthFilter || orderMonth === monthFilter;
            const searchMatch = !searchFilter || order.orderNumber.toLowerCase().includes(searchFilter);
            return dateMatch && monthMatch && searchMatch;
        });
        const tbody = document.getElementById('historyTableBody'); tbody.innerHTML = '';
        if (orders.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tidak ada transaksi yang cocok dengan filter.</td></tr>'; 
            return; 
        }
        orders.forEach(order => {
            const itemsList = order.items.map(item => `${item.name}(${item.quantity})`).join(', ');
            const row = `
                <tr>
                    <td>${order.orderNumber}</td>
                    <td>${new Date(order.timestamp).toLocaleDateString('id-ID')}</td>
                    <td>Rp ${order.totalAmount.toLocaleString('id-ID')}</td>
                    <td>${itemsList}</td>
                    <td>${order.paymentMethod.replace('-', ' ').toUpperCase()}</td>
                    <td>
                        <button class="btn-edit" onclick="HistoryModule.viewOrderReceipt('${order.orderNumber}')">Lihat</button>
                        <button class="btn-delete" onclick="HistoryModule.deleteOrder('${order.orderNumber}')">Hapus</button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    }
    function viewOrderReceipt(orderNumber) {
        const state = AppState.getState(); const { orders, settings } = state;
        const order = orders.find(o => o.orderNumber === orderNumber);
        if (!order) return;
        const itemsHTML = order.items.map(item => `<div class="receipt-item"><span>${item.name} x${item.quantity}</span><span>Rp ${(item.price * item.quantity).toLocaleString('id-ID')}</span></div>`).join('');
        const receiptHTML = `
            <div class="receipt-header"><h2>${settings.storeName}</h2><p>Jl. Veteran III Gg. Kp. Rw., RT.005/RW.002, Banjar Sari, Kec. Ciawi, Kabupaten Bogor, Jawa Barat 16720</p><p>Telp: +62-858-1378-6413</p></div>
            <div class="receipt-body">
                <div class="receipt-item"><span>No. Order</span><span>${order.orderNumber}</span></div><div class="receipt-item"><span>Tanggal</span><span>${new Date(order.timestamp).toLocaleString('id-ID')}</span></div><div class="receipt-item"><span>Kasir</span><span>${settings.serviceName}</span></div><hr style="margin: 1rem 0;">${itemsHTML}
                <div class="receipt-summary"><div class="receipt-item"><span>Subtotal</span><span>Rp ${order.subtotal.toLocaleString('id-ID')}</span></div>${order.taxAmount > 0 ? `<div class="receipt-item"><span>Pajak (${settings.taxRate}%)</span><span>Rp ${order.taxAmount.toLocaleString('id-ID')}</span></div>` : ''}<div class="receipt-item" style="font-weight: bold; font-size: 1.1rem;"><span>TOTAL</span><span>Rp ${order.totalAmount.toLocaleString('id-ID')}</span></div></div>
            </div><div class="receipt-footer"><p>================================</p><p>Terima Kasih</p><p>Garansi Servis 1 Minggu</p></div>
        `;
        document.getElementById('receiptContent').innerHTML = receiptHTML; UIService.showModal('receiptModal');
    }
    function exportDailyToCSV() { const today = new Date().toISOString().split('T')[0]; const state = AppState.getState(); const { orders } = state; const todayOrders = orders.filter(order => order.timestamp.startsWith(today)); if (todayOrders.length === 0) { UIService.showToast('Tidak ada transaksi untuk hari ini.', 'warning'); return; } exportToCSV(todayOrders, `Laporan_Penjualan_${today}.csv`); }
    function exportFilteredHistory() { const state = AppState.getState(); let { orders } = state; exportToCSV(orders, `Laporan_Penjualan_Filter_${new Date().toISOString().split('T')[0]}.csv`); }
    function exportToCSV(orderList, filename) {
        let csvContent = "data:text/csv;charset=utf-8,No. Order,Tanggal,Jam,Total,Item,Jumlah,Harga Satuan,Metode Pembayaran\n";
        orderList.forEach(order => {
            const date = new Date(order.timestamp); order.items.forEach(item => {
                const row = [order.orderNumber, date.toLocaleDateString('id-ID'), date.toLocaleTimeString('id-ID'), order.totalAmount, `"${item.name}"`, item.quantity, item.price, order.paymentMethod.replace('-', ' ').toUpperCase()].join(',');
                csvContent += row + "\n";
            });
        });
        const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", filename); document.body.appendChild(link); link.click(); document.body.removeChild(link); UIService.showToast('Laporan berhasil diunduh', 'success');
    }
    return { showHistory, filterHistory, viewOrderReceipt, deleteOrder, exportDailyToCSV, exportFilteredHistory };
})();

/**
 * Storage Module
 */
const StorageModule = (function() {
    function showStorage() { UIService.showModal('storageModal'); updateStorageInfo(); }
    function updateStorageInfo() {
        const state = AppState.getState(); const { products, orders } = state;
        document.getElementById('productStorageInfo').textContent = `${products.length} item`;
        document.getElementById('orderStorageInfo').textContent = `${orders.length} transaksi`;
        document.getElementById('storageStatusInfo').textContent = 'Normal (LocalStorage)';
    }
    function backupData() {
        const state = AppState.getState(); const { products, orders, settings } = state;
        const backupData = { version: '1.0', date: new Date().toISOString(), products, orders, settings };
        const dataStr = JSON.stringify(backupData, null, 2); const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(dataBlob); link.download = `GreatTech_Backup_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
        UIService.showToast('Backup berhasil diunduh', 'success');
    }
    function restoreData(event) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const backupData = JSON.parse(e.target.result);
                if (!backupData.products || !backupData.orders) { throw new Error('Format backup tidak valid'); }
                if (confirm('Restore data akan menimpa data saat ini. Lanjutkan?')) {
                    AppState.setState({ products: backupData.products, orders: backupData.orders, settings: backupData.settings || AppState.getState().settings });
                    StorageService.saveProducts(backupData.products); StorageService.saveOrders(backupData.orders); StorageService.saveSettings(backupData.settings || AppState.getState().settings);
                    UIService.showToast('Data berhasil di-restore', 'success'); UIService.hideModal('storageModal');
                }
            } catch (error) { console.error('Restore error:', error); UIService.showToast('Gagal restore data. Format file tidak valid.', 'error'); }
        };
        reader.readAsText(file); event.target.value = '';
    }
    function clearAllData() {
        if (!confirm('Apakah Anda yakin ingin menghapus SEMUA data? Tindakan ini tidak dapat dibatalkan.')) return;
        if (confirm('PERINGATAN: Semua data akan PERMANEN dihapus. Yakin ingin melanjutkan?')) {
            localStorage.clear(); AppState.setState({ products: StorageService.loadInitialData().products, orders: [], cart: [] });
            UIService.showToast('Semua data berhasil dihapus', 'success'); UIService.hideModal('storageModal');
        }
    }
    return { showStorage, updateStorageInfo, backupData, restoreData, clearAllData };
})();

/**
 * Update Module - Handles data update simulation
 */
const UpdateModule = (function() {
    let pendingUpdate = null;
    function checkForUpdates() {
        UIService.showLoading();
        setTimeout(() => {
            const currentVersion = '1.0';
            const latestVersion = '1.1';
            if (currentVersion === latestVersion) {
                UIService.hideLoading();
                UIService.showToast('Anda menggunakan versi terbaru.', 'success');
                return;
            }
            const newProduct = { id: Date.now(), sku: 'UPD001', name: 'Charger Laptop 65W (UPDATE)', type: 'product', price: 250000, stock: 20, image: 'https://via.placeholder.com/80x80/FF5722/FFFFFF?text=UPDATE' };
            pendingUpdate = { 
                version: latestVersion, 
                date: new Date().toISOString(), 
                items: [newProduct],
                changelog: ['Ditambahkan: Produk baru "Charger Laptop 65W"', 'Perbaikan: Penanganan stok yang lebih aman', 'Peningkatan: Stabilitas umum aplikasi']
            };
            UIService.hideLoading(); 
            showUpdateModal();
        }, 1500);
    }
    function showUpdateModal() {
        if (!pendingUpdate) return;
        const detailsText = document.getElementById('updateDetailsText');
        detailsText.innerHTML = `<strong>Version:</strong> ${pendingUpdate.version}<br><strong>Tanggal Rilis:</strong> ${new Date(pendingUpdate.date).toLocaleString('id-ID')}<br><h3>Item Baru:</h3><ul>${pendingUpdate.items.map(item => `<li>${item.name} - Rp ${item.price.toLocaleString('id-ID')}</li>`).join('')}</ul>`;
        const changelogContainer = document.getElementById('updateChangelogContainer');
        changelogContainer.innerHTML = `
            <div class="update-changelog">
                <h4>Catatan Pembaruan (Changelog):</h4>
                <ul>
                    ${pendingUpdate.changelog.map(change => `<li>${change}</li>`).join('')}
                </ul>
            </div>
        `;
        UIService.showModal('updateModal');
    }
    function applyUpdate() {
        if (!pendingUpdate) return;
        const state = AppState.getState(); let { products } = state;
        pendingUpdate.items.forEach(newItem => {
            if (!products.find(p => p.sku === newItem.sku)) { products.push(newItem); }
        });
        AppState.updateState({ products }); StorageService.saveProducts(products);
        UIService.showToast('Pembaruan data berhasil diterapkan!', 'success');
        UIService.hideModal('updateModal'); pendingUpdate = null;
    }
    return { checkForUpdates, applyUpdate };
})();

/**
 * Main Application Controller
 */
const App = (function() {
    let selectedPaymentMethod = null;
    function init() {
        StorageService.loadInitialData();
        setupEventListeners();
        renderInitialUI();
        setupGlobalModalListeners();
    }
    function setupEventListeners() {
        document.getElementById('dashboardBtn').onclick = DashboardModule.showDashboard;
        document.getElementById('settingsBtn').onclick = SettingsModule.showSettings;
        document.getElementById('storageBtn').onclick = StorageModule.showStorage;
        document.getElementById('historyBtn').onclick = HistoryModule.showHistory;
        document.getElementById('searchBar').oninput = (e) => AppState.updateState({ ui: { ...AppState.getState().ui, searchTerm: e.target.value, currentPage: 1 } });
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                AppState.updateState({ ui: { ...AppState.getState().ui, currentFilter: tab.dataset.filter, currentPage: 1 } });
            };
        });
        document.getElementById('clearCartBtn').onclick = ProductService.clearCart;
        document.getElementById('payButton').onclick = () => UIService.showModal('paymentModal');
        
        // Event Listener untuk form yang dipisah
        document.getElementById('productForm').onsubmit = SettingsModule.handleProductFormSubmit;
        document.getElementById('serviceForm').onsubmit = SettingsModule.handleServiceFormSubmit;
        document.getElementById('appSettingsForm').onsubmit = SettingsModule.handleAppSettingsFormSubmit;
        
        document.getElementById('productImage').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                // Gunakan fungsi yang sudah diperbaiki
                SettingsModule.updateProductImagePreview(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };
        document.getElementById('serviceImage').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                // Gunakan fungsi yang sudah diperbaiki
                SettingsModule.updateServiceImagePreview(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };
        document.getElementById('applyUpdateBtn').onclick = UpdateModule.applyUpdate;
        
        // Event Listener untuk modal Stok
        document.getElementById('confirmAddStockBtn').onclick = SettingsModule.confirmStockAdjustment;
        document.getElementById('cancelAddStock').onclick = () => UIService.hideModal('addStockModal');

        EventBus.on('stateUpdated', renderApp);
        EventBus.on('stateChanged', renderApp);
    }
    function setupGlobalModalListeners() {
        // Listener untuk tombol close (x) dan backdrop modal
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-btn')) {
                e.target.closest('.modal').style.display = 'none';
            }
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }
    function renderInitialUI() { const state = AppState.getState(); UIService.updateUserInfo(state.settings); renderApp(); }
    function renderApp() {
        const state = AppState.getState(); const { cart, ui } = state;
        const { products, totalItems } = ProductService.getPaginatedProducts();
        UIService.renderProductGrid(products); UIService.renderPagination(totalItems, ui.currentPage, ui.itemsPerPage);
        UIService.renderCart(cart);
        document.querySelectorAll('.product-card:not(.out-of-stock)').forEach(card => { card.onclick = () => ProductService.addProductToCart(parseInt(card.dataset.productId)); });
        document.querySelectorAll('.quantity-decrease').forEach(btn => { btn.onclick = () => { const itemId = parseInt(btn.closest('.cart-item').dataset.cartItemId); ProductService.updateCartItemQuantity(itemId, -1); }; });
        document.querySelectorAll('.quantity-increase').forEach(btn => { btn.onclick = () => { const itemId = parseInt(btn.closest('.cart-item').dataset.cartItemId); ProductService.updateCartItemQuantity(itemId, 1); }; });
    }
    function setupPaymentModal() {
        document.querySelectorAll('.payment-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
                this.classList.add('selected'); selectedPaymentMethod = this.dataset.method; showPaymentDetails();
            });
        });
        document.getElementById('cancelPayment').onclick = () => { UIService.hideModal('paymentModal'); resetPaymentModal(); };
        document.getElementById('confirmPayment').onclick = finalizeTransaction;
    }
    function showPaymentDetails() {
        const state = AppState.getState(); const { cart, settings } = state;
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = settings.taxEnabled ? subtotal * (settings.taxRate / 100) : 0; const total = subtotal + tax;
        let detailsHTML = '';
        if (selectedPaymentMethod === 'cash') {
            detailsHTML = `<div class="payment-details"><h3>Pembayaran Tunai</h3><label for="cashReceived">Uang Diterima:</label><input type="number" id="cashReceived" placeholder="Masukkan nominal" style="width: 100%;"><div id="changeAmount" style="margin-top: 1rem; font-weight: bold;">Kembalian: Rp 0</div></div>`;
        } else {
            detailsHTML = `<div class="payment-details"><h3>Pembayaran dengan ${selectedPaymentMethod === 'ewallet' ? 'E-Wallet' : 'Transfer Bank'}</h3><p>Silakan selesaikan pembayaran.</p><p><strong>Total: Rp ${total.toLocaleString('id-ID')}</strong></p></div>`;
        }
        document.getElementById('paymentDetailsContainer').innerHTML = detailsHTML; document.getElementById('paymentDetailsContainer').style.display = 'block'; document.getElementById('confirmPayment').style.display = 'block';
        if (selectedPaymentMethod === 'cash') {
            document.getElementById('cashReceived').addEventListener('input', () => {
                const received = parseFloat(document.getElementById('cashReceived').value) || 0; const change = received - total;
                document.getElementById('changeAmount').textContent = `Kembalian: Rp ${change.toLocaleString('id-ID')}`;
            });
        }
    }
    function resetPaymentModal() { selectedPaymentMethod = null; document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected')); document.getElementById('paymentDetailsContainer').style.display = 'none'; document.getElementById('paymentDetailsContainer').innerHTML = ''; document.getElementById('confirmPayment').style.display = 'none'; }
    function finalizeTransaction() {
        const state = AppState.getState(); const { cart, settings, orders } = state;
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = settings.taxEnabled ? subtotal * (settings.taxRate / 100) : 0; const total = subtotal + tax;
        if (selectedPaymentMethod === 'cash') { const received = parseFloat(document.getElementById('cashReceived').value) || 0; if (received < total) { UIService.showToast('Uang yang diterima kurang!', 'error'); return; } }
        const order = { orderNumber: `POS-${Date.now()}`, timestamp: new Date().toISOString(), items: JSON.parse(JSON.stringify(cart)), subtotal, taxAmount: tax, totalAmount: total, paymentMethod: selectedPaymentMethod };
        orders.push(order); StorageService.saveOrders(orders);
        HistoryModule.viewOrderReceipt(order.orderNumber);
        UIService.hideModal('paymentModal'); AppState.updateState({ cart: [] }); resetPaymentModal(); UIService.showToast('Pembayaran berhasil!', 'success');
    }
    function setupReceiptDownload() {
        document.getElementById('downloadPdfBtn').onclick = () => {
            if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
                UIService.showToast('Library PDF tidak dimuat. Tidak dapat mengunduh.', 'error');
                return;
            }
            UIService.showLoading();
            const receiptContent = document.getElementById('receiptContent');
            window.html2canvas(receiptContent).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF();
                const imgWidth = 190; const pageHeight = 295;
                const imgHeight = canvas.height * imgWidth / canvas.width; let heightLeft = imgHeight; let position = 10;
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight); heightLeft -= pageHeight;
                while (heightLeft >= 0) { position = heightLeft - imgHeight; pdf.addPage(); pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight); heightLeft -= pageHeight; }
                pdf.save(`Struk_${new Date().getTime()}.pdf`);
                UIService.hideLoading(); UIService.showToast('Struk berhasil diunduh', 'success');
            });
        };
    }
    return { init, setupPaymentModal, setupReceiptDownload };
})();

// =================================================================
// INITIALIZE APPLICATION
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    App.setupPaymentModal();
    App.setupReceiptDownload();
});

// Tambahkan fungsi ini di SettingsModule
function updateProductImagePreview(imageSrc) {
    const previewContainer = document.getElementById('productImagePreview');
    if (imageSrc) {
        previewContainer.innerHTML = `<img src="${imageSrc}" alt="Preview"><button type="button" class="remove-image-btn" onclick="event.stopPropagation(); SettingsModule.removeProductImage();">&times;</button>`;
    } else {
        previewContainer.innerHTML = `<i class="fas fa-image placeholder-icon"></i>`;
    }
}

function updateServiceImagePreview(imageSrc) {
    const previewContainer = document.getElementById('serviceImagePreview');
    if (imageSrc) {
        previewContainer.innerHTML = `<img src="${imageSrc}" alt="Preview"><button type="button" class="remove-image-btn" onclick="event.stopPropagation(); SettingsModule.removeServiceImage();">&times;</button>`;
    } else {
        previewContainer.innerHTML = `<i class="fas fa-image placeholder-icon"></i>`;
    }
}