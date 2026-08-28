// Database helper functions để kết nối và thao tác với database
import Database from "better-sqlite3";
import path from "path";

class DatabaseHelper {
  constructor() {
    this.dbPath = path.join(process.cwd(), "data", "cafe.db");
    this.db = null;
  }

  // Khởi tạo kết nối database
  init() {
    try {
      this.db = new Database(this.dbPath);
      this.createTables();
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  // Tạo các bảng cần thiết
  createTables() {
    const tables = {
      // Bảng tài khoản người dùng
      users: `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          full_name TEXT NOT NULL,
          email TEXT,
          role TEXT NOT NULL DEFAULT 'nhan_vien',
          status TEXT NOT NULL DEFAULT 'hoat_dong',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,

      // Bảng sản phẩm
      products: `
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          unit TEXT NOT NULL,
          cost_price REAL NOT NULL DEFAULT 0,
          selling_price REAL NOT NULL DEFAULT 0,
          stock_quantity INTEGER NOT NULL DEFAULT 0,
          min_stock INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'con_hang',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,

      // Bảng khách hàng
      customers: `
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          address TEXT,
          customer_type TEXT DEFAULT 'thuong',
          total_spent REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,

      // Bảng hóa đơn
      invoices: `
        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_number TEXT UNIQUE NOT NULL,
          customer_id INTEGER,
          staff_id INTEGER,
          invoice_date DATE NOT NULL,
          total_amount REAL NOT NULL DEFAULT 0,
          discount_amount REAL DEFAULT 0,
          tax_amount REAL DEFAULT 0,
          final_amount REAL NOT NULL DEFAULT 0,
          paid_amount REAL DEFAULT 0,
          payment_method TEXT DEFAULT 'tien_mat',
          status TEXT DEFAULT 'chua_thanh_toan',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (staff_id) REFERENCES users(id)
        )
      `,

      // Bảng chi tiết hóa đơn
      invoice_items: `
        CREATE TABLE IF NOT EXISTS invoice_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          total_price REAL NOT NULL,
          FOREIGN KEY (invoice_id) REFERENCES invoices(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `,

      // Bảng ca làm việc
      work_shifts: `
        CREATE TABLE IF NOT EXISTS work_shifts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          shift_name TEXT NOT NULL,
          work_date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          actual_hours REAL,
          hourly_rate REAL NOT NULL,
          total_salary REAL,
          status TEXT DEFAULT 'chua_lam',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `,

      // Bảng lương
      salaries: `
        CREATE TABLE IF NOT EXISTS salaries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          salary_month TEXT NOT NULL,
          base_salary REAL NOT NULL DEFAULT 0,
          position_allowance REAL DEFAULT 0,
          other_allowance REAL DEFAULT 0,
          overtime_pay REAL DEFAULT 0,
          bonus REAL DEFAULT 0,
          deduction REAL DEFAULT 0,
          advance_payment REAL DEFAULT 0,
          net_salary REAL NOT NULL DEFAULT 0,
          work_days INTEGER DEFAULT 0,
          overtime_hours REAL DEFAULT 0,
          status TEXT DEFAULT 'chua_thanh_toan',
          payment_date DATE,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `,

      // Bảng thu chi
      cash_flow: `
        CREATE TABLE IF NOT EXISTS cash_flow (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          voucher_number TEXT UNIQUE NOT NULL,
          voucher_type TEXT NOT NULL, -- 'thu' or 'chi'
          voucher_date DATE NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          amount REAL NOT NULL,
          payer TEXT,
          recipient TEXT,
          payment_method TEXT DEFAULT 'tien_mat',
          status TEXT DEFAULT 'cho_duyet',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,

      // Bảng nhập xuất kho
      inventory_transactions: `
        CREATE TABLE IF NOT EXISTS inventory_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          transaction_type TEXT NOT NULL, -- 'nhap' or 'xuat'
          quantity INTEGER NOT NULL,
          unit_price REAL,
          total_value REAL,
          transaction_date DATE NOT NULL,
          reference_number TEXT,
          reason TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `,

      // Bảng cài đặt hệ thống
      system_settings: `
        CREATE TABLE IF NOT EXISTS system_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          setting_key TEXT UNIQUE NOT NULL,
          setting_value TEXT,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
    };

    // Tạo các bảng
    Object.entries(tables).forEach(([tableName, createSQL]) => {
      try {
        this.db.exec(createSQL);
        console.log(`Table ${tableName} created/verified successfully`);
      } catch (error) {
        console.error(`Error creating table ${tableName}:`, error);
      }
    });

    // Thêm dữ liệu mặc định
    this.insertDefaultData();
  }

  // Thêm dữ liệu mặc định
  insertDefaultData() {
    try {
      // Thêm tài khoản admin mặc định
      const adminExists = this.db
        .prepare("SELECT id FROM users WHERE username = ?")
        .get("admin");
      if (!adminExists) {
        this.db
          .prepare(
            `
          INSERT INTO users (username, password, full_name, email, role)
          VALUES (?, ?, ?, ?, ?)
        `
          )
          .run("admin", "admin123", "Quản trị viên", "admin@pmbh.vn", "admin");
      }

      // Thêm cài đặt mặc định
      const defaultSettings = [
        ["store_name", "Cửa hàng ABC", "Tên cửa hàng"],
        ["store_address", "123 Đường ABC, Quận 1, TP.HCM", "Địa chỉ cửa hàng"],
        ["store_phone", "0901234567", "Số điện thoại cửa hàng"],
        ["vat_rate", "10", "Thuế suất VAT (%)"],
        ["auto_print_invoice", "true", "Tự động in hóa đơn"],
        ["allow_return", "true", "Cho phép trả hàng"],
        ["return_days", "7", "Số ngày cho phép trả hàng"],
      ];

      const settingExists = this.db.prepare(
        "SELECT setting_key FROM system_settings WHERE setting_key = ?"
      );
      const insertSetting = this.db.prepare(
        "INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)"
      );

      defaultSettings.forEach(([key, value, description]) => {
        if (!settingExists.get(key)) {
          insertSetting.run(key, value, description);
        }
      });

      console.log("Default data inserted successfully");
    } catch (error) {
      console.error("Error inserting default data:", error);
    }
  }

  // Các phương thức CRUD cơ bản

  // Users
  createUser(userData) {
    const stmt = this.db.prepare(`
      INSERT INTO users (username, password, full_name, email, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      userData.username,
      userData.password,
      userData.full_name,
      userData.email,
      userData.role,
      userData.status
    );
  }

  getUserByUsername(username) {
    return this.db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username);
  }

  getAllUsers() {
    return this.db
      .prepare("SELECT * FROM users ORDER BY created_at DESC")
      .all();
  }

  updateUser(id, userData) {
    const stmt = this.db.prepare(`
      UPDATE users 
      SET username = ?, full_name = ?, email = ?, role = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(
      userData.username,
      userData.full_name,
      userData.email,
      userData.role,
      userData.status,
      id
    );
  }

  deleteUser(id) {
    return this.db.prepare("DELETE FROM users WHERE id = ?").run(id);
  }

  // Products
  createProduct(productData) {
    const stmt = this.db.prepare(`
      INSERT INTO products (product_code, name, category, unit, cost_price, selling_price, stock_quantity, min_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      productData.product_code,
      productData.name,
      productData.category,
      productData.unit,
      productData.cost_price,
      productData.selling_price,
      productData.stock_quantity,
      productData.min_stock
    );
  }

  getAllProducts() {
    return this.db.prepare("SELECT * FROM products ORDER BY name").all();
  }

  updateProduct(id, productData) {
    const stmt = this.db.prepare(`
      UPDATE products 
      SET product_code = ?, name = ?, category = ?, unit = ?, cost_price = ?, selling_price = ?, 
          stock_quantity = ?, min_stock = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(
      productData.product_code,
      productData.name,
      productData.category,
      productData.unit,
      productData.cost_price,
      productData.selling_price,
      productData.stock_quantity,
      productData.min_stock,
      id
    );
  }

  updateProductStock(id, quantity, operation = "set") {
    let stmt;
    if (operation === "add") {
      stmt = this.db.prepare(
        "UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      );
    } else if (operation === "subtract") {
      stmt = this.db.prepare(
        "UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      );
    } else {
      stmt = this.db.prepare(
        "UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      );
    }
    return stmt.run(quantity, id);
  }

  // Customers
  createCustomer(customerData) {
    const stmt = this.db.prepare(`
      INSERT INTO customers (name, phone, email, address, customer_type)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(
      customerData.name,
      customerData.phone,
      customerData.email,
      customerData.address,
      customerData.customer_type
    );
  }

  getAllCustomers() {
    return this.db.prepare("SELECT * FROM customers ORDER BY name").all();
  }

  // Invoices
  createInvoice(invoiceData) {
    const stmt = this.db.prepare(`
      INSERT INTO invoices (invoice_number, customer_id, staff_id, invoice_date, total_amount, discount_amount, 
                           tax_amount, final_amount, paid_amount, payment_method, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      invoiceData.invoice_number,
      invoiceData.customer_id,
      invoiceData.staff_id,
      invoiceData.invoice_date,
      invoiceData.total_amount,
      invoiceData.discount_amount,
      invoiceData.tax_amount,
      invoiceData.final_amount,
      invoiceData.paid_amount,
      invoiceData.payment_method,
      invoiceData.status,
      invoiceData.notes
    );
  }

  getAllInvoices() {
    return this.db
      .prepare(
        `
      SELECT i.*, c.name as customer_name, u.full_name as staff_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN users u ON i.staff_id = u.id
      ORDER BY i.created_at DESC
    `
      )
      .all();
  }

  // System Settings
  getSetting(key) {
    const result = this.db
      .prepare(
        "SELECT setting_value FROM system_settings WHERE setting_key = ?"
      )
      .get(key);
    return result ? result.setting_value : null;
  }

  setSetting(key, value) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO system_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    return stmt.run(key, value);
  }

  getAllSettings() {
    return this.db.prepare("SELECT * FROM system_settings").all();
  }

  // Đóng kết nối database
  close() {
    if (this.db) {
      this.db.close();
      console.log("Database connection closed");
    }
  }

  // Sao lưu database
  backup(backupPath) {
    try {
      this.db.backup(backupPath);
      console.log(`Database backed up to ${backupPath}`);
      return true;
    } catch (error) {
      console.error("Error backing up database:", error);
      return false;
    }
  }
}

// Export singleton instance
const dbHelper = new DatabaseHelper();
export default dbHelper;
