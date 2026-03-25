// Основной JavaScript файл для интерактивности (ЛР2)

document.addEventListener('DOMContentLoaded', function() {
    // Подтверждение удаления (уже есть в HTML, но можно улучшить)
    const deleteForms = document.querySelectorAll('form[onsubmit*="confirm"]');
    
    deleteForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            // Дополнительная валидация может быть добавлена здесь
            console.log('Подтверждение удаления');
        });
    });

    // Валидация форм на клиенте
    const forms = document.querySelectorAll('.form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            // Можно добавить дополнительную валидацию
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;

            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.style.borderColor = '#ef4444';
                } else {
                    field.style.borderColor = '';
                }
            });

            if (!isValid) {
                e.preventDefault();
                alert('Пожалуйста, заполните все обязательные поля');
            }
        });
    });

    // Автоматическое форматирование телефонного номера
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                if (value[0] === '8') value = '7' + value.slice(1);
                if (value[0] !== '7') value = '7' + value;
                if (value.length > 1) value = '+' + value;
                if (value.length > 2) value = value.slice(0, 2) + ' (' + value.slice(2);
                if (value.length > 7) value = value.slice(0, 7) + ') ' + value.slice(7);
                if (value.length > 12) value = value.slice(0, 12) + '-' + value.slice(12);
                if (value.length > 15) value = value.slice(0, 15) + '-' + value.slice(15, 17);
            }
            e.target.value = value;
        });
    });

    console.log('Система управления автосалоном загружена');

    // Уведомления (простой фронтовый список)
    const notificationToggle = document.getElementById('notificationToggle');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notificationList = document.getElementById('notificationList');
    const notificationCount = document.getElementById('notificationCount');
    const notificationClear = document.getElementById('notificationClear');

    // Можно заменить на реальные уведомления с сервера
    let notifications = window.APP_NOTIFICATIONS || [];

    const renderNotifications = () => {
        notificationList.innerHTML = '';
        if (!notifications.length) {
            notificationList.innerHTML = '<div class="notification-empty">Нет уведомлений</div>';
            if (notificationCount) {
                notificationCount.style.display = 'none';
            }
            return;
        }

        notifications.forEach(note => {
            const item = document.createElement('div');
            item.className = 'notification-item';
            item.innerHTML = `
                <div class="notification-item-title">${note.title || 'Уведомление'}</div>
                <div class="notification-item-time">${note.time || ''}</div>
            `;
            notificationList.appendChild(item);
        });

        if (notificationCount) {
            notificationCount.textContent = notifications.length;
            notificationCount.style.display = 'flex';
        }
    };

    const closeDropdown = () => {
        if (notificationDropdown) {
            notificationDropdown.classList.remove('open');
            notificationDropdown.setAttribute('aria-hidden', 'true');
        }
        if (notificationToggle) {
            notificationToggle.setAttribute('aria-expanded', 'false');
        }
    };

    if (notificationToggle && notificationDropdown && notificationList && notificationCount) {
        renderNotifications();

        notificationToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = notificationDropdown.classList.contains('open');
            if (isOpen) {
                closeDropdown();
            } else {
                notificationDropdown.classList.add('open');
                notificationDropdown.setAttribute('aria-hidden', 'false');
                notificationToggle.setAttribute('aria-expanded', 'true');
            }
        });

        notificationClear?.addEventListener('click', () => {
            notifications = [];
            renderNotifications();
        });

        document.addEventListener('click', (e) => {
            if (!notificationDropdown.contains(e.target) && !notificationToggle.contains(e.target)) {
                closeDropdown();
            }
        });
    }
});









