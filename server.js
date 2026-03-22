const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./database/db');

const app = express();
const PORT = 3000;

// Настройка EJS
const viewsPath = path.join(__dirname, 'views');
app.set('view engine', 'ejs');
app.set('views', viewsPath);


app.use(session({
    secret: 'car-dealership-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 часа
}));

// Middleware для правильной работы include в EJS
app.use((req, res, next) => {
    res.locals.basedir = viewsPath;
    res.locals.user = req.session.user || null;
    next();
});

// Middleware для парсинга тела запроса
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Создание пользователей по умолчанию
async function createDefaultUsers() {
    try {
        const users = await db.getAllUsers();
        if (users.length === 0) {
            const adminHash = await bcrypt.hash('admin123', 10);
            const managerHash = await bcrypt.hash('manager123', 10);
            const supervisorHash = await bcrypt.hash('supervisor123', 10);

            await db.createUser('admin', adminHash, 'Администратор Системы', 'admin', 'admin@dealership.ru');
            await db.createUser('manager', managerHash, 'Иван Петров', 'manager', 'manager@dealership.ru');
            await db.createUser('supervisor', supervisorHash, 'Мария Сидорова', 'supervisor', 'supervisor@dealership.ru');
            
            console.log('Пользователи по умолчанию созданы:');
            console.log('admin / admin123 (Администратор)');
            console.log('manager / manager123 (Менеджер)');
            console.log('supervisor / supervisor123 (Руководитель)');
        }
        return Promise.resolve();
    } catch (error) {
        console.error('Ошибка создания пользователей:', error);
        return Promise.reject(error);
    }
}

// Middleware для проверки аутентификации
function requireAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Middleware для проверки ролей
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        if (roles.includes(req.session.user.role)) {
            next();
        } else {
            res.status(403).send('Доступ запрещен');
        }
    };
}

// ========== АУТЕНТИФИКАЦИЯ ==========
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('auth/login', { error: null });
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await db.getUserByUsername(username);
        
        if (!user) {
            return res.render('auth/login', { error: 'Неверный логин или пароль' });
        }
        
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.render('auth/login', { error: 'Неверный логин или пароль' });
        }
        
        req.session.user = {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role,
            email: user.email
        };
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.render('auth/login', { error: 'Ошибка входа в систему' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Применяем аутентификацию ко всем маршрутам кроме логина и статических файлов
app.use((req, res, next) => {
    // Пропускаем статические файлы, логин и logout
    if (req.path === '/login' || 
        req.path === '/logout' ||
        req.path.startsWith('/css/') || 
        req.path.startsWith('/js/') ||
        req.path.includes('.')) {
        return next();
    }
    requireAuth(req, res, next);
});

// ========== ОСНОВНЫЕ МАРШРУТЫ ==========
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// Dashboard с аналитикой
app.get('/dashboard', async (req, res) => {
    try {
        const stats = await db.getDashboardStats();
        const salesData = await db.getSalesAnalytics();
        const profitData = await db.getProfitAnalytics();
        const trendPrediction = await db.getTrendPrediction();
        const managerStats = await db.getManagerStats();
        res.render('dashboard', { 
            stats, 
            salesData, 
            profitData,
            trendPrediction,
            managerStats,
            currentPage: 'dashboard',
            user: req.session.user 
        });
    } catch (error) {
        console.error('Ошибка загрузки dashboard:', error);
        res.render('dashboard', { 
            stats: null, 
            salesData: null,
            profitData: null,
            trendPrediction: null,
            managerStats: null,
            error: error.message,
            currentPage: 'dashboard',
            user: req.session.user 
        });
    }
});

// ========== АВТОМОБИЛИ ==========
app.get('/cars', async (req, res) => {
    try {
        const cars = await db.getAllCars();// вызов функции БД
        res.render('cars/index', { cars, currentPage: 'cars', user: req.session.user });
    } catch (error) {
        console.error('Ошибка загрузки автомобилей:', error);
        res.render('cars/index', { cars: [], error: error.message, currentPage: 'cars', user: req.session.user });
    }
});

app.get('/cars/new', requireRole('admin', 'supervisor'), (req, res) => {
    res.render('cars/form', { car: null, currentPage: 'cars', user: req.session.user });
});

app.post('/cars', requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        const { brand, model, year, price, color, mileage, status } = req.body;
        await db.addCar(brand, model, year, price, color, mileage, status);
        res.redirect('/cars');
    } catch (error) {
        console.error('Ошибка добавления автомобиля:', error);
        res.render('cars/form', { car: null, error: error.message, currentPage: 'cars', user: req.session.user });
    }
});

