const { app, createDefaultUsers } = require('../server');
const db = require('../database/db');

let inited = false;

async function ensureInit() {
    if (inited) return;
    await db.init();
    try {
        await createDefaultUsers();
    } catch (err) {
        console.error('Ошибка создания пользователей:', err);
    }
    inited = true;
}

module.exports = async (req, res) => {
    await ensureInit();
    return app(req, res);
};
