const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// На Vercel используем /tmp (единственная записываемая папка)
const DB_PATH = process.env.VERCEL
    ? '/tmp/dealership.db'
    : path.join(__dirname, 'dealership.db');
let db = null;

// Инициализация базы данных и создание таблиц 
function init() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Ошибка подключения к БД:', err);
                reject(err);
                return;
            }
            console.log('Подключение к SQLite базе данных установлено');
            createTables().then(resolve).catch(reject);
        });
    });
}

// Создание таблиц
function createTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Таблица автомобилей
            db.run(`CREATE TABLE IF NOT EXISTS cars (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                brand TEXT NOT NULL,
                model TEXT NOT NULL,
                year INTEGER NOT NULL,
                price REAL NOT NULL,
                color TEXT,
                mileage INTEGER DEFAULT 0,
                status TEXT DEFAULT 'available',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Ошибка создания таблицы cars:', err);
                    reject(err);
                    return;
                }
            });

            // Таблица клиентов
            db.run(`CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT,
                address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Ошибка создания таблицы clients:', err);
                    reject(err);
                    return;
                }
            });

            // Таблица продаж
            db.run(`CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                car_id INTEGER NOT NULL,
                client_id INTEGER NOT NULL,
                manager_id INTEGER,
                sale_date DATE NOT NULL,
                price REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (car_id) REFERENCES cars(id),
                FOREIGN KEY (client_id) REFERENCES clients(id),
                FOREIGN KEY (manager_id) REFERENCES users(id)
            )`, (err) => {
                if (err) {
                    console.error('Ошибка создания таблицы sales:', err);
                    reject(err);
                    return;
                }
                // Добавляем колонку manager_id если таблица уже существует
                db.run(`ALTER TABLE sales ADD COLUMN manager_id INTEGER`, (alterErr) => {
                    
                });
            });

            // Таблица пользователей
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'manager',
                email TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Ошибка создания таблицы users:', err);
                    reject(err);
                    return;
                }
            });

            // Таблица гарантийного обслуживания
            db.run(`CREATE TABLE IF NOT EXISTS warranty_services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER NOT NULL,
                car_id INTEGER NOT NULL,
                client_id INTEGER NOT NULL,
                issue_date DATE NOT NULL,
                description TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                repair_cost REAL DEFAULT 0,
                completion_date DATE,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sale_id) REFERENCES sales(id),
                FOREIGN KEY (car_id) REFERENCES cars(id),
                FOREIGN KEY (client_id) REFERENCES clients(id)
            )`);

            // Таблица актов осмотра при приеме авто
            db.run(`CREATE TABLE IF NOT EXISTS car_inspections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                car_id INTEGER NOT NULL,
                inspector_id INTEGER,
                inspection_date DATE NOT NULL,
                body_condition TEXT,
                interior_condition TEXT,
                engine_condition TEXT,
                suspension_condition TEXT,
                is_damaged BOOLEAN DEFAULT 0,
                damage_details TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (car_id) REFERENCES cars(id),
                FOREIGN KEY (inspector_id) REFERENCES users(id)
            )`);

            // Добавляем себестоимость в таблицу машин
            db.run(`ALTER TABLE cars ADD COLUMN purchase_price REAL DEFAULT 0`, (err) => {});

            // Таблица Тест-драйвов
            db.run(`CREATE TABLE IF NOT EXISTS test_drives (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                car_id INTEGER NOT NULL,
                client_id INTEGER NOT NULL,
                manager_id INTEGER,
                scheduled_at DATETIME NOT NULL,
                status TEXT DEFAULT 'scheduled',
                feedback TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (car_id) REFERENCES cars(id),
                FOREIGN KEY (client_id) REFERENCES clients(id),
                FOREIGN KEY (manager_id) REFERENCES users(id)
            )`, (err) => {
                if (err) {
                    console.error('Ошибка создания таблицы test_drives:', err);
                    reject(err);
                    return;
                }
                console.log('Таблицы базы данных созданы');
                insertInitialData().then(resolve).catch(reject);
            });
            
            // Добавляем колонки для Trade-in в таблицу продаж
            db.run(`ALTER TABLE sales ADD COLUMN is_trade_in BOOLEAN DEFAULT 0`, (err) => {});
            db.run(`ALTER TABLE sales ADD COLUMN trade_in_car_info TEXT`, (err) => {});
            db.run(`ALTER TABLE sales ADD COLUMN trade_in_discount REAL DEFAULT 0`, (err) => {});
        });
    });
}