app.get('/cars/:id/edit', requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        const car = await db.getCarById(req.params.id);
        res.render('cars/form', { car, currentPage: 'cars', user: req.session.user });
    } catch (error) {
        console.error('Ошибка загрузки автомобиля:', error);
        res.redirect('/cars');
    }
});

app.post('/cars/:id/update', requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        const { brand, model, year, price, color, mileage, status } = req.body;
        await db.updateCar(req.params.id, brand, model, year, price, color, mileage, status);
        res.redirect('/cars');
    } catch (error) {
        console.error('Ошибка обновления автомобиля:', error);
        res.redirect('/cars');
    }
});

app.post('/cars/:id/delete', requireRole('admin'), async (req, res) => {
    try {
        await db.deleteCar(req.params.id);
        res.redirect('/cars');
    } catch (error) {
        console.error('Ошибка удаления автомобиля:', error);
        res.redirect('/cars');
    }
});

// ========== КЛИЕНТЫ ==========
app.get('/clients', async (req, res) => {
    try {
        const clients = await db.getAllClients();
        res.render('clients/index', { clients, currentPage: 'clients', user: req.session.user });
    } catch (error) {
        console.error('Ошибка загрузки клиентов:', error);
        res.render('clients/index', { clients: [], error: error.message, currentPage: 'clients', user: req.session.user });
    }
});

app.get('/clients/new', (req, res) => {
    res.render('clients/form', { client: null, currentPage: 'clients', user: req.session.user });
});

app.post('/clients', async (req, res) => {
    try {
        const { name, phone, email, address } = req.body;
        await db.addClient(name, phone, email, address);
        res.redirect('/clients');
    } catch (error) {
        console.error('Ошибка добавления клиента:', error);
        res.render('clients/form', { client: null, error: error.message, currentPage: 'clients', user: req.session.user });
    }
});

app.get('/clients/:id/edit', async (req, res) => {
    try {
        const client = await db.getClientById(req.params.id);
        res.render('clients/form', { client, currentPage: 'clients', user: req.session.user });
    } catch (error) {
        console.error('Ошибка загрузки клиента:', error);
        res.redirect('/clients');
    }
});

app.post('/clients/:id/update', async (req, res) => {
    try {
        const { name, phone, email, address } = req.body;
        await db.updateClient(req.params.id, name, phone, email, address);
        res.redirect('/clients');
    } catch (error) {
        console.error('Ошибка обновления клиента:', error);
        res.redirect('/clients');
    }
});

app.post('/clients/:id/delete', requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        await db.deleteClient(req.params.id);
        res.redirect('/clients');
    } catch (error) {
        console.error('Ошибка удаления клиента:', error);
        res.redirect('/clients');
    }
});

// ========== ПРОДАЖИ ==========
app.get('/sales', async (req, res) => {
    try {
        const sales = await db.getAllSales();
        res.render('sales/index', { sales, currentPage: 'sales', user: req.session.user });
    } catch (error) {
        console.error('Ошибка загрузки продаж:', error);
        res.render('sales/index', { sales: [], error: error.message, currentPage: 'sales', user: req.session.user });
    }
});

app.get('/sales/new', async (req, res) => {
    try {
        const cars = await db.getAllCars();
        const clients = await db.getAllClients();
        res.render('sales/form', { sale: null, cars, clients, currentPage: 'sales', user: req.session.user });
    } catch (error) {
        console.error('Ошибка загрузки данных для продажи:', error);
        res.redirect('/sales');
    }
});

