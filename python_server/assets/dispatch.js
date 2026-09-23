(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = {
    mode: 'demo', role: 'senior', tickets: [], seniors: [], total: null,
    scope: 'all', page: 1, pageSize: 6, selected: null, loading: false,
    api: '', refreshed: null, notifications: 0, demo: null
  };
  const focusOrigins = new Map();
  let toastTimer;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const date = value => {
    if (!value) return 'Не указана';
    const parsed = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? 'Не указана' : new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', year: 'numeric'
    }).format(parsed);
  };
  const canAssign = () => state.mode === 'demo' && state.role === 'senior';
  const selectedTicket = () => state.tickets.find(t => t.ticket_id === state.selected);
  const engineers = () => state.seniors.flatMap(s => s.subordinates || []);
  const engineerFor = id => engineers().find(e => e.id === id);
  const ownerName = ticket => state.seniors.find(s => String(s.owner_id) === String(ticket.owner_id))?.name || ticket.owner || 'Не указан';
  const stateLabel = value => ({ open: 'Открыта', new: 'Новая', 'closed successful': 'Закрыта' }[value] || value || 'Не указан');

  function toast(message) {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
  }

  function openDialog(dialog, trigger) {
    focusOrigins.set(dialog, trigger || document.activeElement);
    dialog.showModal();
    document.body.classList.add('modal-open');
  }
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open');
      const origin = focusOrigins.get(dialog);
      if (origin?.isConnected && !origin.disabled) origin.focus();
      else if (!$('ticket-drawer').open) $('refresh').focus();
    });
  });

  function updateMode() {
    const demo = state.mode === 'demo';
    $('role-control').hidden = !demo;
    $('back-to-demo').hidden = demo;
    $('profile-role').textContent = demo ? (state.role === 'senior' ? 'Старший инженер' : 'Инженер') : 'Только просмотр';
    $('profile-caption').textContent = demo ? 'Предпросмотр интерфейса' : 'Вход ещё не подключён';
    $('mode-description').textContent = demo
      ? 'Демонстрация интерфейса. Заявки вымышлены. Действия не отправляют сообщения и не изменяют Znuny.'
      : 'Данные сервера · только просмотр. Назначение и Telegram станут доступны после подключения авторизации.';
    $('page-subtitle').textContent = demo && state.role === 'senior'
      ? 'Распределяйте работу и держите команду в курсе.' : 'Просматривайте заявки и находите нужную информацию.';
    $('queue-note').textContent = demo
      ? 'Назначение исполнителя и уведомление в Telegram — отдельные действия. Демонстрационные изменения сохраняются до перезагрузки страницы.'
      : 'Поиск и фильтры работают по загруженным заявкам. Сервер пока не передаёт назначения исполнителей и историю уведомлений.';
    document.querySelectorAll('[data-scope]').forEach(button => {
      button.disabled = !demo && button.dataset.scope !== 'all';
      button.title = button.disabled ? 'Сервер пока не передаёт назначения исполнителей' : '';
    });
  }

  function populateFilters() {
    const service = $('service-filter').value;
    const owner = $('senior-filter').value;
    const services = [...new Set(state.tickets.map(t => t.service).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
    $('service-filter').replaceChildren(new Option('Все направления', ''), ...services.map(s => new Option(s, s)));
    const owners = new Map(state.seniors.map(s => [String(s.owner_id), s.name]));
    state.tickets.forEach(t => { if (t.owner_id && !owners.has(t.owner_id)) owners.set(t.owner_id, t.owner || `ID ${t.owner_id}`); });
    $('senior-filter').replaceChildren(new Option('Все старшие инженеры', ''), ...[...owners].map(([id, name]) => new Option(name, id)));
    if (services.includes(service)) $('service-filter').value = service;
    if (owners.has(owner)) $('senior-filter').value = owner;
  }

  function filteredTickets() {
    const search = $('search').value.trim().toLocaleLowerCase('ru');
    const service = $('service-filter').value;
    const owner = $('senior-filter').value;
    const result = state.tickets.filter(ticket => {
      const haystack = [ticket.ticket_number, ticket.title, ticket.customer, ticket.service, ticket.phone, ownerName(ticket), engineerFor(ticket.assignee)?.name].join(' ').toLocaleLowerCase('ru');
      return (!search || haystack.includes(search)) && (!service || ticket.service === service)
        && (!owner || ticket.owner_id === owner)
        && (state.scope === 'all' || (state.scope === 'assigned' ? Boolean(ticket.assignee) : !ticket.assignee));
    });
    return result.sort((a, b) => {
      const sort = $('sort-order').value;
      if (sort === 'number') return a.ticket_number.localeCompare(b.ticket_number, 'ru', { numeric: true });
      const time = t => new Date(String(t.created || '').replace(' ', 'T')).getTime() || 0;
      return sort === 'newest' ? time(b) - time(a) : time(a) - time(b);
    });
  }

  function render() {
    const demo = state.mode === 'demo';
    const assigned = state.tickets.filter(t => t.assignee).length;
    $('stat-total').textContent = state.total ?? '—';
    $('stat-total-note').textContent = demo ? 'В демонстрационной очереди' : 'По данным серверной очереди';
    $('stat-unassigned').textContent = demo ? state.tickets.length - assigned : '—';
    $('stat-assigned').textContent = demo ? assigned : '—';
    $('stat-notified').textContent = demo ? state.notifications : '—';
    $('stat-unassigned-note').textContent = demo ? 'Ожидают распределения' : 'Нет данных о назначениях';
    $('stat-assigned-note').textContent = demo ? 'В загруженной очереди' : 'Нет данных о назначениях';
    $('stat-notified-note').textContent = demo ? 'Смоделировано в этой сессии' : 'История пока недоступна';
    $('nav-count').textContent = state.tickets.length;
    $('count-all').textContent = state.tickets.length;
    $('count-unassigned').textContent = demo ? state.tickets.length - assigned : '—';
    $('count-assigned').textContent = demo ? assigned : '—';
    document.querySelectorAll('[data-scope]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scope === state.scope)));
    const tickets = filteredTickets();
    const pages = Math.max(1, Math.ceil(tickets.length / state.pageSize));
    state.page = Math.min(state.page, pages);
    const visible = tickets.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    $('result-count').textContent = `Найдено: ${tickets.length} из ${state.tickets.length} загруженных`;
    $('page-number').textContent = `${state.page} / ${pages}`;
    $('previous-page').disabled = state.page === 1;
    $('next-page').disabled = state.page === pages;
    $('reset-filters').hidden = !($('search').value || $('service-filter').value || $('senior-filter').value || state.scope !== 'all');
    $('load-note').textContent = demo ? 'Вымышленные заявки · данные для обсуждения' : `Загружено ${state.tickets.length} из ${state.total ?? '—'} в очереди`;
    if (state.loading && !state.tickets.length) {
      $('ticket-content').innerHTML = '<div class="empty-state"><h3>Загружаем заявки…</h3><p>Это может занять некоторое время.</p></div>';
      return;
    }
    if (!tickets.length) {
      const filtered = Boolean(state.tickets.length);
      $('ticket-content').innerHTML = `<div class="empty-state"><h3>${filtered ? 'Ничего не найдено' : state.total === null ? 'Данные не загружены' : 'В очереди нет заявок'}</h3><p>${filtered ? 'Измените поисковый запрос или сбросьте фильтры.' : 'Обновите очередь или выберите другой источник данных.'}</p>${filtered ? '<button class="button button-secondary" data-reset>Сбросить фильтры</button>' : ''}</div>`;
      return;
    }
    const rows = visible.map(ticket => {
      const engineer = engineerFor(ticket.assignee);
      const executor = demo ? (engineer ? `<span class="owner-name">${esc(engineer.name)}</span>` : '<span class="unassigned">Не назначен</span>') : '<span class="cell-secondary">Нет данных</span>';
      const notification = demo
        ? (ticket.notifiedTo ? '<span class="badge green">Смоделировано</span>' : '<span class="badge neutral">Не отправлено</span>')
        : '<span class="badge neutral">Нет данных</span>';
      return `<tr><td class="topic-cell"><button class="ticket-open" data-ticket="${esc(ticket.ticket_id)}"><span class="ticket-number">#${esc(ticket.ticket_number)}</span><span class="ticket-title">${esc(ticket.title || 'Без темы')}</span></button><span class="cell-secondary">${esc(ticket.service || 'Направление не указано')}</span></td><td class="owner-cell" data-label="Исполнитель">${executor}<span class="cell-secondary">${esc(ownerName(ticket))}</span></td><td data-label="Статус"><span class="badge blue">${esc(stateLabel(ticket.state))}</span></td><td data-label="Telegram">${notification}</td><td class="date-cell" data-label="Создана">${esc(date(ticket.created))}</td><td><button class="row-arrow" data-ticket="${esc(ticket.ticket_id)}" aria-label="Открыть заявку ${esc(ticket.ticket_number)}">→</button></td></tr>`;
    }).join('');
    $('ticket-content').innerHTML = `<div class="table-scroll"><table class="ticket-table"><caption class="sr-only">Заявки инженерно-технической службы</caption><thead><tr><th scope="col">Заявка / направление</th><th scope="col">Исполнитель / старший</th><th scope="col">Статус</th><th scope="col">Telegram</th><th scope="col">Создана</th><th scope="col"><span class="sr-only">Открыть</span></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function resetFilters() {
    $('search').value = ''; $('service-filter').value = ''; $('senior-filter').value = '';
    state.scope = 'all'; state.page = 1; render();
  }

  function renderDrawer() {
    const ticket = selectedTicket();
    if (!ticket) return;
    const demo = state.mode === 'demo';
    $('drawer-title').textContent = `Заявка #${ticket.ticket_number}`;
    $('drawer-topic').textContent = ticket.title || 'Без темы';
    $('drawer-state').textContent = stateLabel(ticket.state);
    const fields = [
      ['Направление', ticket.service || 'Не указано'], ['Создана', date(ticket.created)],
      ['Заявитель', ticket.customer || 'Не указан'], ['Телефон', ticket.phone || 'Не указан'],
      ['Ответственный старший', ownerName(ticket)], ['Исполнитель', demo ? engineerFor(ticket.assignee)?.name || 'Не назначен' : 'Сервер не передаёт'],
      ['Помещение', ticket.location || 'Сервер не передаёт']
    ];
    $('ticket-fields').innerHTML = fields.map(([name, value]) => `<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`).join('');
    $('ticket-description').textContent = ticket.description || 'Текущая выгрузка не содержит текст обращения. Полное описание доступно в Znuny.';
    $('znuny-link').hidden = demo || !/^\d+$/.test(ticket.ticket_id);
    if (!demo && /^\d+$/.test(ticket.ticket_id)) $('znuny-link').href = `https://support.nu.edu.kz/znuny/index.pl?Action=AgentTicketZoom;TicketID=${encodeURIComponent(ticket.ticket_id)}`;
    $('assign-panel').hidden = !canAssign();
    $('readonly-note').hidden = canAssign();
    $('readonly-note').textContent = demo
      ? 'Режим инженера: просмотр заявок. Назначать исполнителей и отправлять уведомления может старший инженер.'
      : 'Доступен только просмотр. Назначения, история и отправка будут подключены вместе с авторизацией сотрудников.';
    $('history-title').textContent = demo ? 'История заявки · демо' : 'История заявки';
    const history = demo ? [...ticket.history, { text: 'Заявка создана', at: ticket.created }] : [];
    $('ticket-history').innerHTML = history.length
      ? history.map(event => `<li>${esc(event.text)}<time>${esc(date(event.at))}</time></li>`).join('')
      : '<li>История не передаётся текущей выгрузкой.</li>';
    if (canAssign()) {
      $('assignee').replaceChildren(new Option('Выберите инженера', ''));
      const groups = [...state.seniors].sort((a, b) => Number(b.owner_id === ticket.owner_id) - Number(a.owner_id === ticket.owner_id));
      groups.forEach(senior => {
        const group = document.createElement('optgroup');
        group.label = senior.name;
        (senior.subordinates || []).forEach(engineer => {
          const load = state.tickets.filter(t => t.assignee === engineer.id).length;
          group.append(new Option(`${engineer.name} · заявок: ${load}${engineer.telegram ? '' : ' · без Telegram'}`, engineer.id));
        });
        $('assignee').append(group);
      });
      $('assignee').value = ticket.assignee || '';
      $('assignment-feedback').textContent = '';
      updateAssignmentControls();
    }
  }

  function updateAssignmentControls() {
    const ticket = selectedTicket();
    if (!ticket) return;
    const choice = $('assignee').value;
    const engineer = engineerFor(choice);
    const saved = choice && choice === ticket.assignee;
    $('assign-button').disabled = !canAssign() || !choice || Boolean(saved);
    $('assign-button').textContent = ticket.assignee ? 'Переназначить' : 'Назначить';
    $('telegram-button').disabled = !canAssign() || !saved || !engineer?.telegram || ticket.notifiedTo === choice;
    $('telegram-button').textContent = saved && ticket.notifiedTo === choice ? 'Уведомление смоделировано' : 'Telegram';
    $('assignee-note').textContent = !choice ? 'Выберите исполнителя. Назначение само по себе не отправляет сообщение.'
      : !saved ? 'Сначала сохраните назначение, затем можно подготовить уведомление.'
      : !engineer?.telegram ? 'Исполнитель назначен. Telegram для него не настроен.'
      : ticket.notifiedTo === choice ? 'Отправка этому исполнителю уже смоделирована.'
      : 'Исполнитель назначен. Проверьте сообщение перед отправкой.';
  }

  $('ticket-content').addEventListener('click', event => {
    if (event.target.closest('[data-reset]')) return resetFilters();
    const trigger = event.target.closest('[data-ticket]');
    if (!trigger) return;
    state.selected = trigger.dataset.ticket;
    renderDrawer();
    openDialog($('ticket-drawer'), trigger);
  });
  $('assignee').addEventListener('change', updateAssignmentControls);
  $('assign-button').addEventListener('click', () => {
    if (!canAssign()) return;
    const ticket = selectedTicket();
    const engineer = engineerFor($('assignee').value);
    if (!ticket || !engineer || ticket.assignee === engineer.id) return;
    const previous = engineerFor(ticket.assignee);
    ticket.assignee = engineer.id;
    ticket.notifiedTo = '';
    ticket.history.unshift({ text: `${previous ? `Переназначена: ${previous.name} → ` : 'Назначен исполнитель: '}${engineer.name}`, at: new Date().toISOString() });
    render(); renderDrawer();
    $('assignment-feedback').textContent = 'Назначение сохранено в демонстрации. Telegram не отправлен.';
    $('assignee').focus();
  });
  $('telegram-button').addEventListener('click', event => {
    if (!canAssign()) return;
    const ticket = selectedTicket();
    const engineer = engineerFor(ticket?.assignee);
    if (!engineer?.telegram || ticket.notifiedTo === engineer.id || $('assignee').value !== ticket.assignee) return;
    $('telegram-recipient').textContent = `Получатель: ${engineer.name}`;
    $('telegram-preview').textContent = [
      `Заявка #${ticket.ticket_number}`, ticket.title, '',
      `Направление: ${ticket.service}`, `Заявитель: ${ticket.customer}`,
      `Помещение: ${ticket.location || 'Не указано'}`, `Телефон: ${ticket.phone || 'Не указан'}`,
      `Создана: ${date(ticket.created)}`, '', ticket.description || '', '',
      'В рабочем сообщении здесь будет ссылка на заявку в Znuny.'
    ].join('\n');
    openDialog($('telegram-dialog'), event.currentTarget);
  });
  $('confirm-telegram').addEventListener('click', () => {
    if (!canAssign()) return;
    const ticket = selectedTicket();
    const engineer = engineerFor(ticket?.assignee);
    if (!engineer?.telegram || ticket.notifiedTo === engineer.id) return;
    ticket.notifiedTo = engineer.id;
    state.notifications++;
    ticket.history.unshift({ text: `Смоделирована отправка в Telegram: ${engineer.name}`, at: new Date().toISOString() });
    $('telegram-dialog').close();
    render(); renderDrawer();
    $('assignment-feedback').textContent = 'Отправка смоделирована. Реальное сообщение не отправлялось.';
    $('assignee').focus();
  });

  document.querySelectorAll('[data-scope]').forEach(button => button.addEventListener('click', () => {
    state.scope = button.dataset.scope; state.page = 1; render();
  }));
  ['search', 'service-filter', 'senior-filter', 'sort-order'].forEach(id => $(id).addEventListener(id === 'search' ? 'input' : 'change', () => { state.page = 1; render(); }));
  $('reset-filters').addEventListener('click', resetFilters);
  $('previous-page').addEventListener('click', () => { state.page--; render(); });
  $('next-page').addEventListener('click', () => { state.page++; render(); });
  $('preview-role').addEventListener('change', () => {
    state.role = $('preview-role').value;
    updateMode(); render();
  });

  function useDemo() {
    if (state.loading) return;
    if (!state.demo) state.demo = window.createDispatchDemo();
    state.mode = 'demo';
    state.tickets = state.demo.tickets;
    state.seniors = state.demo.seniors;
    state.total = state.demo.total;
    state.scope = 'all'; state.page = 1;
    $('connection-error').hidden = true;
    $('connection').textContent = 'Демонстрационные данные';
    $('connection').className = 'connection';
    populateFilters(); updateMode(); resetFilters();
    if ($('source-dialog').open) $('source-dialog').close();
  }

  function setLoading(loading) {
    state.loading = loading;
    ['refresh', 'connect-server', 'use-demo', 'back-to-demo'].forEach(id => { $(id).disabled = loading; });
    $('ticket-content').setAttribute('aria-busy', String(loading));
    $('refresh').textContent = loading ? 'Загрузка…' : 'Обновить';
  }

  async function readJson(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${state.api}${path}`, { signal: controller.signal, credentials: 'omit', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data || typeof data !== 'object' || data.error) throw new Error('API error');
      return data;
    } finally { clearTimeout(timer); }
  }

  async function loadServer() {
    if (state.loading) return;
    setLoading(true);
    $('connection-error').hidden = true;
    $('connection').textContent = 'Подключение…';
    $('connection').className = 'connection';
    render();
    try {
      const [ticketsResult, seniorsResult] = await Promise.allSettled([readJson('/tickets'), readJson('/seniors')]);
      if (ticketsResult.status !== 'fulfilled') throw ticketsResult.reason;
      const data = ticketsResult.value;
      if (!Array.isArray(data.tickets) || !Number.isInteger(data.total) || data.total < data.tickets.length) throw new Error('Invalid tickets');
      const ids = new Set();
      const tickets = data.tickets.map(ticket => {
        if (!ticket || !['string', 'number'].includes(typeof ticket.ticket_id) || !String(ticket.ticket_id) || ids.has(String(ticket.ticket_id))) throw new Error('Invalid ticket ID');
        ids.add(String(ticket.ticket_id));
        const normalized = {};
        for (const key of ['ticket_id', 'ticket_number', 'title', 'service', 'customer', 'owner', 'owner_id', 'state', 'created', 'phone']) normalized[key] = String(ticket[key] ?? '');
        return normalized;
      });
      const seniorsData = seniorsResult.status === 'fulfilled' && Array.isArray(seniorsResult.value.seniors) ? seniorsResult.value.seniors : null;
      state.seniors = (seniorsData || []).filter(s => s && s.owner_id != null && typeof s.name === 'string').map(s => ({ owner_id: String(s.owner_id), name: s.name }));
      state.tickets = tickets;
      state.total = data.total;
      state.refreshed = new Date().toISOString();
      $('connection').textContent = `Обновлено ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
      $('connection').className = 'connection connected';
      if (!seniorsData) {
        $('connection-error').textContent = 'Заявки загружены, но список старших инженеров недоступен. Показаны ответственные из самих заявок.';
        $('connection-error').hidden = false;
      }
      populateFilters();
    } catch {
      $('connection').textContent = 'Нет подключения';
      $('connection').className = 'connection error';
      $('connection-error').textContent = state.refreshed
        ? `Не удалось обновить очередь. Показаны данные от ${date(state.refreshed)}. Проверьте подключение и повторите обновление.`
        : 'Не удалось загрузить заявки. Проверьте адрес и доступность сервера. Для обсуждения интерфейса можно вернуться к демонстрации.';
      $('connection-error').hidden = false;
    } finally {
      setLoading(false); render();
    }
  }

  document.querySelectorAll('[data-source]').forEach(button => button.addEventListener('click', () => {
    $('source-error').textContent = '';
    openDialog($('source-dialog'), button);
  }));
  $('source-form').addEventListener('submit', event => {
    event.preventDefault();
    if (state.loading) return;
    try {
      const url = new URL($('api-address').value.trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
      if (location.protocol === 'https:' && url.protocol !== 'https:') {
        $('source-error').textContent = 'Для страницы, открытой по HTTPS, укажите HTTPS-адрес сервера.';
        return;
      }
      state.api = url.href.replace(/\/$/, '');
    } catch {
      $('source-error').textContent = 'Укажите корректный HTTP- или HTTPS-адрес без логина, пароля и параметров.';
      return;
    }
    state.mode = 'live'; state.tickets = []; state.seniors = []; state.total = null; state.refreshed = null;
    state.scope = 'all'; state.page = 1;
    populateFilters(); updateMode(); resetFilters();
    $('source-dialog').close();
    loadServer();
  });
  $('refresh').addEventListener('click', () => {
    if (state.mode === 'live') loadServer();
    else { render(); toast('Демонстрационная очередь обновлена. Назначения сохранены в этой сессии.'); }
  });
  $('use-demo').addEventListener('click', useDemo);
  $('back-to-demo').addEventListener('click', useDemo);
  useDemo();
})();