// Добавление тестовых данных
function insertInitialData() {
    return new Promise((resolve, reject) => {
        // Проверяем пользователей (пароли будут созданы в server.js с bcrypt)
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            // Пропускаем создание пользователей здесь - они будут созданы в server.js
        });

        db.get("SELECT COUNT(*) as count FROM cars", (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (row.count === 0) {
                db.serialize(() => {
                    db.run(`INSERT INTO cars (brand, model, year, price, color, mileage, status) VALUES
                        ('Lada', 'Vesta', 2023, 1450000, 'Белый', 0, 'available'),
                        ('Lada', 'Granta', 2022, 900000, 'Черный', 15000, 'available'),
                        ('Haval', 'Jolion', 2023, 2200000, 'Серебристый', 0, 'available'),
                        ('Geely', 'Coolray', 2023, 2400000, 'Синий', 0, 'sold'),
                        ('Chery', 'Tiggo 7 Pro', 2023, 2600000, 'Красный', 0, 'sold'),
                        ('Toyota', 'Camry', 2023, 4500000, 'Белый', 0, 'available'),
                        ('BMW', 'X5', 2021, 8500000, 'Черный', 45000, 'available')`);
                    
                    // Добавим клиентов
                    db.run(`INSERT INTO clients (name, phone, email, address) VALUES
                        ('Александр Иванов', '+7 900 123 45 67', 'ivanov@mail.ru', 'Москва, ул. Пушкина, 10'),
                        ('Елена Петрова', '+7 911 222 33 44', 'elena@ya.ru', 'Санкт-Петербург, пр. Ленина, 25')`);
                    
                    // Инициализация тестовых данных при первом запуске
                    db.run(`INSERT INTO sales (car_id, client_id, manager_id, sale_date, price) VALUES
                        (4, 1, 2, date('now', '-2 month'), 2400000),
                        (5, 2, 2, date('now', '-1 month'), 2600000),
                        (5, 1, 2, date('now'), 2550000)`);
 
                    // Добавим акты осмотра
                    db.run(`INSERT INTO car_inspections (car_id, inspector_id, inspection_date, body_condition, interior_condition, engine_condition, suspension_condition, is_damaged) VALUES
                        (1, 1, date('now', '-5 day'), 'Отличное', 'Отличное', 'Исправен', 'Исправна', 0),
                        (2, 1, date('now', '-3 day'), 'Хорошее', 'Хорошее', 'Исправен', 'Есть замечания', 0),
                        (6, 1, date('now', '-1 day'), 'Отличное', 'Отличное', 'Исправен', 'Исправна', 0)`);

                    console.log('Инициализация базы данных завершена: тестовые данные добавлены');
                    resolve();
                });
            } else {
                // Если машины есть, но продаж нет - добавим продажи для графиков
                db.get("SELECT COUNT(*) as count FROM sales", (err, row) => {
                    if (row && row.count === 0) {
                        db.run(`INSERT INTO sales (car_id, client_id, manager_id, sale_date, price) VALUES
                            (1, 1, 2, date('now', '-2 month'), 1450000),
                            (2, 2, 2, date('now', '-1 month'), 900000),
                            (3, 1, 2, date('now'), 2200000)`);
                    }
                    resolve();
                });
            }
        });
    });
}

// ========== АВТОМОБИЛИ ==========
function getAllCars() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM cars ORDER BY created_at DESC", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getCarById(id) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM cars WHERE id = ?", [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function addCar(brand, model, year, price, color, mileage, status, purchase_price = 0) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO cars (brand, model, year, price, color, mileage, status, purchase_price) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [brand, model, year, price, color, mileage || 0, status || 'available', purchase_price],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
    });
}