app.post('/sales', async (req, res) => {
    try {
        const { car_id, client_id, sale_date, price } = req.body;
        const manager_id = req.session.user ? req.session.user.id : null;
        await db.addSale(car_id, client_id, manager_id, sale_date, price);
        res.redirect('/sales');
    } catch (error) {
        console.error('Ошибка добавления продажи:', error);
        const cars = await db.getAllCars();
        const clients = await db.getAllClients();
        res.render('sales/form', { sale: null, cars, clients, error: error.message, currentPage: 'sales', user: req.session.user });
    }
});

app.post('/sales/:id/delete', requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        await db.deleteSale(req.params.id);
        res.redirect('/sales');
    } catch (error) {
        console.error('Ошибка удаления продажи:', error);
        res.redirect('/sales');
    }
});

// ========== ГАРАНТИЙНОЕ ОБСЛУЖИВАНИЕ ==========
app.get('/warranty', async (req, res) => {
    try {
        const warrantyServices = await db.getAllWarrantyServices();
        res.render('warranty/index', { warrantyServices, currentPage: 'warranty', user: req.session.user });
    } catch (error) {
        console.error('Ошибка загрузки гарантийных случаев:', error);
        res.render('warranty/index', { warrantyServices: [], error: error.message, currentPage: 'warranty', user: req.session.user });
    }
});

app.get('/warranty/new', async (req, res) => {
    try {
        const sales = await db.getAllSales();
        res.render('warranty/form', { warrantyService: null, sales: sales || [], currentPage: 'warranty', user: req.session.user });
    } catch (error) {
        console.error('Ошибка загрузки данных для гарантии:', error);
        res.redirect('/warranty');
    }
});

app.post('/warranty', async (req, res) => {
    try {
        const { sale_id, car_id, client_id, issue_date, description, status, repair_cost, notes } = req.body;
        await db.addWarrantyService(sale_id, car_id, client_id, issue_date, description, status, repair_cost, notes);
        res.redirect('/warranty');
    } catch (error) {
        console.error('Ошибка добавления гарантийного случая:', error);
        const sales = await db.getAllSales();
        res.render('warranty/form', { warrantyService: null, sales, error: error.message, currentPage: 'warranty', user: req.session.user });
    }
});

app.get('/warranty/:id/edit', async (req, res) => {
    try {
        const warrantyService = await db.getWarrantyServiceById(req.params.id);
        const sales = await db.getAllSales();
        res.render('warranty/form', { warrantyService, sales: sales || [], currentPage: 'warranty', user: req.session.user });
    } catch (error) {
        console.error('Ошибка загрузки гарантийного случая:', error);
        res.redirect('/warranty');
    }
});

app.post('/warranty/:id/update', async (req, res) => {
    try {
        const { issue_date, description, status, repair_cost, completion_date, notes } = req.body;
        await db.updateWarrantyService(req.params.id, issue_date, description, status, repair_cost, completion_date, notes);
        res.redirect('/warranty');
    } catch (error) {
        console.error('Ошибка обновления гарантийного случая:', error);
        res.redirect('/warranty');
    }
});

app.post('/warranty/:id/delete', requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        await db.deleteWarrantyService(req.params.id);
        res.redirect('/warranty');
    } catch (error) {
        console.error('Ошибка удаления гарантийного случая:', error);
        res.redirect('/warranty');
    }
});

// ========== ОТЧЕТЫ ==========
app.get('/reports', requireRole('admin', 'supervisor'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const reports = await db.getReports(startDate, endDate);
        res.render('reports/index', { reports, startDate, endDate, currentPage: 'reports', user: req.session.user });
    } catch (error) {
        console.error('Ошибка загрузки отчетов:', error);
        res.render('reports/index', { reports: null, error: error.message, currentPage: 'reports', user: req.session.user });
    }
});

// Запуск сервера
db.init().then(async () => {
    try {
        await createDefaultUsers();
    } catch (err) {
        console.error('Ошибка создания пользователей:', err);
    }
    app.listen(PORT, () => {
        console.log(`Сервер автосалона запущен на http://localhost:${PORT}`);
        console.log(`Вход: http://localhost:${PORT}/login`);
    });
}).catch(err => {
    console.error('Ошибка инициализации БД:', err);
    app.listen(PORT, () => {
        console.log(`Сервер автосалона запущен на http://localhost:${PORT}`);
        console.log(`Вход: http://localhost:${PORT}/login`);
    });
});
