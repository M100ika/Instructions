// Fictional fixtures only. No real users, Telegram chat IDs or ticket links.
window.createDispatchDemo = () => {
  const ago = (days, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 3600000).toISOString();
  const seniors = [
    { owner_id: 'demo-1', name: 'Старший КИП и электроники', subordinates: [
      { id: 'engineer-1', name: 'Инженер КИП № 1', telegram: true },
      { id: 'engineer-2', name: 'Инженер КИП № 2', telegram: true }
    ] },
    { owner_id: 'demo-2', name: 'Старший инженер механики', subordinates: [
      { id: 'engineer-3', name: 'Механик № 1', telegram: true },
      { id: 'engineer-4', name: 'Механик № 2', telegram: false }
    ] },
    { owner_id: 'demo-3', name: 'Старший инженер систем', subordinates: [
      { id: 'engineer-5', name: 'Инженер вентиляции', telegram: true },
      { id: 'engineer-6', name: 'Инженер газовых систем', telegram: true },
      { id: 'engineer-7', name: 'Инженер-электрик', telegram: true }
    ] }
  ];
  const rows = [
    ['1042', 'Не включается лабораторный источник питания', 'КИП и электроника', 'demo-1', 4, '', 'Источник питания не включается после подключения. Нужна диагностика. Модель и серийный номер будут предоставлены на месте.'],
    ['1043', 'Проверка вытяжного шкафа в лаборатории', 'Вентиляция и климат', 'demo-3', 3, '', 'Необходимо проверить работу вытяжного шкафа и воздушный поток.'],
    ['1044', 'Изготовление крепления для экспериментальной установки', 'Механические работы', 'demo-2', 3, 'engineer-3', 'Требуется изготовить крепление по чертежу. Материал и размеры согласовать с заявителем.'],
    ['1045', 'Подключение газового баллона', 'Газовые системы', 'demo-3', 2, '', 'Требуется подключить новый баллон и проверить герметичность соединений.'],
    ['1046', 'Диагностика измерительного стенда', 'КИП и электроника', 'demo-1', 2, 'engineer-1', 'Измерительный стенд показывает нестабильные значения. Просим провести диагностику.'],
    ['1047', 'Розетка не работает в лабораторном помещении', 'Электрика', 'demo-3', 1, '', 'Нет питания в одной из розеток. Требуется проверка электрической линии.'],
    ['1048', 'Обслуживание системы кондиционирования', 'Вентиляция и климат', 'demo-3', 1, 'engineer-5', 'Кондиционер не поддерживает установленную температуру.'],
    ['1049', 'Ремонт механизма лабораторного стола', 'Механические работы', 'demo-2', 0, '', 'Затруднена регулировка высоты лабораторного стола.']
  ];
  const tickets = rows.map(([number, title, service, owner, age, assignee, description], i) => ({
    ticket_id: `demo-${number}`, ticket_number: number, title, service,
    owner_id: owner, owner: seniors.find(s => s.owner_id === owner).name,
    customer: `researcher${i + 1}@example.invalid`, phone: '', state: 'open',
    created: ago(age, 2), location: `Блок ${i % 3 + 3}, помещение ${201 + i}`,
    description, assignee, notifiedTo: '',
    history: assignee ? [{ text: 'Исполнитель назначен в демонстрационных данных', at: ago(age, 1) }] : []
  }));
  return { tickets, seniors, total: tickets.length };
};