function updateCar(id, brand, model, year, price, color, mileage, status, purchase_price = 0) {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE cars SET brand = ?, model = ?, year = ?, price = ?, 
                color = ?, mileage = ?, status = ?, purchase_price = ? WHERE id = ?`,
            [brand, model, year, price, color, mileage, status, purchase_price, id],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
    });
}

function deleteCar(id) {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM cars WHERE id = ?", [id], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

// ========== КЛИЕНТЫ ==========
function getAllClients() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM clients ORDER BY created_at DESC", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getClientById(id) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM clients WHERE id = ?", [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function addClient(name, phone, email, address) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO clients (name, phone, email, address) 
                VALUES (?, ?, ?, ?)`,
            [name, phone, email || null, address || null],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
    });
}

function updateClient(id, name, phone, email, address) {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE clients SET name = ?, phone = ?, email = ?, address = ? 
                WHERE id = ?`,
            [name, phone, email, address, id],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
    });
}

function deleteClient(id) {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM clients WHERE id = ?", [id], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

// ========== ПРОДАЖИ ==========
function getSaleById(id) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT s.*, 
                       c.brand || ' ' || c.model as car_name,
                       c.brand, c.model, c.year, c.color as car_color, c.mileage,
                       cl.name as client_name, cl.phone as client_phone, cl.address as client_address, cl.email as client_email,
                       u.full_name as manager_name
                FROM sales s
                LEFT JOIN cars c ON s.car_id = c.id
                LEFT JOIN clients cl ON s.client_id = cl.id
                LEFT JOIN users u ON s.manager_id = u.id
                WHERE s.id = ?`, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getAllSales() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT s.*, 
                       c.brand || ' ' || c.model as car_name, c.year, c.color as car_color, c.mileage,
                       cl.name as client_name, cl.phone as client_phone,
                       u.full_name as manager_name
                FROM sales s
                LEFT JOIN cars c ON s.car_id = c.id
                LEFT JOIN clients cl ON s.client_id = cl.id
                LEFT JOIN users u ON s.manager_id = u.id
                ORDER BY s.created_at DESC`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function addSale(car_id, client_id, manager_id, sale_date, price, is_trade_in = 0, trade_in_car_info = null, trade_in_discount = 0) {
    return new Promise((resolve, reject) => {
        // Обновляем статус автомобиля на "sold"
        db.run(`INSERT INTO sales (car_id, client_id, manager_id, sale_date, price, is_trade_in, trade_in_car_info, trade_in_discount) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [car_id, client_id, manager_id || null, sale_date, price, is_trade_in, trade_in_car_info, trade_in_discount],
            function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                const saleId = this.lastID;
                // Обновляем статус автомобиля
                db.run("UPDATE cars SET status = 'sold' WHERE id = ?", [car_id], (err) => {
                    if (err) reject(err);
                    else resolve(saleId);
                });
            });
    });
}

function deleteSale(id) {
    return new Promise((resolve, reject) => {
        // Получаем car_id перед удалением
        db.get("SELECT car_id FROM sales WHERE id = ?", [id], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            if (row) {
                // Удаляем продажу
                db.run("DELETE FROM sales WHERE id = ?", [id], function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    // Возвращаем статус автомобиля
                    db.run("UPDATE cars SET status = 'available' WHERE id = ?", [row.car_id], (err) => {
                        if (err) reject(err);
                        else resolve(this.changes);
                    });
                });
            } else {
                resolve(0);
            }
        });
    });
}

