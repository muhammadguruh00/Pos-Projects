// enhanced-interactivity.js
// File tambahan untuk meningkatkan interaktivitas

const EnhancedInteractivity = (function() {
  
  // Touch gesture support for mobile
  function initTouchGestures() {
    let startX, startY;
    
    document.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchend', function(e) {
      if (!startX || !startY) return;
      
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const diffX = startX - endX;
      const diffY = startY - endY;
      
      // Swipe left/right to navigate between filter tabs on mobile
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        const currentFilter = document.querySelector('.filter-tab.active');
        const allTabs = Array.from(document.querySelectorAll('.filter-tab'));
        const currentIndex = allTabs.indexOf(currentFilter);
        
        if (diffX > 0 && currentIndex < allTabs.length - 1) {
          // Swipe left - go to next tab
          allTabs[currentIndex + 1].click();
        } else if (diffX < 0 && currentIndex > 0) {
          // Swipe right - go to previous tab
          allTabs[currentIndex - 1].click();
        }
      }
    }, { passive: true });
  }
  
  // Keyboard navigation enhancements
  function initKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
      // ESC key to close modals
      if (e.key === 'Escape') {
        const openModal = document.querySelector('.modal[style*="display: block"]');
        if (openModal) {
          UIService.hideModal(openModal.id);
        }
      }
      
      // Enter key to add product when focused
      if (e.key === 'Enter' && e.target.classList.contains('product-card')) {
        const productId = parseInt(e.target.dataset.productId);
        ProductService.addProductToCart(productId);
      }
    });
  }
  
  // Improved loading states
  function showButtonLoading(button) {
    button.disabled = true;
    button.classList.add('btn-loading');
  }
  
  function hideButtonLoading(button) {
    button.disabled = false;
    button.classList.remove('btn-loading');
  }
  
  // Enhanced search with debouncing
    function initEnhancedSearch() {
    let searchTimeout;
    const searchBar = document.getElementById('searchBar');
    
    searchBar.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        
        // Show loading state
        searchBar.classList.add('search-loading');
        
        searchTimeout = setTimeout(() => {
            const currentState = AppState.getState();
            AppState.updateState({ 
                ui: { 
                    ...currentState.ui, 
                    searchTerm: e.target.value, 
                    currentPage: 1 
                } 
            });
        
        searchBar.classList.remove('search-loading');
        }, 300);
    });
}
  
  // Quick actions for product cards (long press on mobile)
  function initQuickActions() {
    let pressTimer;
    
    document.addEventListener('touchstart', function(e) {
      const productCard = e.target.closest('.product-card');
      if (productCard && !productCard.classList.contains('out-of-stock')) {
        pressTimer = setTimeout(() => {
          showQuickActionMenu(productCard);
        }, 500);
      }
    }, { passive: true });
    
    document.addEventListener('touchend', function() {
      clearTimeout(pressTimer);
    }, { passive: true });
    
    document.addEventListener('touchmove', function() {
      clearTimeout(pressTimer);
    }, { passive: true });
  }
  
  function showQuickActionMenu(productCard) {
    // Create a quick action menu for the product
    const productId = parseInt(productCard.dataset.productId);
    const product = AppState.getState().products.find(p => p.id === productId);
    
    if (!product) return;
    
    const menu = document.createElement('div');
    menu.className = 'quick-action-menu';
    menu.innerHTML = `
      <button onclick="ProductService.addProductToCart(${productId}); this.parentElement.remove()">
        <i class="fas fa-cart-plus"></i> Tambah ke Keranjang
      </button>
      ${product.type === 'product' ? `
        <button onclick="SettingsModule.showAddStockModal(${productId}); this.parentElement.remove()">
          <i class="fas fa-boxes"></i> Kelola Stok
        </button>
      ` : ''}
      <button onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i> Tutup
      </button>
    `;
    
    // Position and style the menu
    const rect = productCard.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.top + window.scrollY}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;
    menu.style.zIndex = '10000';
    menu.style.background = 'white';
    menu.style.border = '1px solid #ddd';
    menu.style.borderRadius = '8px';
    menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    menu.style.overflow = 'hidden';
    
    menu.querySelectorAll('button').forEach(btn => {
      btn.style.display = 'block';
      btn.style.width = '100%';
      btn.style.padding = '0.8rem 1rem';
      btn.style.border = 'none';
      btn.style.background = 'none';
      btn.style.textAlign = 'left';
      btn.style.cursor = 'pointer';
      btn.style.transition = 'background-color 0.2s';
      
      btn.addEventListener('mouseenter', function() {
        this.style.backgroundColor = '#f5f5f5';
      });
      
      btn.addEventListener('mouseleave', function() {
        this.style.backgroundColor = 'transparent';
      });
    });
    
    // Close menu when clicking outside
    const closeMenu = function(e) {
      if (!menu.contains(e.target) && !productCard.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
    
    document.body.appendChild(menu);
  }
  
  // Initialize all enhancements
  function init() {
    try {
        if ('ontouchstart' in window) {
            initTouchGestures();
            initQuickActions();
        }
        
        initKeyboardNavigation();
        initEnhancedSearch();
        
        // Add subtle animation to toast notifications
        const originalShowToast = UIService.showToast;
        UIService.showToast = function(message, type = 'success') {
            originalShowToast.call(this, message, type);
            
            // Add subtle bounce animation dengan error handling
            try {
                const toast = document.getElementById('toast');
                if (toast) {
                    toast.style.animation = 'none';
                    setTimeout(() => {
                        toast.style.animation = 'toastBounce 0.5s ease';
                    }, 10);
                }
            } catch (error) {
                console.warn('Toast animation error:', error);
            }
        };
    } catch (error) {
        console.error('EnhancedInteractivity init error:', error);
    }
}
  
  return {
    init,
    showButtonLoading,
    hideButtonLoading
  };
})();

// Add the bounce animation for toasts
const toastBounceStyle = document.createElement('style');
toastBounceStyle.textContent = `
  @keyframes toastBounce {
    0%, 20%, 53%, 80%, 100% {
      transform: translateX(0);
    }
    40%, 43% {
      transform: translateX(-10px);
    }
    70% {
      transform: translateX(-5px);
    }
    90% {
      transform: translateX(-2px);
    }
  }
`;
document.head.appendChild(toastBounceStyle);

// Initialize enhanced interactivity when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  EnhancedInteractivity.init();
});
