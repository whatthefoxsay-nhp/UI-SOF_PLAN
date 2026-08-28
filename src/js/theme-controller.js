/**
 * THEME CONTROLLER
 * Quản lý việc chuyển đổi giữa các theme
 */

class ThemeController {
  constructor() {
    this.currentTheme = this.getCurrentTheme();
    this.init();
  }

  /**
   * Khởi tạo theme controller
   */
  init() {
    // Áp dụng theme đã lưu hoặc theme mặc định
    this.applyTheme(this.currentTheme);
    
    // Lắng nghe sự kiện chuyển đổi theme
    this.setupEventListeners();
  }

  /**
   * Lấy theme hiện tại từ localStorage
   */
  getCurrentTheme() {
    return localStorage.getItem('app-theme') || 'default';
  }

  /**
   * Áp dụng theme
   * @param {string} themeName - Tên theme ('default', 'theme-1', etc.)
   */
  applyTheme(themeName) {
    const body = document.body;
    
    // Xóa tất cả class theme cũ
    this.removeAllThemeClasses(body);
    
    // Thêm class theme mới (nếu không phải default)
    if (themeName !== 'default') {
      body.classList.add(themeName);
    }
    
    // Lưu theme vào localStorage
    localStorage.setItem('app-theme', themeName);
    this.currentTheme = themeName;
    
    // Trigger event cho các component khác
    this.triggerThemeChangeEvent(themeName);
    
    console.log(`Theme changed to: ${themeName}`);
  }

  /**
   * Xóa tất cả class theme
   */
  removeAllThemeClasses(element) {
    const themeClasses = ['theme-1', 'theme-dark', 'theme-cafe'];
    themeClasses.forEach(className => {
      element.classList.remove(className);
    });
  }

  /**
   * Trigger custom event khi theme thay đổi
   */
  triggerThemeChangeEvent(themeName) {
    const event = new CustomEvent('themeChanged', {
      detail: { theme: themeName }
    });
    document.dispatchEvent(event);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Lắng nghe click từ theme selector
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-theme]')) {
        const themeName = e.target.getAttribute('data-theme');
        this.applyTheme(themeName);
      }
    });

    // Lắng nghe keyboard shortcut (Ctrl + T để toggle theme)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        this.toggleTheme();
      }
    });
  }

  /**
   * Toggle giữa default và theme-1
   */
  toggleTheme() {
    const newTheme = this.currentTheme === 'default' ? 'theme-1' : 'default';
    this.applyTheme(newTheme);
  }

  /**
   * Lấy danh sách tất cả theme có sẵn
   */
  getAvailableThemes() {
    return [
      {
        name: 'default',
        label: 'Blue Ocean',
        description: 'Theme mặc định với tone xanh dương hiện đại',
        colors: ['#197dd3', '#77d4fb', '#bdbcc4', '#4b4344']
      },
      {
        name: 'theme-1',
        label: 'Cafe Classic',
        description: 'Theme truyền thống với tone nâu cafe',
        colors: ['#8B4513', '#D2B48C', '#5D2F0A', '#F4A460']
      }
    ];
  }

  /**
   * Tạo theme selector UI
   */
  createThemeSelector() {
    const themes = this.getAvailableThemes();
    const container = document.createElement('div');
    container.className = 'theme-selector';
    container.innerHTML = `
      <div class="theme-selector-header">
        <h3>Chọn Theme</h3>
        <span class="theme-selector-shortcut">Ctrl + T để toggle</span>
      </div>
      <div class="theme-selector-grid">
        ${themes.map(theme => `
          <div class="theme-option ${theme.name === this.currentTheme ? 'active' : ''}" 
               data-theme="${theme.name}">
            <div class="theme-preview">
              ${theme.colors.map(color => `<div class="color-dot" style="background: ${color}"></div>`).join('')}
            </div>
            <div class="theme-info">
              <h4>${theme.label}</h4>
              <p>${theme.description}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    return container;
  }
}

// Khởi tạo theme controller khi DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  window.themeController = new ThemeController();
});

// Export cho sử dụng trong module khác
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeController;
}