// ========== СТАТИСТИКА ==========
function getRoleDistribution() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT role, COUNT(*) as count FROM users GROUP BY role`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getBrandDistribution() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT c.brand, COUNT(s.id) as count 
                FROM sales s 
                JOIN cars c ON s.car_id = c.id 
                GROUP BY c.brand 
                ORDER BY count DESC`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getDashboardStats() {
    return new Promise((resolve, reject) => {
        const stats = {};
        
        // Общее количество автомобилей
        db.get("SELECT COUNT(*) as total FROM cars", [], (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            stats.totalCars = row.total;
            
            // Доступные автомобили
            db.get("SELECT COUNT(*) as available FROM cars WHERE status = 'available'", [], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                stats.availableCars = row.available;
                
                // Проданные автомобили
                db.get("SELECT COUNT(*) as sold FROM cars WHERE status = 'sold'", [], (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    stats.soldCars = row.sold;
                    
                    // Общее количество клиентов
                    db.get("SELECT COUNT(*) as total FROM clients", [], (err, row) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        stats.totalClients = row.total;
                        
                        // Общее количество продаж
                        db.get("SELECT COUNT(*) as total, COALESCE(SUM(price), 0) as revenue FROM sales", [], (err, row) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            stats.totalSales = row.total;
                            stats.totalRevenue = row.revenue || 0;
                            
                            // Продажи и выручка за текущий и прошлый месяц
                            db.get(`SELECT COUNT(*) as count, COALESCE(SUM(price), 0) as revenue 
                                    FROM sales 
                                    WHERE sale_date >= date('now', 'start of month')`, [], (err, monthRow) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                stats.monthlySales = monthRow.count || 0;
                                stats.monthlyRevenue = monthRow.revenue || 0;

                                db.get(`SELECT COUNT(*) as count, COALESCE(SUM(price), 0) as revenue 
                                        FROM sales 
                                        WHERE sale_date >= date('now', 'start of month', '-1 month') 
                                          AND sale_date < date('now', 'start of month')`, [], (err, prevMonthRow) => {
                                    if (err) {
                                        reject(err);
                                        return;
                                    }
                                    const prevMonthSales = prevMonthRow.count || 0;
                                    const prevMonthRevenue = prevMonthRow.revenue || 0;

                                    stats.monthlySalesChange = prevMonthSales > 0 
                                        ? Math.round(((stats.monthlySales - prevMonthSales) / prevMonthSales) * 100)
                                        : null;
                                    stats.monthlyRevenueChange = prevMonthRevenue > 0 
                                        ? Math.round(((stats.monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
                                        : null;

                                    // Продажи за неделю (активные сделки) и динамика
                                    db.get(`SELECT COUNT(*) as count FROM sales WHERE sale_date >= date('now', '-7 days')`, [], (err, weekRow) => {
                                        if (err) {
                                            reject(err);
                                            return;
                                        }
                                        stats.weeklySales = weekRow.count || 0;

                                        db.get(`SELECT COUNT(*) as count FROM sales 
                                                WHERE sale_date >= date('now', '-14 days') 
                                                  AND sale_date < date('now', '-7 days')`, [], (err, prevWeekRow) => {
                                            if (err) {
                                                reject(err);
                                                return;
                                            }
                                            const prevWeekSales = prevWeekRow.count || 0;
                                            stats.weeklySalesChange = prevWeekSales > 0 
                                                ? Math.round(((stats.weeklySales - prevWeekSales) / prevWeekSales) * 100)
                                                : null;

                                            // Новые клиенты за неделю и динамика
                                            db.get(`SELECT COUNT(*) as count FROM clients WHERE created_at >= date('now', '-7 days')`, [], (err, weekClients) => {
                                                if (err) {
                                                    reject(err);
                                                    return;
                                                }
                                                stats.weeklyNewClients = weekClients.count || 0;

                                                db.get(`SELECT COUNT(*) as count FROM clients 
                                                        WHERE created_at >= date('now', '-14 days') 
                                                          AND created_at < date('now', '-7 days')`, [], (err, prevWeekClients) => {
                                                    if (err) {
                                                        reject(err);
                                                        return;
                                                    }
                                                    const prevWeekClientsCount = prevWeekClients.count || 0;
                                                    stats.weeklyNewClientsChange = prevWeekClientsCount > 0
                                                        ? Math.round(((stats.weeklyNewClients - prevWeekClientsCount) / prevWeekClientsCount) * 100)
                                                        : null;

                                                    resolve(stats);
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

// ========== ПОЛЬЗОВАТЕЛИ ==========
function getUserByUsername(username) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getUserById(id) {
    return new Promise((resolve, reject) => {
        db.get("SELECT id, username, full_name, role, email, created_at FROM users WHERE id = ?", [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function createUser(username, passwordHash, fullName, role, email) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO users (username, password, full_name, role, email) 
                VALUES (?, ?, ?, ?, ?)`,
            [username, passwordHash, fullName, role, email || null],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
    });
}

function getAllUsers() {
    return new Promise((resolve, reject) => {
        db.all("SELECT id, username, full_name, role, email, created_at FROM users ORDER BY created_at DESC", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function deleteUser(id) {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

// ========== ГАРАНТИЙНОЕ ОБСЛУЖИВАНИЕ ==========
function getAllWarrantyServices() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT w.*,
                       s.sale_date,
                       c.brand || ' ' || c.model as car_name, c.color as car_color,
                       cl.name as client_name, cl.phone as client_phone
                FROM warranty_services w
                LEFT JOIN sales s ON w.sale_id = s.id
                LEFT JOIN cars c ON w.car_id = c.id
                LEFT JOIN clients cl ON w.client_id = cl.id
                ORDER BY w.created_at DESC`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getWarrantyServiceById(id) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT w.*,
                       s.sale_date,
                       c.brand || ' ' || c.model as car_name,
                       cl.name as client_name, cl.phone as client_phone
                FROM warranty_services w
                LEFT JOIN sales s ON w.sale_id = s.id
                LEFT JOIN cars c ON w.car_id = c.id
                LEFT JOIN clients cl ON w.client_id = cl.id
                WHERE w.id = ?`, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function addWarrantyService(sale_id, car_id, client_id, issue_date, description, status, repair_cost, notes) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO warranty_services (sale_id, car_id, client_id, issue_date, description, status, repair_cost, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [sale_id, car_id, client_id, issue_date, description, status || 'pending', repair_cost || 0, notes || null],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
    });
}

function updateWarrantyService(id, issue_date, description, status, repair_cost, completion_date, notes) {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE warranty_services SET issue_date = ?, description = ?, status = ?, 
                repair_cost = ?, completion_date = ?, notes = ? WHERE id = ?`,
            [issue_date, description, status, repair_cost || 0, completion_date || null, notes || null, id],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
    });
}

function deleteWarrantyService(id) {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM warranty_services WHERE id = ?", [id], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

// ========== АНАЛИТИКА ==========
function getSalesAnalytics() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT 
                    strftime('%Y-%m', sale_date) as month,
                    COUNT(*) as count
                FROM sales
                GROUP BY strftime('%Y-%m', sale_date)
                ORDER BY month ASC`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function getProfitAnalytics() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT 
                    strftime('%Y-%m', sale_date) as month,
                    SUM(price) as total
                FROM sales
                GROUP BY strftime('%Y-%m', sale_date)
                ORDER BY month ASC`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function getReports(startDate, endDate) {
    return new Promise((resolve, reject) => {
        let query = `SELECT 
                        s.*,
                        c.brand || ' ' || c.model as car_name,
                        c.purchase_price,
                        cl.name as client_name,
                        cl.phone as client_phone,
                        u.full_name as manager_name
                    FROM sales s
                    LEFT JOIN cars c ON s.car_id = c.id
                    LEFT JOIN clients cl ON s.client_id = cl.id
                    LEFT JOIN users u ON s.manager_id = u.id
                    WHERE 1=1`;
        const params = [];
        
        if (startDate) {
            query += ' AND s.sale_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND s.sale_date <= ?';
            params.push(endDate);
        }
        
        query += ' ORDER BY s.sale_date DESC';
        
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else {
                const totalRevenue = rows.reduce((sum, row) => sum + parseFloat((row.price || 0) - (row.trade_in_discount || 0)), 0);
                const totalPurchase = rows.reduce((sum, row) => sum + parseFloat(row.purchase_price || 0), 0);
                const totalProfit = totalRevenue - totalPurchase;
                resolve({ 
                    sales: rows || [], 
                    total: totalRevenue,
                    purchase: totalPurchase,
                    profit: totalProfit
                });
            }
        });
    });
}

// Прогнозирование трендовых автомобилей на следующий месяц
function getTrendPrediction() {
    return new Promise((resolve, reject) => {
        // Анализируем продажи за последние 3 месяца с разбивкой по месяцам
        db.all(`SELECT 
                    c.brand || ' ' || c.model as car_name,
                    c.id as car_id,
                    c.brand,
                    c.model,
                    strftime('%Y-%m', s.sale_date) as month,
                    COUNT(s.id) as month_sales
                FROM sales s
                LEFT JOIN cars c ON s.car_id = c.id
                WHERE s.sale_date >= date('now', '-3 months')
                GROUP BY c.id, c.brand, c.model, strftime('%Y-%m', s.sale_date)
                ORDER BY c.id, month`, [], (err, monthRows) => {
            if (err) {
                reject(err);
                return;
            }
            
            // Получаем общую статистику по автомобилям
            db.all(`SELECT 
                        c.brand || ' ' || c.model as car_name,
                        c.id as car_id,
                        c.brand,
                        c.model,
                        COUNT(s.id) as sales_count,
                        SUM(s.price) as total_revenue,
                        AVG(s.price) as avg_price
                    FROM sales s
                    LEFT JOIN cars c ON s.car_id = c.id
                    WHERE s.sale_date >= date('now', '-3 months')
                    GROUP BY c.id, c.brand, c.model
                    ORDER BY sales_count DESC, total_revenue DESC
                    LIMIT 10`, [], (err2, rows) => {
                if (err2) {
                    reject(err2);
                    return;
                }
                
                // Группируем данные по месяцам для анализа роста
                const monthlyData = {};
                (monthRows || []).forEach(row => {
                    if (!monthlyData[row.car_id]) {
                        monthlyData[row.car_id] = [];
                    }
                    monthlyData[row.car_id].push({
                        month: row.month,
                        sales: row.month_sales
                    });
                });
                
                // Вычисляем тренд с учетом динамики роста
                const predictions = (rows || []).map(car => {
                    const monthly = monthlyData[car.car_id] || [];
                    monthly.sort((a, b) => a.month.localeCompare(b.month));
                    
                    // Вычисляем рост продаж
                    let growthRate = 0;
                    if (monthly.length >= 2) {
                        const recent = monthly[monthly.length - 1].sales;
                        const previous = monthly[monthly.length - 2].sales;
                        if (previous > 0) {
                            growthRate = ((recent - previous) / previous) * 100;
                        }
                    }
                    
                    // Комплексный алгоритм: учитываем количество продаж, выручку и рост
                    const trendScore = car.sales_count * 2 + 
                                     (car.total_revenue / 1000000) + 
                                     (growthRate > 0 ? growthRate * 0.5 : 0);
                    
                    return {
                        ...car,
                        growthRate: Math.round(growthRate * 10) / 10,
                        trendScore: Math.round(trendScore * 10) / 10,
                        prediction: trendScore > 10 ? 'Высокий' : trendScore > 5 ? 'Средний' : 'Низкий'
                    };
                });
                
                // Сортируем по тренду и берем топ-5
                predictions.sort((a, b) => b.trendScore - a.trendScore);
                resolve(predictions.slice(0, 5));
            });
        });
    });
}

// Статистика продаж по менеджерам
function getManagerStats() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT 
                    u.id as manager_id,
                    u.full_name as manager_name,
                    u.role,
                    strftime('%Y-%m', s.sale_date) as month,
                    COUNT(s.id) as sales_count,
                    SUM(s.price) as total_revenue,
                    AVG(s.price) as avg_sale_price
                FROM sales s
                LEFT JOIN users u ON s.manager_id = u.id
                WHERE s.manager_id IS NOT NULL
                    AND s.sale_date >= date('now', '-6 months')
                GROUP BY u.id, u.full_name, u.role, strftime('%Y-%m', s.sale_date)
                ORDER BY month DESC, total_revenue DESC`, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                // Группируем по менеджерам
                const managerMap = {};
                (rows || []).forEach(row => {
                    if (!managerMap[row.manager_id]) {
                        managerMap[row.manager_id] = {
                            id: row.manager_id,
                            name: row.manager_name,
                            role: row.role,
                            months: []
                        };
                    }
                    managerMap[row.manager_id].months.push({
                        month: row.month,
                        salesCount: row.sales_count,
                        totalRevenue: row.total_revenue,
                        avgSalePrice: row.avg_sale_price
                    });
                });
                resolve(Object.values(managerMap));
            }
        });
    });
}

// ========== АКТЫ ОСМОТРА ==========
function getAllInspections() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT i.*, 
                       c.brand || ' ' || c.model as car_name, c.year as car_year,
                       u.full_name as inspector_name
                FROM car_inspections i
                LEFT JOIN cars c ON i.car_id = c.id
                LEFT JOIN users u ON i.inspector_id = u.id
                ORDER BY i.inspection_date DESC`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getInspectionById(id) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT i.*, 
                       c.brand, c.model, c.year, c.color, c.mileage,
                       u.full_name as inspector_name
                FROM car_inspections i
                LEFT JOIN cars c ON i.car_id = c.id
                LEFT JOIN users u ON i.inspector_id = u.id
                WHERE i.id = ?`, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function addInspection(car_id, inspector_id, inspection_date, body_condition, interior_condition, engine_condition, suspension_condition, is_damaged, damage_details, notes) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO car_inspections (car_id, inspector_id, inspection_date, body_condition, interior_condition, engine_condition, suspension_condition, is_damaged, damage_details, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [car_id, inspector_id, inspection_date, body_condition, interior_condition, engine_condition, suspension_condition, is_damaged, damage_details, notes],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
    });
}

// ========== ТЕСТ-ДРАЙВЫ ==========
function getAllTestDrives() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT td.*, 
                       c.brand || ' ' || c.model as car_name,
                       cl.name as client_name,
                       u.full_name as manager_name
                FROM test_drives td
                LEFT JOIN cars c ON td.car_id = c.id
                LEFT JOIN clients cl ON td.client_id = cl.id
                LEFT JOIN users u ON td.manager_id = u.id
                ORDER BY td.scheduled_at DESC`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function addTestDrive(car_id, client_id, manager_id, scheduled_at, status = 'scheduled') {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO test_drives (car_id, client_id, manager_id, scheduled_at, status) 
                VALUES (?, ?, ?, ?, ?)`,
            [car_id, client_id, manager_id, scheduled_at, status],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
    });
}

function updateTestDriveStatus(id, status, feedback = null) {
    return new Promise((resolve, reject) => {
        db.run("UPDATE test_drives SET status = ?, feedback = ? WHERE id = ?",
            [status, feedback, id],
            (err) => {
                if (err) reject(err);
                else resolve();
            });
    });
}

module.exports = {
    init,
    getAllCars,
    getCarById,
    addCar,
    updateCar,
    deleteCar,
    getAllClients,
    getClientById,
    addClient,
    updateClient,
    deleteClient,
    getAllSales,
    getSaleById,
    addSale,
    deleteSale,
    getDashboardStats,
    getAllWarrantyServices,
    getWarrantyServiceById,
    addWarrantyService,
    updateWarrantyService,
    deleteWarrantyService,
    getUserByUsername,
    getUserById,
    createUser,
    getAllUsers,
    deleteUser,
    getSalesAnalytics,
    getProfitAnalytics,
    getReports,
    getTrendPrediction,
    getManagerStats,
    getBrandDistribution,
    getRoleDistribution,
    getAllInspections,
    getInspectionById,
    addInspection,
    getAllTestDrives,
    addTestDrive,
    updateTestDriveStatus
};

