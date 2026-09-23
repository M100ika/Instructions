(() => {
  'use strict';

  const menuButton = document.getElementById('menu-button');
  const navigation = document.getElementById('navigation');
  const requestDialog = document.getElementById('request-dialog');
  const staffDialog = document.getElementById('staff-dialog');
  const form = document.getElementById('request-form');
  const status = document.getElementById('form-status');
  const preview = document.getElementById('mail-preview');
  const previewText = document.getElementById('mail-text');
  const recipient = 'engineeringdesk@nu.edu.kz';
  let returnFocus = null;

  function closeMenu() {
    navigation.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Открыть меню');
  }

  menuButton.addEventListener('click', () => {
    const open = navigation.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navigation.classList.contains('is-open')) {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  window.matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);

  function openDialog(dialog, trigger) {
    // Remember the mobile menu trigger when its navigation item becomes hidden.
    returnFocus = navigation.contains(trigger) && window.matchMedia('(max-width: 760px)').matches
      ? menuButton : trigger;
    closeMenu();
    dialog.showModal();
    document.body.classList.add('modal-open');
  }

  document.querySelectorAll('[data-request]').forEach(trigger => {
    trigger.addEventListener('click', event => {
      // The mailto link remains usable if native dialogs are unavailable.
      if (typeof requestDialog.showModal !== 'function') return;
      event.preventDefault();
      const service = trigger.dataset.request;
      if (service) form.elements.service.value = service;
      status.textContent = '';
      preview.hidden = true;
      openDialog(requestDialog, trigger);
    });
  });

  document.querySelectorAll('[data-staff]').forEach(trigger => {
    trigger.addEventListener('click', () => openDialog(staffDialog, trigger));
  });

  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelectorAll('[data-close]').forEach(button => {
      button.addEventListener('click', () => dialog.close());
    });
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      returnFocus?.focus();
    });
  });

  function composeEmail() {
    const data = new FormData(form);
    const get = name => String(data.get(name) || '').trim();
    const subject = `Заявка ИТС: ${get('service')} — ${get('location')}`;
    const body = [
      'Здравствуйте!', '', `Направление: ${get('service')}`,
      `Имя: ${get('name')}`, `Корпус и помещение: ${get('location')}`,
      `Контакт для связи: ${get('contact') || 'Ответом на это письмо'}`,
      '', 'Описание задачи:', get('description')
    ].join('\n');
    return { subject, body, text: `Кому: ${recipient}\nТема: ${subject}\n\n${body}` };
  }

  // Reject whitespace-only required fields as well as normal empty values.
  function validate() {
    for (const field of form.querySelectorAll('[required]')) {
      field.setCustomValidity(field.value.trim() ? '' : 'Пожалуйста, заполните это поле.');
    }
    return form.reportValidity();
  }
  form.addEventListener('input', event => {
    if (typeof event.target.setCustomValidity === 'function') event.target.setCustomValidity('');
    status.textContent = '';
    preview.hidden = true;
  });

  function showPreview(email) {
    previewText.value = email.text;
    preview.hidden = false;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validate()) return;
    const email = composeEmail();
    showPreview(email);
    status.textContent = 'Откройте письмо в почтовом приложении и отправьте его. Если приложение не открылось, скопируйте текст ниже и отправьте письмо вручную.';
    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
  });

  const copyButton = document.getElementById('copy-request');
  copyButton.addEventListener('click', async () => {
    if (!validate()) return;
    const email = composeEmail();
    showPreview(email);
    copyButton.disabled = true;
    try {
      await navigator.clipboard.writeText(email.text);
      status.textContent = 'Текст скопирован. Вставьте его в письмо и отправьте на engineeringdesk@nu.edu.kz.';
    } catch {
      previewText.focus();
      previewText.select();
      status.textContent = 'Автоматическое копирование недоступно. Скопируйте выделенный текст и отправьте его по электронной почте.';
    } finally {
      copyButton.disabled = false;
    }
  });
})();
