import { 
    db, ref, onValue,
    storage, storageRef, getDownloadURL 
} from './firebase-config.js';

// عناصر DOM
const productsGrid = document.getElementById('productsGrid');
const categoriesList = document.getElementById('categoriesList');
const currentCategory = document.getElementById('currentCategory');
const notificationArea = document.getElementById('notificationArea');
const searchInput = document.getElementById('searchInput');

// متغيرات التطبيق
let allProducts = [];
let currentCategoryFilter = 'all';
let searchTimeout;

// إظهار إشعار
function showNotification(message, type = 'success') {
    // إزالة أي إشعارات سابقة
    const existingNotifications = notificationArea.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    notificationArea.appendChild(notification);
    
    // إضافة صوت نقر خفيف
    const clickSound = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQ=');
    clickSound.volume = 0.3;
    clickSound.play().catch(() => {});
    
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// تحميل المنتجات من Firebase
function loadProducts() {
    productsGrid.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <span>جاري تحميل المنتجات...</span>
        </div>
    `;
    
    const productsRef = ref(db, 'products');
    
    onValue(productsRef, (snapshot) => {
        allProducts = [];
        productsGrid.innerHTML = '';
        
        if (snapshot.exists()) {
            const products = snapshot.val();
            
            Object.keys(products).forEach(key => {
                allProducts.push({
                    id: key,
                    ...products[key]
                });
            });
            
            // عرض المنتجات بشكل عشوائي
            displayProducts(allProducts.sort(() => Math.random() - 0.5));
        } else {
            productsGrid.innerHTML = `
                <div class="loading">
                    <i class="fas fa-box-open" style="font-size: 48px;"></i>
                    <h3 style="margin-top: 20px; color: var(--dark-color);">لا توجد منتجات متاحة</h3>
                    <p style="color: var(--text-color); opacity: 0.7;">يمكنك إضافة منتجات من لوحة التحكم</p>
                </div>
            `;
        }
    }, (error) => {
        console.error('Error loading products:', error);
        productsGrid.innerHTML = `
            <div class="loading">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ff4081;"></i>
                <h3 style="margin-top: 20px; color: var(--dark-color);">حدث خطأ في تحميل المنتجات</h3>
                <p style="color: var(--text-color); opacity: 0.7;">يرجى المحاولة مرة أخرى</p>
            </div>
        `;
        showNotification('حدث خطأ في تحميل المنتجات', 'error');
    });
}

// عرض المنتجات (معدل لمنتجين في السطر)
function displayProducts(products) {
    const filteredProducts = currentCategoryFilter === 'all' 
        ? products 
        : products.filter(product => product.category === currentCategoryFilter);
    
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = `
            <div class="loading">
                <i class="fas fa-search" style="font-size: 48px; color: var(--primary-color);"></i>
                <h3 style="margin-top: 20px; color: var(--dark-color);">لا توجد منتجات</h3>
                <p style="color: var(--text-color); opacity: 0.7;">جرب البحث بكلمات أخرى</p>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = filteredProducts.map(product => `
        <div class="product-card" data-id="${product.id}" data-category="${product.category}">
            <div class="product-image-container" onclick="showProductModal('${product.id}')" role="button" tabindex="0" aria-label="عرض ${product.name}">
                ${product.images && product.images.length > 0 ? 
                    `<img src="${product.images[0]}" alt="${product.name}" class="product-image" loading="lazy">` :
                    `<div style="height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(45deg, #f7c6d6, #ff9ec0);">
                        <i class="fas fa-image" style="font-size: 32px; color: rgba(255, 255, 255, 0.8);"></i>
                    </div>`
                }
                ${product.images && product.images.length > 1 ? 
                    `<div class="multi-image-indicator" aria-label="${product.images.length} صور">
                        <i class="fas fa-images"></i>
                    </div>` : ''
                }
                ${product.category === 'offers' ? 
                    '<div class="offer-badge" aria-label="عرض خاص">عرض</div>' : ''}
            </div>
            <div class="product-info">
                <h3 class="product-title" onclick="showProductModal('${product.id}')" role="button" tabindex="0">
                    ${product.name}
                </h3>
                <p class="product-description">
                    ${(product.description || '').substring(0, 50)}${(product.description || '').length > 50 ? '...' : ''}
                </p>
                <div class="product-price">${product.price}</div>
                <div class="product-actions">
                    <button class="btn btn-whatsapp" onclick="buyOnWhatsApp('${product.id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.images ? product.images[0] : ''}')" aria-label="شراء ${product.name} عبر واتساب">
                        <i class="fab fa-whatsapp"></i> واتساب
                    </button>
                    <button class="btn btn-primary" onclick="addToCart('${product.id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.images ? product.images[0] : ''}')" aria-label="إضافة ${product.name} إلى السلة">
                        <i class="fas fa-cart-plus"></i> سلة
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // إضافة تأثير ظهور تدريجي
    const cards = productsGrid.querySelectorAll('.product-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// بقية الكود يبقى كما هو بدون تغيير...

// إعداد تصفية الأقسام
function setupCategoryFilters() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            // إزالة النشاط من جميع الأزرار
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            // إضافة النشاط للزر المحدد
            button.classList.add('active');
            
            // تحديث الفلتر الحالي
            currentCategoryFilter = button.dataset.category;
            
            // تحديث نص الفئة الحالية
            const categoryNames = {
                'all': 'جميع المنتجات',
                'shoes': 'الاحذيه',
                'clothes': 'الملابس',
                'accessories': 'الإكسسوارات',
                'small-items': 'الرفايع',
                'offers': 'العروض'
            };
            
            currentCategory.textContent = categoryNames[currentCategoryFilter] || 'المنتجات';
            
            // عرض المنتجات المفلترة
            displayProducts(allProducts);
            
            // إضافة تأثير صوتي
            const clickSound = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQ=');
            clickSound.volume = 0.2;
            clickSound.play().catch(() => {});
        });
    });
}

// إعداد البحث
function setupSearch() {
    const searchButton = document.querySelector('.search-box button');
    
    searchButton.addEventListener('click', performSearch);
    
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, 500);
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

// تنفيذ البحث
function performSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        displayProducts(allProducts);
        const categoryNames = {
            'all': 'جميع المنتجات',
            'shoes': 'الاحذيه',
            'clothes': 'الملابس',
            'accessories': 'الإكسسوارات',
            'small-items': 'الرفايع',
            'offers': 'العروض'
        };
        currentCategory.textContent = categoryNames[currentCategoryFilter] || 'المنتجات';
        return;
    }
    
    const filteredProducts = allProducts.filter(product => {
        return (
            product.name.toLowerCase().includes(searchTerm) ||
            (product.description && product.description.toLowerCase().includes(searchTerm)) ||
            (product.category && product.category.toLowerCase().includes(searchTerm))
        );
    });
    
    displayProducts(filteredProducts);
    const resultText = filteredProducts.length === 1 ? 'منتج' : 'منتجات';
    currentCategory.textContent = `نتائج البحث عن "${searchTerm}" (${filteredProducts.length} ${resultText})`;
}

// إضافة للسلة
window.addToCart = function(productId, productName, price, image) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // البحث عن المنتج في السلة
    const existingItemIndex = cart.findIndex(item => item.id === productId);
    
    if (existingItemIndex !== -1) {
        // إذا كان المنتج موجوداً، زيادة الكمية
        cart[existingItemIndex].quantity += 1;
    } else {
        // إذا كان المنتج غير موجود، إضافته
        cart.push({
            id: productId,
            name: productName,
            price: price,
            image: image,
            quantity: 1
        });
    }
    
    // حفظ السلة في localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // تحديث العداد
    updateCartCount();
    
    // إظهار إشعار
    showNotification(`تم إضافة "${productName}" إلى السلة`);
    
    // إضافة تأثير اهتزاز للزر
    const button = event.target.closest('button');
    if (button) {
        button.style.animation = 'pulse 0.3s ease';
        setTimeout(() => {
            button.style.animation = '';
        }, 300);
    }
}

// تحديث عداد السلة
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // تحديث جميع عدادات السلة في الصفحة
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(element => {
        element.textContent = totalItems;
    });
    
    // تحديث local storage للصفحات الأخرى
    localStorage.setItem('cartCount', totalItems);
}

// الشراء عبر واتساب
window.buyOnWhatsApp = function(productId, productName, price, image) {
    const phoneNumber = '+201208048922';
    const message = `مرحباً، أريد شراء المنتج:\n\n` +
                   `📦 المنتج: ${productName}\n` +
                   `💰 السعر: ${price} ج.م\n\n` +
                   `الاسم: _________\n` +
                   `العنوان: _________\n` +
                   `رقم الهاتف: _________`;
    
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    // فتح الواتساب في نافذة جديدة
    window.open(whatsappURL, '_blank');
    
    // تسجيل الحدث
    console.log('WhatsApp purchase initiated:', { productId, productName, price });
}

// عرض مودال المنتج
window.showProductModal = function(productId) {
    const product = allProducts.find(p => p.id === productId);
    
    if (!product) {
        showNotification('المنتج غير متوفر', 'error');
        return;
    }
    
    // إنشاء المودال
    const modalHTML = `
        <div class="modal-overlay" id="productModal" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>${product.name}</h3>
                    <button class="close-modal" onclick="closeProductModal()" aria-label="إغلاق">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="modal-image-container">
                        <img src="${product.images && product.images[0] ? product.images[0] : ''}" 
                             alt="${product.name}" 
                             class="modal-main-image" 
                             id="modalMainImage"
                             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23f7c6d6%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 font-size=%2216%22 fill=%22%238a5a7d%22>🛍️</text></svg>'">
                        
                        ${product.images && product.images.length > 1 ? `
                            <button class="modal-nav modal-prev" onclick="changeModalImage(-1)" aria-label="الصورة السابقة">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <button class="modal-nav modal-next" onclick="changeModalImage(1)" aria-label="الصورة التالية">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        ` : ''}
                    </div>
                    
                    ${product.images && product.images.length > 1 ? `
                        <div class="modal-thumbnails" id="modalThumbnails">
                            ${product.images.map((img, index) => `
                                <img src="${img}" 
                                     alt="صورة ${index + 1} لـ ${product.name}" 
                                     class="modal-thumbnail ${index === 0 ? 'active' : ''}"
                                     onclick="selectModalImage(${index})"
                                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%23f7c6d6%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 font-size=%2210%22 fill=%22%238a5a7d%22>${index + 1}</text></svg>'">
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <div style="margin-top: 20px;">
                        <h4 style="color: var(--dark-color); margin-bottom: 10px; font-size: 16px;">
                            <i class="fas fa-info-circle"></i> وصف المنتج
                        </h4>
                        <p style="line-height: 1.6; color: var(--text-color);">${product.description || 'لا يوجد وصف للمنتج'}</p>
                    </div>
                    
                    <div style="margin-top: 25px; display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                        <div class="product-price" style="font-size: 22px; margin: 0;">${product.price}</div>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button class="btn btn-whatsapp" onclick="buyOnWhatsApp('${product.id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.images ? product.images[0] : ''}')" style="flex: 1;">
                                <i class="fab fa-whatsapp"></i> شراء عبر واتساب
                            </button>
                            <button class="btn btn-primary" onclick="addToCart('${product.id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.images ? product.images[0] : ''}')" style="flex: 1;">
                                <i class="fas fa-cart-plus"></i> إضافة للسلة
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // إضافة المودال إلى body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // تخزين بيانات الصور للمودال
    if (product.images && product.images.length > 1) {
        window.currentProductImages = product.images;
        window.currentImageIndex = 0;
    }
    
    // إظهار المودال مع تأثير
    setTimeout(() => {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.style.display = 'flex';
        }
        
        // منع التمرير خلف المودال
        document.body.style.overflow = 'hidden';
    }, 10);
};

// التنقل بين صور المنتج في المودال
window.changeModalImage = function(direction) {
    if (!window.currentProductImages || window.currentProductImages.length === 0) return;
    
    window.currentImageIndex += direction;
    
    // تدوير الفهرس إذا تجاوز الحدود
    if (window.currentImageIndex < 0) {
        window.currentImageIndex = window.currentProductImages.length - 1;
    } else if (window.currentImageIndex >= window.currentProductImages.length) {
        window.currentImageIndex = 0;
    }
    
    updateModalImage();
};

window.selectModalImage = function(index) {
    window.currentImageIndex = index;
    updateModalImage();
};

function updateModalImage() {
    const mainImage = document.getElementById('modalMainImage');
    const thumbnails = document.querySelectorAll('.modal-thumbnail');
    
    if (mainImage && window.currentProductImages && window.currentProductImages[window.currentImageIndex]) {
        mainImage.style.opacity = '0';
        setTimeout(() => {
            mainImage.src = window.currentProductImages[window.currentImageIndex];
            mainImage.style.opacity = '1';
        }, 150);
    }
    
    thumbnails.forEach((thumb, index) => {
        thumb.classList.toggle('active', index === window.currentImageIndex);
    });
}

// إغلاق مودال المنتج
window.closeProductModal = function() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.animation = 'fadeIn 0.3s ease reverse';
        setTimeout(() => {
            modal.remove();
            window.currentProductImages = null;
            window.currentImageIndex = 0;
            
            // إعادة التمرير
            document.body.style.overflow = '';
        }, 300);
    }
};

// إغلاق المودال عند النقر خارج المحتوى
function closeModal(event) {
    if (event.target.classList.contains('modal-overlay')) {
        closeProductModal();
    }
}

// البحث من الزر
window.searchProducts = function() {
    performSearch();
};

// التهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupCategoryFilters();
    setupSearch();
    updateCartCount();
    
    // إضافة حدث لمس للهواتف
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        
        // إذا كانت المسافة كافية (سوايب)
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                // سوايب لليسار - عرض السلة
                const cartIcon = document.querySelector('.cart-icon');
                if (cartIcon) cartIcon.click();
            }
        }
    });
});

// جعل الدوال متاحة عالمياً
window.showNotification = showNotification;

window.searchProducts = performSearch;
