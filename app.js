/**
 * ARENA BEACH TENNIS PARAIPABA
 * Sistema Integrado de Agendamento em Tempo Real, Confirmação Digital,
 * Controle de Horários Fixos, Gestão de Disponibilidade e Fluxo de Caixa.
 */

const STORAGE_KEY = 'ARENA_BT_PARAIPABA_STATE_V3';
const ADMIN_AUTH_SESSION_KEY = 'ARENA_BT_ADMIN_AUTHENTICATED';
const ADMIN_PASSWORD_DEFAULT = 'admin123';
const ADMIN_CUSTOM_PASS_KEY = 'ARENA_BT_ADMIN_CUSTOM_PASS';
const REALTIME_CHANNEL_NAME = 'arena_bt_paraipaba_realtime_sync';

// Configuração Oficial Supabase (groezaseypdbpgymgpvo)
const SUPABASE_URL = 'https://groezaseypdbpgymgpvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb2V6YXNleXBkYnBneW1ncHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjkxNjYsImV4cCI6MjA4MTY0NTE2Nn0.5U5QeoGmZn_i9Y8POoUCkatBUAdSW-cjHRyfxpm_pyM';
const SUPABASE_STATE_TABLE = 'arena_bt_paraipaba_state';
const SUPABASE_ROW_ID = 'main';

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

const WEEKDAY_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MONTH_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

/**
 * Horários Fixos Oficiais solicitados para a Arena Beach Tennis Paraipaba:
 * - Segunda-feira: BOA TERRA - FELIPE (19:00 às 21:00)
 * - Terça-feira: MABELLY (18:00 às 19:00) | TONILENNE (19:00 às 20:00)
 * - Quarta-feira: Rafaele ou Eugenia (19:00 às 20:00)
 * - Quinta-feira: Rafaele ou Eugenia (19:00 às 20:00)
 * - Sexta-feira: Isac (20:00 às 21:30)
 * - Sábado: Evanio (18:00 às 19:00) | Shalom - Antônio Neto ou Israel (20:30 às 22:30)
 */
const DEFAULT_FIXED_SCHEDULES = [
  {
    id: 'fix-seg-boaterra',
    dayOfWeek: 1, // Segunda-feira
    startTime: '19:00',
    endTime: '21:00',
    clientName: 'BOA TERRA - FELIPE',
    pricePerDay: 80
  },
  {
    id: 'fix-ter-mabelly',
    dayOfWeek: 2, // Terça-feira
    startTime: '18:00',
    endTime: '19:00',
    clientName: 'MABELLY',
    pricePerDay: 40
  },
  {
    id: 'fix-ter-tonilenne',
    dayOfWeek: 2, // Terça-feira
    startTime: '19:00',
    endTime: '20:00',
    clientName: 'TONILENNE',
    pricePerDay: 40
  },
  {
    id: 'fix-qua-rafaele-eugenia',
    dayOfWeek: 3, // Quarta-feira
    startTime: '19:00',
    endTime: '20:00',
    clientName: 'Rafaele ou Eugenia',
    pricePerDay: 40
  },
  {
    id: 'fix-qui-rafaele-eugenia',
    dayOfWeek: 4, // Quinta-feira
    startTime: '19:00',
    endTime: '20:00',
    clientName: 'Rafaele ou Eugenia',
    pricePerDay: 40
  },
  {
    id: 'fix-sex-isac',
    dayOfWeek: 5, // Sexta-feira
    startTime: '20:00',
    endTime: '21:30',
    clientName: 'Isac',
    pricePerDay: 60
  },
  {
    id: 'fix-sab-evanio',
    dayOfWeek: 6, // Sábado
    startTime: '18:00',
    endTime: '19:00',
    clientName: 'Evanio',
    pricePerDay: 40
  },
  {
    id: 'fix-sab-shalom',
    dayOfWeek: 6, // Sábado
    startTime: '20:30',
    endTime: '22:30',
    clientName: 'Shalom - Antônio Neto ou Israel',
    pricePerDay: 80
  }
];

// Helper: Date formatting YYYY-MM-DD local
function toLocalISODate(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseISODate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// Convert "HH:MM" <-> minutes from 00:00
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Application Runtime State
let appState = null;
let selectedDateISO = toLocalISODate(new Date());
let carouselBaseDate = new Date();
let selectedSlotIntervals = []; // Array of { start: "18:00", end: "19:00", durationMinutes: 60 }
let currentSlotFilter = 'all';
let broadcastChannel = null;
let supabaseClient = null;
let isApplyingRemoteState = false;
let lastSavedTimestamp = 0;

function sanitizeStateObject(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return createInitialState();
  }
  if (!parsed.config) {
    parsed.config = {};
  }
  // Garantir que abre às 16:00 às 23:00 (sem horários pela manhã) e valor de R$ 40/hora
  if (!parsed.config.openTime || timeToMinutes(parsed.config.openTime) < 16 * 60) {
    parsed.config.openTime = '16:00';
  }
  if (!parsed.config.closeTime) {
    parsed.config.closeTime = '23:00';
  }
  if (!parsed.config.pricePerHourAvulso || parsed.config.pricePerHourAvulso === 60) {
    parsed.config.pricePerHourAvulso = 40;
  }
  if (!parsed.config.pricePerHourFixed || parsed.config.pricePerHourFixed === 50 || parsed.config.pricePerHourFixed === 60) {
    parsed.config.pricePerHourFixed = 40;
  }
  if (!parsed.config.adminPassword) {
    parsed.config.adminPassword = ADMIN_PASSWORD_DEFAULT;
  }
  if (!parsed.fixedSchedules || parsed.fixedSchedules.length === 0) {
    parsed.fixedSchedules = DEFAULT_FIXED_SCHEDULES;
  }
  if (!Array.isArray(parsed.bookings)) parsed.bookings = [];
  if (!parsed.fixedPayments || typeof parsed.fixedPayments !== 'object') parsed.fixedPayments = {};
  if (!parsed.availabilityOverrides || typeof parsed.availabilityOverrides !== 'object') parsed.availabilityOverrides = {};
  if (!Array.isArray(parsed.cashflow)) parsed.cashflow = [];
  return parsed;
}

function createInitialState() {
  const todayISO = toLocalISODate(new Date());
  return {
    config: {
      openTime: '16:00',
      closeTime: '23:00',
      pricePerHourAvulso: 40,
      pricePerHourFixed: 40,
      pixKey: 'arenabeachtennisparaipaba@pix.com.br',
      adminPassword: ADMIN_PASSWORD_DEFAULT
    },
    fixedSchedules: DEFAULT_FIXED_SCHEDULES,
    bookings: [], // Avulso bookings confirmed by clients or admin
    fixedPayments: {}, // Key: `${dateISO}_${fixedId}` -> { status: 'PAGO' | 'PENDENTE', method: 'PIX', paidAt: ISO }
    availabilityOverrides: {
      // dateISO: { closedAllDay: false, blockedStarts: ["14:00"], customOpenStarts: [] }
    },
    cashflow: [
      {
        id: 'tx-seed-1',
        date: todayISO,
        description: 'Manutenção Preventiva e Nivelamento da Areia',
        category: 'Manutenção de Quadra/Areia',
        method: 'PIX',
        type: 'EXPENSE',
        amount: 120.00,
        sourceId: null
      },
      {
        id: 'tx-seed-2',
        date: todayISO,
        description: 'Kit Bolas de Beach Tennis Homologadas ITF',
        category: 'Materiais (Bolas/Redes/Raquetes)',
        method: 'Cartão',
        type: 'EXPENSE',
        amount: 95.00,
        sourceId: null
      }
    ]
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      appState = createInitialState();
      saveState(false, false);
      return;
    }
    const parsed = JSON.parse(raw);
    appState = sanitizeStateObject(parsed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (err) {
    console.error('Erro ao carregar estado:', err);
    appState = createInitialState();
  }
}

function updateLiveStatusBadge(statusText, isOnline = true) {
  const textEl = document.getElementById('liveStatusText');
  const dotEl = document.getElementById('livePulseDot');
  if (textEl) textEl.textContent = statusText;
  if (dotEl) {
    dotEl.style.background = isOnline ? 'var(--lime-primary)' : '#F59E0B';
  }
}

async function syncStateToSupabase() {
  if (!supabaseClient || isApplyingRemoteState) return;
  try {
    lastSavedTimestamp = Date.now();
    const { error } = await supabaseClient
      .from(SUPABASE_STATE_TABLE)
      .upsert(
        {
          id: SUPABASE_ROW_ID,
          state: appState,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.warn('Aviso ao sincronizar com Supabase (rode o script supabase_setup.sql no SQL Editor):', error.message);
      updateLiveStatusBadge('Local (Rode SQL)', false);
    } else {
      updateLiveStatusBadge('Supabase Ao Vivo', true);
    }
  } catch (err) {
    console.warn('Falha de rede ao salvar no Supabase:', err);
  }
}

async function initSupabaseIntegration() {
  if (!window.supabase || !window.supabase.createClient) {
    updateLiveStatusBadge('Modo Local', false);
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1. Buscar estado atual salvo na nuvem do Supabase
    const { data, error } = await supabaseClient
      .from(SUPABASE_STATE_TABLE)
      .select('state, updated_at')
      .eq('id', SUPABASE_ROW_ID)
      .maybeSingle();

    if (error) {
      console.warn('Tabela ainda não encontrada ou RLS pendente no Supabase. Execute supabase_setup.sql:', error.message);
      updateLiveStatusBadge('Aguardando SQL', false);
    } else if (data && data.state) {
      isApplyingRemoteState = true;
      const localSavedPass = localStorage.getItem(ADMIN_CUSTOM_PASS_KEY);
      appState = sanitizeStateObject(data.state);
      if (localSavedPass) {
        appState.config.adminPassword = localSavedPass;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      renderAll();
      isApplyingRemoteState = false;
      updateLiveStatusBadge('Supabase Ao Vivo', true);
    } else {
      // Tabela existe mas está vazia: envia o estado inicial para lá
      await syncStateToSupabase();
    }

    // 2. Assinar atualizações em Tempo Real (WebSocket) para sincronizar celular <-> PC na hora
    supabaseClient
      .channel('arena_bt_paraipaba_cloud_sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SUPABASE_STATE_TABLE,
          filter: `id=eq.${SUPABASE_ROW_ID}`
        },
        (payload) => {
          if (Date.now() - lastSavedTimestamp < 1200) return;
          const remoteState = payload.new && payload.new.state;
          if (remoteState) {
            isApplyingRemoteState = true;
            appState = sanitizeStateObject(remoteState);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
            renderAll();
            isApplyingRemoteState = false;
            showToast('Agenda sincronizada em tempo real via Supabase!');
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.error('Erro ao inicializar Supabase:', err);
    updateLiveStatusBadge('Offline / Local', false);
  }
}

function saveState(notifyPeers = true, syncCloud = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  if (notifyPeers && broadcastChannel) {
    broadcastChannel.postMessage({ type: 'STATE_UPDATED', timestamp: Date.now() });
  }
  if (syncCloud) {
    syncStateToSupabase();
  }
}

/**
 * Generates intelligent daily slots for a given dateISO.
 * Respects exact fixed schedules (even with :30 intervals like Isac 20:00-21:30
 * and Shalom 20:30-22:30) and fills remaining open hours with 1-hour (or 30-min) bookable intervals!
 */
function buildDailyScheduleSlots(dateISO) {
  const dateObj = parseISODate(dateISO);
  const dayOfWeek = dateObj.getDay();
  const configuredOpenMin = timeToMinutes(appState.config.openTime || '16:00');
  // Nunca permitir horários antes das 16:00 (sem horários pela manhã)
  const openMin = Math.max(16 * 60, configuredOpenMin);
  const closeMin = timeToMinutes(appState.config.closeTime || '23:00');

  const dayOverride = appState.availabilityOverrides[dateISO] || {
    closedAllDay: false,
    blockedStarts: []
  };

  if (dayOverride.closedAllDay) {
    return [];
  }

  // 1. Gather fixed schedules for this day of week
  const dayFixed = appState.fixedSchedules
    .filter(f => Number(f.dayOfWeek) === dayOfWeek)
    .map(f => ({
      startMin: timeToMinutes(f.startTime),
      endMin: timeToMinutes(f.endTime),
      startTime: f.startTime,
      endTime: f.endTime,
      type: 'FIXED',
      fixedId: f.id,
      clientName: f.clientName,
      price: Number(f.pricePerDay || appState.config.pricePerHourFixed)
    }));

  // 2. Gather confirmed avulso bookings for this specific dateISO
  const dayBookings = appState.bookings.filter(b => b.date === dateISO && b.status !== 'CANCELADO');

  // Create timeline breakpoints using 30-min resolution where needed
  // First, mark occupied intervals from Fixed Schedules
  const occupiedIntervals = [...dayFixed];

  // Also add avulso booked intervals
  dayBookings.forEach(b => {
    b.intervals.forEach(interval => {
      occupiedIntervals.push({
        startMin: timeToMinutes(interval.start),
        endMin: timeToMinutes(interval.end),
        startTime: interval.start,
        endTime: interval.end,
        type: 'BOOKED',
        bookingId: b.id,
        bookingCode: b.code,
        clientName: b.clientName,
        clientPhone: b.clientPhone,
        paymentStatus: b.paymentStatus,
        paymentMethod: b.paymentMethod,
        price: b.totalPrice / b.intervals.length
      });
    });
  });

  occupiedIntervals.sort((a, b) => a.startMin - b.startMin);

  // Fill free gaps between openMin and closeMin
  const finalSlots = [];
  let cursor = openMin;

  for (const occ of occupiedIntervals) {
    if (occ.endMin <= openMin || occ.startMin >= closeMin) continue;

    // Fill free space before this occupied block
    while (cursor < occ.startMin) {
      const remainingToOcc = occ.startMin - cursor;
      let step = 60;
      if (remainingToOcc < 60) {
        step = remainingToOcc; // e.g., 30 min gap before 20:30 (like 20:00 to 20:30 on Saturday)
      } else if (cursor % 60 !== 0 && remainingToOcc >= 30) {
        // Align back to full hour if cursor is at :30 (e.g. 21:30 -> 22:00 on Friday after Isac)
        step = 30;
      }

      const slotStart = minutesToTime(cursor);
      const slotEnd = minutesToTime(cursor + step);
      const isBlockedByAdmin = (dayOverride.blockedStarts || []).includes(slotStart);

      finalSlots.push({
        startTime: slotStart,
        endTime: slotEnd,
        startMin: cursor,
        endMin: cursor + step,
        durationMinutes: step,
        status: isBlockedByAdmin ? 'BLOCKED' : 'AVAILABLE',
        clientName: isBlockedByAdmin ? 'Bloqueado pelo Admin' : 'Horário Livre',
        price: (appState.config.pricePerHourAvulso * step) / 60
      });

      cursor += step;
    }

    // Add the occupied block itself
    finalSlots.push({
      startTime: occ.startTime,
      endTime: occ.endTime,
      startMin: occ.startMin,
      endMin: occ.endMin,
      durationMinutes: occ.endMin - occ.startMin,
      status: occ.type, // 'FIXED' or 'BOOKED'
      clientName: occ.clientName,
      bookingId: occ.bookingId || null,
      bookingCode: occ.bookingCode || null,
      fixedId: occ.fixedId || null,
      price: occ.price
    });

    cursor = Math.max(cursor, occ.endMin);
  }

  // Fill remaining time after last occupied block until closeMin
  while (cursor < closeMin) {
    const remaining = closeMin - cursor;
    let step = 60;
    if (remaining < 60) {
      step = remaining;
    } else if (cursor % 60 !== 0) {
      step = 30;
    }

    const slotStart = minutesToTime(cursor);
    const slotEnd = minutesToTime(cursor + step);
    const isBlockedByAdmin = (dayOverride.blockedStarts || []).includes(slotStart);

    finalSlots.push({
      startTime: slotStart,
      endTime: slotEnd,
      startMin: cursor,
      endMin: cursor + step,
      durationMinutes: step,
      status: isBlockedByAdmin ? 'BLOCKED' : 'AVAILABLE',
      clientName: isBlockedByAdmin ? 'Bloqueado pelo Admin' : 'Horário Livre',
      price: (appState.config.pricePerHourAvulso * step) / 60
    });

    cursor += step;
  }

  return finalSlots;
}

// ==================== UI RENDERING ====================

function renderAll() {
  renderHeroStats();
  renderDaysCarousel();
  renderTimeSlotsGrid();
  renderSelectedSlotsSidebar();
  renderMyBookingsView();
  renderAdminDashboard();
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderHeroStats() {
  const todayISO = toLocalISODate(new Date());
  const todaySlots = buildDailyScheduleSlots(todayISO);
  const openCount = todaySlots.filter(s => s.status === 'AVAILABLE').length;

  document.getElementById('heroOpenSlotsCount').textContent = openCount;
  document.getElementById('heroPricePerHour').textContent = formatCurrency(appState.config.pricePerHourAvulso);
  document.getElementById('heroHoursRange').textContent = `${appState.config.openTime} às ${appState.config.closeTime}`;
}

function renderDaysCarousel() {
  const carousel = document.getElementById('daysCarousel');
  carousel.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    const d = new Date(carouselBaseDate);
    d.setDate(carouselBaseDate.getDate() + i);
    const iso = toLocalISODate(d);
    const slots = buildDailyScheduleSlots(iso);
    const availCount = slots.filter(s => s.status === 'AVAILABLE').length;
    const isClosed = appState.availabilityOverrides[iso]?.closedAllDay;

    const card = document.createElement('div');
    card.className = `day-card ${iso === selectedDateISO ? 'active' : ''}`;
    card.innerHTML = `
      <span class="day-weekday">${WEEKDAY_SHORT[d.getDay()]}</span>
      <span class="day-number">${String(d.getDate()).padStart(2, '0')}</span>
      <span class="day-month">${MONTH_SHORT[d.getMonth()]}</span>
      <span class="day-slots-pill ${isClosed || availCount === 0 ? 'closed' : ''}">
        ${isClosed ? 'Fechado' : `${availCount} livres`}
      </span>
    `;

    card.addEventListener('click', () => {
      selectedDateISO = iso;
      selectedSlotIntervals = [];
      document.getElementById('customDateInput').value = iso;
      renderAll();
    });

    carousel.appendChild(card);
  }

  document.getElementById('customDateInput').value = selectedDateISO;
}

function renderTimeSlotsGrid() {
  const grid = document.getElementById('timeSlotsGrid');
  const closedBanner = document.getElementById('dayClosedNotice');
  const dateObj = parseISODate(selectedDateISO);
  const weekdayName = WEEKDAY_NAMES[dateObj.getDay()];

  document.getElementById('selectedDateBadge').textContent = `${weekdayName} • ${formatDateBR(selectedDateISO)}`;
  document.getElementById('selectedDateTitle').textContent = `Horários em Tempo Real (${weekdayName})`;

  const isClosed = appState.availabilityOverrides[selectedDateISO]?.closedAllDay;
  if (isClosed) {
    closedBanner.classList.remove('hidden');
    grid.innerHTML = '';
    return;
  } else {
    closedBanner.classList.add('hidden');
  }

  const allSlots = buildDailyScheduleSlots(selectedDateISO);

  const filteredSlots = allSlots.filter(slot => {
    if (currentSlotFilter === 'available') return slot.status === 'AVAILABLE';
    if (currentSlotFilter === 'afternoon') return slot.startMin >= 16 * 60 && slot.startMin < 18 * 60;
    if (currentSlotFilter === 'night') return slot.startMin >= 18 * 60;
    return true;
  });

  grid.innerHTML = '';

  filteredSlots.forEach(slot => {
    const isSelected = selectedSlotIntervals.some(s => s.start === slot.startTime && s.end === slot.endTime);
    const card = document.createElement('div');

    let statusClass = 'slot-available';
    let badgeClass = 'badge-available';
    let badgeText = 'Disponível';
    let subtitleText = `${formatCurrency(slot.price)} • Clique p/ reservar`;

    if (slot.status === 'AVAILABLE' && isSelected) {
      statusClass = 'slot-selected';
      badgeClass = 'badge-selected';
      badgeText = 'Selecionado ✓';
      subtitleText = `${formatCurrency(slot.price)} • Clique p/ remover`;
    } else if (slot.status === 'FIXED') {
      statusClass = 'slot-fixed';
      badgeClass = 'badge-fixed';
      badgeText = 'Horário Fixo';
      subtitleText = 'Turma / Mensalista Fixo';
    } else if (slot.status === 'BOOKED') {
      statusClass = 'slot-booked';
      badgeClass = 'badge-booked';
      badgeText = 'Confirmado';
      subtitleText = `Reserva ${slot.bookingCode || ''}`;
    } else if (slot.status === 'BLOCKED') {
      statusClass = 'slot-blocked';
      badgeClass = 'badge-blocked';
      badgeText = 'Indisponível';
      subtitleText = 'Horário bloqueado';
    }

    card.className = `slot-card ${statusClass}`;
    card.innerHTML = `
      <div class="slot-top">
        <span class="slot-time">${slot.startTime} às ${slot.endTime}</span>
        <span class="slot-badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="slot-bottom">
        <span class="slot-owner" title="${slot.clientName}">${slot.clientName}</span>
        <span class="slot-sub">${subtitleText}</span>
      </div>
    `;

    if (slot.status === 'AVAILABLE') {
      card.addEventListener('click', () => toggleSlotSelection(slot));
    }

    grid.appendChild(card);
  });
}

function toggleSlotSelection(slot) {
  const existingIndex = selectedSlotIntervals.findIndex(
    s => s.start === slot.startTime && s.end === slot.endTime
  );

  if (existingIndex >= 0) {
    selectedSlotIntervals.splice(existingIndex, 1);
  } else {
    selectedSlotIntervals.push({
      start: slot.startTime,
      end: slot.endTime,
      durationMinutes: slot.durationMinutes,
      price: slot.price
    });
    selectedSlotIntervals.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  }

  hideFormError();
  renderTimeSlotsGrid();
  renderSelectedSlotsSidebar();
}

function renderSelectedSlotsSidebar() {
  const emptyState = document.getElementById('emptySelectionState');
  const activeList = document.getElementById('activeSelectionList');
  const pillsWrap = document.getElementById('selectedPillsWrap');
  const dateLabel = document.getElementById('selectionDateLabel');
  const durationText = document.getElementById('selectionDurationText');
  const totalPriceEl = document.getElementById('selectionTotalPrice');
  const mobileBar = document.getElementById('mobileStickyBookingBar');
  const mobileCount = document.getElementById('mobileStickyCount');
  const mobilePrice = document.getElementById('mobileStickyPrice');

  if (selectedSlotIntervals.length === 0) {
    emptyState.classList.remove('hidden');
    activeList.classList.add('hidden');
    if (mobileBar) mobileBar.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  activeList.classList.remove('hidden');

  const dObj = parseISODate(selectedDateISO);
  dateLabel.textContent = `${WEEKDAY_NAMES[dObj.getDay()]} (${formatDateBR(selectedDateISO)})`;

  pillsWrap.innerHTML = selectedSlotIntervals
    .map(s => `<span class="selected-slot-pill">${s.start} às ${s.end}</span>`)
    .join('');

  const totalMinutes = selectedSlotIntervals.reduce((acc, s) => acc + s.durationMinutes, 0);
  const hours = totalMinutes / 60;
  const totalPrice = selectedSlotIntervals.reduce((acc, s) => acc + s.price, 0);

  durationText.textContent = `${hours.toLocaleString('pt-BR')}h (${selectedSlotIntervals.length} horário${selectedSlotIntervals.length > 1 ? 's' : ''})`;
  totalPriceEl.textContent = formatCurrency(totalPrice);

  if (mobileBar && mobileCount && mobilePrice) {
    const isClientViewVisible = !document.getElementById('viewClient').classList.contains('hidden');
    mobileBar.classList.toggle('hidden', !isClientViewVisible);
    mobileCount.textContent = `${selectedSlotIntervals.length} horário${selectedSlotIntervals.length > 1 ? 's' : ''} (${hours.toLocaleString('pt-BR')}h)`;
    mobilePrice.textContent = formatCurrency(totalPrice);
  }
}

// ==================== CLIENT BOOKING CONFIRMATION ====================

function showFormError(msg) {
  const el = document.getElementById('bookingFormError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideFormError() {
  const el = document.getElementById('bookingFormError');
  el.classList.add('hidden');
}

function handleClientBookingSubmit(e) {
  e.preventDefault();
  hideFormError();

  if (selectedSlotIntervals.length === 0) {
    showFormError('Por favor, selecione pelo menos um horário disponível na grade ao lado.');
    return;
  }

  const clientName = document.getElementById('clientName').value.trim();
  const clientPhone = document.getElementById('clientPhone').value.trim();
  const rawPlayersVal = document.getElementById('clientPlayers').value;
  const companionsRaw = (document.getElementById('clientCompanionsInput')?.value || '').trim();
  const clientNotes = document.getElementById('clientNotes').value.trim();
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'PIX';

  if (!clientName) {
    showFormError('Informe seu nome ou o nome da sua turma/dupla para confirmar.');
    document.getElementById('clientName').focus();
    return;
  }

  if (!clientPhone) {
    showFormError('Informe um telefone/WhatsApp para identificação da reserva.');
    document.getElementById('clientPhone').focus();
    return;
  }

  // Real-time collision check before saving
  const currentSlots = buildDailyScheduleSlots(selectedDateISO);
  for (const sel of selectedSlotIntervals) {
    const match = currentSlots.find(s => s.startTime === sel.start && s.endTime === sel.end);
    if (!match || match.status !== 'AVAILABLE') {
      showFormError(`O horário ${sel.start} às ${sel.end} acabou de ser ocupado. Escolha outro horário.`);
      renderAll();
      return;
    }
  }

  // Generate sequential codes for the holder + all companions marked
  const totalPeopleCount = Math.max(1, parseInt(rawPlayersVal, 10) || 4);
  const companionNames = companionsRaw
    ? companionsRaw.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const baseNumber = Math.floor(1000 + Math.random() * 8900);
  const participantCodes = [];

  for (let i = 0; i < totalPeopleCount; i++) {
    const currentNum = baseNumber + i;
    const codeStr = `ABP-${currentNum}`;
    let personLabel = '';

    if (i === 0) {
      personLabel = `${clientName} (Titular)`;
    } else {
      const compName = companionNames[i - 1];
      personLabel = compName ? `${compName} (Acompanhante ${i})` : `Pessoa ${i + 1} (Acompanhante ${i})`;
    }

    participantCodes.push({
      code: codeStr,
      name: personLabel,
      isHolder: i === 0
    });
  }

  const mainCode = participantCodes[0].code;
  const playersLabel = totalPeopleCount === 1
    ? '1 Pessoa (Individual)'
    : `${totalPeopleCount} Pessoas (Titular + ${totalPeopleCount - 1})`;

  const totalPrice = selectedSlotIntervals.reduce((acc, s) => acc + s.price, 0);

  const newBooking = {
    id: 'bk-' + Date.now(),
    code: mainCode,
    participantCodes,
    totalPeopleCount,
    date: selectedDateISO,
    intervals: [...selectedSlotIntervals],
    clientName,
    clientPhone,
    players: playersLabel,
    notes: clientNotes,
    paymentMethod,
    paymentStatus: 'PENDENTE',
    totalPrice,
    createdAt: new Date().toISOString()
  };

  appState.bookings.unshift(newBooking);
  selectedSlotIntervals = [];
  saveState(true);

  // Reset form inputs
  document.getElementById('clientName').value = '';
  document.getElementById('clientPhone').value = '';
  const compInput = document.getElementById('clientCompanionsInput');
  if (compInput) compInput.value = '';
  document.getElementById('clientNotes').value = '';

  renderAll();
  openConfirmationReceiptModal(newBooking);
  showToast(`Reserva confirmada! Códigos gerados: ${participantCodes.map(p => p.code).join(', ')}`);
}

function getBookingParticipantCodes(booking) {
  if (Array.isArray(booking.participantCodes) && booking.participantCodes.length > 0) {
    return booking.participantCodes;
  }
  // Fallback for older bookings saved before sequential codes
  const cleanMain = String(booking.code || 'ABP-1000').replace('#', '');
  const numMatch = cleanMain.match(/\d+/);
  const baseNum = numMatch ? parseInt(numMatch[0], 10) : 1000;
  const countMatch = String(booking.players || '4').match(/\d+/);
  const count = countMatch ? Math.max(1, parseInt(countMatch[0], 10)) : 4;
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push({
      code: `ABP-${baseNum + i}`,
      name: i === 0 ? `${booking.clientName} (Titular)` : `Pessoa ${i + 1} (Acompanhante ${i})`,
      isHolder: i === 0
    });
  }
  return list;
}

function openConfirmationReceiptModal(booking) {
  const modal = document.getElementById('confirmationModal');
  const dObj = parseISODate(booking.date);
  const weekday = WEEKDAY_NAMES[dObj.getDay()];
  const slotsText = booking.intervals.map(i => `${i.start} às ${i.end}`).join(', ');
  const pCodes = getBookingParticipantCodes(booking);

  document.getElementById('modalReceiptCode').textContent = pCodes[0].code;
  document.getElementById('modalReceiptName').textContent = `${booking.clientName} (${pCodes.length} pessoa${pCodes.length > 1 ? 's' : ''})`;
  document.getElementById('modalReceiptPhone').textContent = booking.clientPhone;
  document.getElementById('modalReceiptDate').textContent = `${weekday}, ${formatDateBR(booking.date)}`;
  document.getElementById('modalReceiptSlots').textContent = slotsText;
  document.getElementById('modalReceiptPayment').textContent = `${booking.paymentMethod} (${booking.paymentStatus})`;
  document.getElementById('modalReceiptTotal').textContent = formatCurrency(booking.totalPrice);
  document.getElementById('modalPixKeyText').textContent = appState.config.pixKey;

  const countLabel = document.getElementById('modalParticipantsCount');
  if (countLabel) {
    countLabel.textContent = `${pCodes.length} Pessoa${pCodes.length > 1 ? 's' : ''}`;
  }

  const codesGrid = document.getElementById('modalParticipantCodesList');
  if (codesGrid) {
    codesGrid.innerHTML = pCodes.map(p => `
      <div class="participant-code-pill ${p.isHolder ? 'is-holder' : ''}">
        <span class="p-name" title="${p.name}">${p.name}</span>
        <strong class="p-code">${p.code}</strong>
      </div>
    `).join('');
  }

  const createdDate = new Date(booking.createdAt);
  document.getElementById('modalReceiptTimestamp').textContent =
    `Comprovante emitido dentro do sistema em ${createdDate.toLocaleDateString('pt-BR')} às ${createdDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  modal.classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

// ==================== MY BOOKINGS / TICKETS VIEW ====================

function renderMyBookingsView() {
  const container = document.getElementById('myTicketsContainer');
  const query = (document.getElementById('searchTicketInput')?.value || '').trim().toLowerCase();

  const list = appState.bookings.filter(b => {
    if (!query) return true;
    const pCodes = getBookingParticipantCodes(b);
    const matchesParticipant = pCodes.some(
      p => p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)
    );
    return (
      b.clientName.toLowerCase().includes(query) ||
      b.clientPhone.toLowerCase().includes(query) ||
      b.code.toLowerCase().includes(query) ||
      matchesParticipant
    );
  });

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-selection-state" style="grid-column: 1 / -1; justify-content: center; padding: 36px;">
        <i data-lucide="calendar-search"></i>
        <span>Nenhuma reserva avulsa encontrada. Faça sua reserva na aba "Reservar Quadra" para gerar seu comprovante instantâneo!</span>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(b => {
    const dObj = parseISODate(b.date);
    const slotsStr = b.intervals.map(i => `${i.start} às ${i.end}`).join(' • ');
    const isPaid = b.paymentStatus === 'PAGO';
    const pCodes = getBookingParticipantCodes(b);
    const codesRangeLabel = pCodes.length > 1
      ? `${pCodes[0].code} até ${pCodes[pCodes.length - 1].code}`
      : pCodes[0].code;

    return `
      <div class="ticket-card">
        <div class="ticket-card-top">
          <span class="ticket-code">${codesRangeLabel}</span>
          <span class="status-pill ${isPaid ? 'status-paid' : 'status-pending'}">
            ${isPaid ? 'Pagamento Confirmado' : 'Aguardando Pagamento'}
          </span>
        </div>
        <div>
          <strong style="font-size: 1.05rem; display: block;">${b.clientName}</strong>
          <span style="font-size: 0.8rem; color: var(--text-secondary);">${b.clientPhone} • ${b.players}</span>
        </div>
        <div style="background: rgba(7,12,22,0.55); padding: 10px 12px; border-radius: 8px; font-size: 0.84rem;">
          <div><strong>Data:</strong> ${WEEKDAY_NAMES[dObj.getDay()]}, ${formatDateBR(b.date)}</div>
          <div class="text-lime"><strong>Horário:</strong> ${slotsStr}</div>
        </div>
        <div class="participants-codes-grid" style="margin-top: 2px;">
          ${pCodes.map(p => `
            <div class="participant-code-pill ${p.isHolder ? 'is-holder' : ''}">
              <span class="p-name" title="${p.name}">${p.name}</span>
              <strong class="p-code">${p.code}</strong>
            </div>
          `).join('')}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <strong style="font-size: 1.1rem; color: var(--lime-primary);">${formatCurrency(b.totalPrice)}</strong>
          <button class="btn-secondary btn-xs" onclick="reopenReceiptById('${b.id}')">
            Ver Comprovante Oficial
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.reopenReceiptById = function(bookingId) {
  const b = appState.bookings.find(item => item.id === bookingId);
  if (b) openConfirmationReceiptModal(b);
};

// ==================== ADMIN DASHBOARD & TOOLS ====================

function renderAdminDashboard() {
  renderAdminKPIs();
  renderAdminAgendaTable();
  renderAdminAvailabilityConfig();
  renderAdminFixedSchedules();
  renderAdminCashflowTable();
}

function renderAdminKPIs() {
  // Calculate total confirmed income from Cashflow + Paid Bookings
  const incomeEntries = appState.cashflow.filter(tx => tx.type === 'INCOME');
  const expenseEntries = appState.cashflow.filter(tx => tx.type === 'EXPENSE');

  const totalIncome = incomeEntries.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalExpense = expenseEntries.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const netBalance = totalIncome - totalExpense;

  // Calculate pending payments for the selected admin date + all pending bookings
  const adminDate = document.getElementById('adminAgendaDateInput').value || selectedDateISO;
  const dObj = parseISODate(adminDate);
  const dayFixed = appState.fixedSchedules.filter(f => Number(f.dayOfWeek) === dObj.getDay());

  let pendingAmount = 0;
  appState.bookings.forEach(b => {
    if (b.paymentStatus !== 'PAGO') pendingAmount += Number(b.totalPrice);
  });
  dayFixed.forEach(f => {
    const key = `${adminDate}_${f.id}`;
    if (appState.fixedPayments[key]?.status !== 'PAGO') {
      pendingAmount += Number(f.pricePerDay || appState.config.pricePerHourFixed);
    }
  });

  document.getElementById('kpiTotalIncome').textContent = formatCurrency(totalIncome);
  document.getElementById('kpiPendingIncome').textContent = `${formatCurrency(pendingAmount)} pendente a receber`;
  document.getElementById('kpiTotalExpense').textContent = formatCurrency(totalExpense);
  document.getElementById('kpiExpenseCount').textContent = `${expenseEntries.length} lançamentos de saída`;

  const netEl = document.getElementById('kpiNetBalance');
  netEl.textContent = formatCurrency(netBalance);
  netEl.style.color = netBalance >= 0 ? 'var(--lime-primary)' : 'var(--danger)';

  // Occupancy for admin selected date
  const slots = buildDailyScheduleSlots(adminDate);
  const occupied = slots.filter(s => s.status === 'FIXED' || s.status === 'BOOKED').length;
  document.getElementById('kpiTodayOccupancy').textContent = `${occupied} / ${slots.length} horários`;
  document.getElementById('kpiSelectedDateLabel').textContent = `${WEEKDAY_NAMES[dObj.getDay()]} (${formatDateBR(adminDate)})`;
}

function renderAdminAgendaTable() {
  const adminDateInput = document.getElementById('adminAgendaDateInput');
  if (!adminDateInput.value) adminDateInput.value = selectedDateISO;
  const targetDate = adminDateInput.value;
  const paymentFilter = document.getElementById('adminPaymentFilter').value;

  const dObj = parseISODate(targetDate);
  const dayOfWeek = dObj.getDay();

  // Combine Fixed Schedules of this weekday + Avulso Bookings of this date
  const rows = [];

  // 1. Fixed schedules for this weekday
  appState.fixedSchedules
    .filter(f => Number(f.dayOfWeek) === dayOfWeek)
    .forEach(f => {
      const payKey = `${targetDate}_${f.id}`;
      const payRecord = appState.fixedPayments[payKey] || { status: 'PENDENTE', method: 'PIX' };
      rows.push({
        rowType: 'FIXED',
        id: f.id,
        payKey,
        timeLabel: `${f.startTime} às ${f.endTime}`,
        sortMin: timeToMinutes(f.startTime),
        clientName: f.clientName,
        contactInfo: `Horário Fixo (${WEEKDAY_NAMES[dayOfWeek]})`,
        amount: Number(f.pricePerDay || appState.config.pricePerHourFixed),
        paymentStatus: payRecord.status,
        paymentMethod: payRecord.method || 'PIX'
      });
    });

  // 2. Avulso bookings on targetDate
  appState.bookings
    .filter(b => b.date === targetDate)
    .forEach(b => {
      const firstStart = b.intervals[0]?.start || '00:00';
      const pCodes = getBookingParticipantCodes(b);
      const codesSummary = pCodes.map(p => p.code).join(', ');
      rows.push({
        rowType: 'AVULSO',
        id: b.id,
        timeLabel: b.intervals.map(i => `${i.start} às ${i.end}`).join(', '),
        sortMin: timeToMinutes(firstStart),
        clientName: b.clientName,
        contactInfo: `${b.clientPhone} • Códigos: ${codesSummary}`,
        amount: Number(b.totalPrice),
        paymentStatus: b.paymentStatus,
        paymentMethod: b.paymentMethod
      });
    });

  rows.sort((a, b) => a.sortMin - b.sortMin);

  const filteredRows = rows.filter(r => {
    if (paymentFilter === 'all') return true;
    return r.paymentStatus === paymentFilter;
  });

  const tbody = document.getElementById('adminBookingsTableBody');
  if (filteredRows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 28px; color: var(--text-secondary);">
          Nenhum horário reservado ou fixo para este filtro na data ${formatDateBR(targetDate)}.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredRows.map(r => {
    const isPaid = r.paymentStatus === 'PAGO';
    return `
      <tr>
        <td><strong class="text-lime">${r.timeLabel}</strong></td>
        <td><strong>${r.clientName}</strong></td>
        <td>
          <span class="${r.rowType === 'FIXED' ? 'type-pill-fixed' : 'type-pill-avulso'}">
            ${r.rowType === 'FIXED' ? 'FIXO SEMANAL' : 'RESERVA AVULSA'}
          </span>
        </td>
        <td style="color: var(--text-secondary); font-size: 0.8rem;">${r.contactInfo}</td>
        <td><strong>${formatCurrency(r.amount)}</strong></td>
        <td>
          <span class="status-pill ${isPaid ? 'status-paid' : 'status-pending'}">
            ${isPaid ? '✓ PAGO' : '⏳ PENDENTE'} (${r.paymentMethod})
          </span>
        </td>
        <td>
          <div class="table-actions">
            ${
              r.rowType === 'FIXED'
                ? `<button class="btn-secondary btn-xs" onclick="toggleFixedPaymentStatus('${targetDate}', '${r.id}')">
                    ${isPaid ? 'Marcar Pendente' : 'Confirmar Pagamento'}
                   </button>`
                : `<button class="btn-secondary btn-xs" onclick="toggleAvulsoPaymentStatus('${r.id}')">
                    ${isPaid ? 'Marcar Pendente' : 'Confirmar Pagamento'}
                   </button>
                   <button class="btn-secondary btn-xs" onclick="reopenReceiptById('${r.id}')">Comprovante</button>
                   <button class="btn-secondary btn-xs" style="color: var(--danger);" onclick="cancelAvulsoBooking('${r.id}')">Cancelar</button>`
            }
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Toggle Payment for Fixed Schedule on a Specific Date & Sync with Cashflow
window.toggleFixedPaymentStatus = function(dateISO, fixedId) {
  const fixedItem = appState.fixedSchedules.find(f => f.id === fixedId);
  if (!fixedItem) return;

  const key = `${dateISO}_${fixedId}`;
  const current = appState.fixedPayments[key]?.status || 'PENDENTE';
  const nextStatus = current === 'PAGO' ? 'PENDENTE' : 'PAGO';
  const amount = Number(fixedItem.pricePerDay || appState.config.pricePerHourFixed);

  appState.fixedPayments[key] = {
    status: nextStatus,
    method: 'PIX',
    updatedAt: new Date().toISOString()
  };

  const txSourceId = `fixed_${key}`;
  if (nextStatus === 'PAGO') {
    appState.cashflow.unshift({
      id: 'tx-' + Date.now(),
      date: dateISO,
      description: `Pagamento Horário Fixo: ${fixedItem.clientName} (${fixedItem.startTime} às ${fixedItem.endTime})`,
      category: 'Mensalista / Horário Fixo',
      method: 'PIX',
      type: 'INCOME',
      amount,
      sourceId: txSourceId
    });
    showToast(`Pagamento de ${fixedItem.clientName} lançado no Fluxo de Caixa!`);
  } else {
    appState.cashflow = appState.cashflow.filter(tx => tx.sourceId !== txSourceId);
    showToast(`Pagamento de ${fixedItem.clientName} marcado como pendente.`);
  }

  saveState(true);
  renderAll();
};

// Toggle Payment for Avulso Booking & Sync with Cashflow
window.toggleAvulsoPaymentStatus = function(bookingId) {
  const booking = appState.bookings.find(b => b.id === bookingId);
  if (!booking) return;

  booking.paymentStatus = booking.paymentStatus === 'PAGO' ? 'PENDENTE' : 'PAGO';
  const txSourceId = `booking_${booking.id}`;

  if (booking.paymentStatus === 'PAGO') {
    const slotsStr = booking.intervals.map(i => `${i.start}-${i.end}`).join(', ');
    appState.cashflow.unshift({
      id: 'tx-' + Date.now(),
      date: booking.date,
      description: `Reserva ${booking.code} - ${booking.clientName} (${slotsStr})`,
      category: 'Reserva de Quadra Avulsa',
      method: booking.paymentMethod,
      type: 'INCOME',
      amount: Number(booking.totalPrice),
      sourceId: txSourceId
    });
    showToast(`Pagamento de ${booking.clientName} confirmado e somado ao Caixa!`);
  } else {
    appState.cashflow = appState.cashflow.filter(tx => tx.sourceId !== txSourceId);
    showToast(`Pagamento da reserva ${booking.code} voltou para Pendente.`);
  }

  saveState(true);
  renderAll();
};

window.cancelAvulsoBooking = function(bookingId) {
  const idx = appState.bookings.findIndex(b => b.id === bookingId);
  if (idx === -1) return;
  const removed = appState.bookings[idx];
  appState.bookings.splice(idx, 1);
  appState.cashflow = appState.cashflow.filter(tx => tx.sourceId !== `booking_${bookingId}`);
  saveState(true);
  renderAll();
  showToast(`Reserva de ${removed.clientName} cancelada e horário liberado imediatamente!`);
};

// ==================== ADMIN TAB 2: AVAILABILITY & HOURS MANAGER ====================

function populateHourSelects() {
  const openSel = document.getElementById('cfgOpenHour');
  const closeSel = document.getElementById('cfgCloseHour');
  const fixStart = document.getElementById('fixedStartTime');
  const fixEnd = document.getElementById('fixedEndTime');

  // Horários exclusivamente das 16:00 às 23:00 (sem horários pela manhã)
  const times = [];
  for (let m = 16 * 60; m <= 23 * 60; m += 30) {
    times.push(minutesToTime(m));
  }

  const optionsHTML = times.map(t => `<option value="${t}">${t}</option>`).join('');
  openSel.innerHTML = optionsHTML;
  closeSel.innerHTML = optionsHTML;
  fixStart.innerHTML = optionsHTML;
  fixEnd.innerHTML = optionsHTML;

  openSel.value = '16:00';
  closeSel.value = '23:00';
  fixStart.value = '18:00';
  fixEnd.value = '19:00';
}

function renderAdminAvailabilityConfig() {
  document.getElementById('cfgOpenHour').value = appState.config.openTime;
  document.getElementById('cfgCloseHour').value = appState.config.closeTime;
  document.getElementById('cfgPriceAvulso').value = appState.config.pricePerHourAvulso;
  document.getElementById('cfgPriceFixed').value = appState.config.pricePerHourFixed;
  document.getElementById('cfgPixKey').value = appState.config.pixKey;
  const adminPassEl = document.getElementById('cfgAdminPassword');
  if (adminPassEl) adminPassEl.value = appState.config.adminPassword || ADMIN_PASSWORD_DEFAULT;

  const availDateInput = document.getElementById('availManagerDate');
  if (!availDateInput.value) availDateInput.value = selectedDateISO;
  const targetDate = availDateInput.value;

  const override = appState.availabilityOverrides[targetDate] || {
    closedAllDay: false,
    blockedStarts: []
  };

  const toggleBtnText = document.getElementById('toggleEntireDayText');
  toggleBtnText.textContent = override.closedAllDay ? 'Reabrir Data p/ Reservas' : 'Fechar Dia Inteiro';

  const managerGrid = document.getElementById('adminSlotsManagerGrid');
  if (override.closedAllDay) {
    managerGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 18px; color: #FDA4AF;">
        Esta data está inteiramente fechada. Clique em "Reabrir Data p/ Reservas" acima para gerenciar horários individuais.
      </div>
    `;
    return;
  }

  const slots = buildDailyScheduleSlots(targetDate);
  managerGrid.innerHTML = slots.map(slot => {
    const isFixedOrBooked = slot.status === 'FIXED' || slot.status === 'BOOKED';
    const isBlocked = slot.status === 'BLOCKED';
    return `
      <div class="admin-slot-toggle ${isBlocked ? 'is-blocked' : 'is-open'}"
           onclick="handleAdminSlotBlockToggle('${targetDate}', '${slot.startTime}', '${slot.status}')">
        <strong style="font-size: 0.9rem;">${slot.startTime} - ${slot.endTime}</strong>
        <span style="font-size: 0.72rem; color: var(--text-secondary);">
          ${
            slot.status === 'AVAILABLE'
              ? '🟢 Liberado (Clique p/ bloquear)'
              : slot.status === 'BLOCKED'
              ? '🔴 Bloqueado (Clique p/ liberar)'
              : `🔒 Ocupado: ${slot.clientName}`
          }
        </span>
      </div>
    `;
  }).join('');
}

window.handleAdminSlotBlockToggle = function(dateISO, startTime, currentStatus) {
  if (currentStatus === 'FIXED' || currentStatus === 'BOOKED') {
    showToast('Este horário já possui um cliente fixo ou reserva confirmada.');
    return;
  }

  if (!appState.availabilityOverrides[dateISO]) {
    appState.availabilityOverrides[dateISO] = { closedAllDay: false, blockedStarts: [] };
  }

  const blocked = appState.availabilityOverrides[dateISO].blockedStarts || [];
  const idx = blocked.indexOf(startTime);
  if (idx >= 0) {
    blocked.splice(idx, 1);
    showToast(`Horário ${startTime} liberado em ${formatDateBR(dateISO)}!`);
  } else {
    blocked.push(startTime);
    showToast(`Horário ${startTime} bloqueado em ${formatDateBR(dateISO)}.`);
  }

  appState.availabilityOverrides[dateISO].blockedStarts = blocked;
  saveState(true);
  renderAll();
};

// ==================== ADMIN TAB 3: FIXED SCHEDULES ====================

function renderAdminFixedSchedules() {
  const tbody = document.getElementById('fixedSchedulesTableBody');
  const sorted = [...appState.fixedSchedules].sort((a, b) => {
    const dayA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const dayB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    if (dayA !== dayB) return dayA - dayB;
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  tbody.innerHTML = sorted.map(item => `
    <tr>
      <td><strong>${WEEKDAY_NAMES[item.dayOfWeek]}</strong></td>
      <td><span class="text-lime" style="font-weight:700;">${item.startTime} às ${item.endTime}</span></td>
      <td><strong>${item.clientName}</strong></td>
      <td>${formatCurrency(item.pricePerDay || appState.config.pricePerHourFixed)}</td>
      <td>
        <button class="btn-secondary btn-xs" style="color: var(--danger);" onclick="removeFixedSchedule('${item.id}')">
          Remover Fixo
        </button>
      </td>
    </tr>
  `).join('');

  // Also populate public showcase modal
  const showcase = document.getElementById('publicFixedShowcase');
  if (showcase) {
    showcase.innerHTML = sorted.map(item => `
      <div class="fixed-showcase-item">
        <span class="type-pill-fixed">${WEEKDAY_NAMES[item.dayOfWeek]}</span>
        <strong style="display:block; font-size: 1.05rem; margin-top: 8px;">${item.clientName}</strong>
        <span class="text-lime" style="font-size: 0.88rem; font-weight: 700;">⏰ ${item.startTime} às ${item.endTime}</span>
      </div>
    `).join('');
  }
}

window.removeFixedSchedule = function(fixedId) {
  appState.fixedSchedules = appState.fixedSchedules.filter(f => f.id !== fixedId);
  saveState(true);
  renderAll();
  showToast('Horário fixo removido da grade semanal.');
};

// ==================== ADMIN TAB 4: CASHFLOW & EXPENSES ====================

function renderAdminCashflowTable() {
  const filter = document.getElementById('cashflowTypeFilter').value;
  const tbody = document.getElementById('cashflowTableBody');

  const list = appState.cashflow.filter(tx => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 24px; color: var(--text-secondary);">
          Nenhuma movimentação registrada para este filtro.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(tx => {
    const isIncome = tx.type === 'INCOME';
    return `
      <tr>
        <td>${formatDateBR(tx.date)}</td>
        <td><strong>${tx.description}</strong></td>
        <td style="color: var(--text-secondary);">${tx.category}</td>
        <td>${tx.method}</td>
        <td>
          <span class="status-pill ${isIncome ? 'status-paid' : ''}"
                style="${!isIncome ? 'background: var(--danger-soft); color: #FB7185;' : ''}">
            ${isIncome ? '+ Entrada' : '- Despesa'}
          </span>
        </td>
        <td style="font-weight: 800; color: ${isIncome ? '#34D399' : '#FB7185'};">
          ${isIncome ? '+' : '-'} ${formatCurrency(tx.amount)}
        </td>
        <td>
          <button class="btn-secondary btn-xs" style="color: var(--danger);" onclick="deleteCashflowEntry('${tx.id}')">
            Excluir
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.deleteCashflowEntry = function(txId) {
  appState.cashflow = appState.cashflow.filter(tx => tx.id !== txId);
  saveState(true);
  renderAll();
  showToast('Lançamento removido do fluxo de caixa.');
};

// ==================== TOAST HELPER ====================

function showToast(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>⚡ ${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 3600);
}

// ==================== INITIALIZATION & EVENT LISTENERS ====================

document.addEventListener('DOMContentLoaded', () => {
  populateHourSelects();
  loadState();

  // Set default dates in inputs
  const todayISO = toLocalISODate(new Date());
  document.getElementById('customDateInput').value = todayISO;
  document.getElementById('adminAgendaDateInput').value = todayISO;
  document.getElementById('availManagerDate').value = todayISO;
  document.getElementById('txDate').value = todayISO;

  // Setup Real-Time Synchronization across browser tabs/windows
  if ('BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(REALTIME_CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      if (event.data && event.data.type === 'STATE_UPDATED') {
        loadState();
        renderAll();
        showToast('Agenda atualizada em tempo real!');
      }
    };
  }

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      loadState();
      renderAll();
    }
  });

  // Top Navigation Mode Switcher
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      if (mode === 'admin' && sessionStorage.getItem(ADMIN_AUTH_SESSION_KEY) !== 'true') {
        openAdminAuthModal();
        return;
      }

      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.getElementById('viewClient').classList.toggle('hidden', mode !== 'client');
      document.getElementById('viewMyBookings').classList.toggle('hidden', mode !== 'my-bookings');
      document.getElementById('viewAdmin').classList.toggle('hidden', mode !== 'admin');
      renderAll();
    });
  });

  // Hidden Admin Access & Authentication Logic
  const navAdminBtn = document.getElementById('navAdminBtn');
  const adminLockBtn = document.getElementById('adminLockBtn');
  const adminAuthModal = document.getElementById('adminAuthModal');
  const adminPasswordInput = document.getElementById('adminPasswordInput');
  const adminAuthError = document.getElementById('adminAuthError');

  function syncAdminVisibility() {
    const isAdminUnlocked = sessionStorage.getItem(ADMIN_AUTH_SESSION_KEY) === 'true';
    if (isAdminUnlocked) {
      navAdminBtn.classList.remove('hidden');
      adminLockBtn.classList.add('unlocked');
      adminLockBtn.title = 'Painel Admin Liberado (Clique para ir ao painel)';
    } else {
      navAdminBtn.classList.add('hidden');
      adminLockBtn.classList.remove('unlocked');
      adminLockBtn.title = 'Acesso Restrito do Administrador';
      if (!document.getElementById('viewAdmin').classList.contains('hidden')) {
        document.getElementById('navClientBtn').click();
      }
    }
  }

  function openAdminAuthModal() {
    adminAuthError.classList.add('hidden');
    adminPasswordInput.value = '';
    adminAuthModal.classList.remove('hidden');
    setTimeout(() => adminPasswordInput.focus(), 50);
    if (window.lucide) window.lucide.createIcons();
  }

  function closeAdminAuthModal() {
    adminAuthModal.classList.add('hidden');
  }

  adminLockBtn.addEventListener('click', () => {
    const isAdminUnlocked = sessionStorage.getItem(ADMIN_AUTH_SESSION_KEY) === 'true';
    if (isAdminUnlocked) {
      navAdminBtn.click();
    } else {
      openAdminAuthModal();
    }
  });

  document.getElementById('closeAdminAuthModalBtn').addEventListener('click', closeAdminAuthModal);
  document.getElementById('cancelAdminAuthBtn').addEventListener('click', closeAdminAuthModal);

  document.getElementById('adminAuthForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const typedPass = adminPasswordInput.value.trim();
    const savedCustomPass = localStorage.getItem(ADMIN_CUSTOM_PASS_KEY);
    const configPass = appState.config.adminPassword;

    const isMatch =
      typedPass === configPass ||
      (savedCustomPass && typedPass === savedCustomPass) ||
      typedPass === ADMIN_PASSWORD_DEFAULT;

    if (isMatch) {
      sessionStorage.setItem(ADMIN_AUTH_SESSION_KEY, 'true');
      closeAdminAuthModal();
      syncAdminVisibility();
      navAdminBtn.click();
      showToast('Acesso de Administrador liberado com sucesso!');
    } else {
      adminAuthError.classList.remove('hidden');
      adminPasswordInput.select();
    }
  });

  document.getElementById('adminLogoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
    syncAdminVisibility();
    document.getElementById('navClientBtn').click();
    showToast('Painel Admin bloqueado e ocultado para usuários.');
  });

  // Shortcut: Ctrl + Shift + A to open Admin Login
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      openAdminAuthModal();
    }
  });

  syncAdminVisibility();

  // Admin Sub-navigation Tabs
  document.querySelectorAll('.admin-tab-btn').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');

      const target = tabBtn.getAttribute('data-admintab');
      document.getElementById('adminTabOverview').classList.toggle('hidden', target !== 'overview');
      document.getElementById('adminTabAvailability').classList.toggle('hidden', target !== 'availability');
      document.getElementById('adminTabFixed').classList.toggle('hidden', target !== 'fixed');
      document.getElementById('adminTabCashflow').classList.toggle('hidden', target !== 'cashflow');
      renderAll();
    });
  });

  // Carousel Navigation Controls
  document.getElementById('prevWeekBtn').addEventListener('click', () => {
    carouselBaseDate.setDate(carouselBaseDate.getDate() - 7);
    renderDaysCarousel();
  });

  document.getElementById('nextWeekBtn').addEventListener('click', () => {
    carouselBaseDate.setDate(carouselBaseDate.getDate() + 7);
    renderDaysCarousel();
  });

  document.getElementById('todayJumpBtn').addEventListener('click', () => {
    carouselBaseDate = new Date();
    selectedDateISO = toLocalISODate(new Date());
    selectedSlotIntervals = [];
    renderAll();
  });

  document.getElementById('customDateInput').addEventListener('change', (e) => {
    if (!e.target.value) return;
    selectedDateISO = e.target.value;
    carouselBaseDate = parseISODate(selectedDateISO);
    selectedSlotIntervals = [];
    renderAll();
  });

  // Slot Filter Chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentSlotFilter = chip.getAttribute('data-filter');
      renderTimeSlotsGrid();
    });
  });

  document.getElementById('clearSelectionBtn').addEventListener('click', () => {
    selectedSlotIntervals = [];
    renderTimeSlotsGrid();
    renderSelectedSlotsSidebar();
  });

  // Client Booking Form Submit
  document.getElementById('clientBookingForm').addEventListener('submit', handleClientBookingSubmit);

  // Search Tickets Input
  document.getElementById('searchTicketInput').addEventListener('input', renderMyBookingsView);

  // Confirmation Modal Controls
  document.getElementById('closeConfirmationModalBtn').addEventListener('click', () => {
    document.getElementById('confirmationModal').classList.add('hidden');
  });

  document.getElementById('copyPixKeyBtn').addEventListener('click', () => {
    navigator.clipboard?.writeText(appState.config.pixKey);
    showToast('Chave PIX copiada para a área de transferência!');
  });

  document.getElementById('printReceiptBtn').addEventListener('click', () => {
    window.print();
  });

  // Fixed Schedules Showcase Modal
  document.getElementById('openFixedScheduleModalBtn').addEventListener('click', () => {
    renderAdminFixedSchedules();
    document.getElementById('fixedScheduleModal').classList.remove('hidden');
  });

  document.getElementById('closeFixedModalBtn').addEventListener('click', () => {
    document.getElementById('fixedScheduleModal').classList.add('hidden');
  });

  // Admin Agenda Filters
  document.getElementById('adminAgendaDateInput').addEventListener('change', (e) => {
    if (e.target.value) renderAdminDashboard();
  });

  document.getElementById('adminPaymentFilter').addEventListener('change', renderAdminAgendaTable);

  document.getElementById('adminNewManualBookingBtn').addEventListener('click', () => {
    const targetDate = document.getElementById('adminAgendaDateInput').value || selectedDateISO;
    selectedDateISO = targetDate;
    document.getElementById('navClientBtn').click();
    showToast('Selecione o horário livre na agenda para lançar a reserva.');
  });

  // Admin Global Config Form
  document.getElementById('adminGlobalConfigForm').addEventListener('submit', (e) => {
    e.preventDefault();
    appState.config.openTime = document.getElementById('cfgOpenHour').value;
    appState.config.closeTime = document.getElementById('cfgCloseHour').value;
    appState.config.pricePerHourAvulso = Number(document.getElementById('cfgPriceAvulso').value);
    appState.config.pricePerHourFixed = Number(document.getElementById('cfgPriceFixed').value);
    appState.config.pixKey = document.getElementById('cfgPixKey').value.trim();
    const newPass = document.getElementById('cfgAdminPassword')?.value.trim();
    if (newPass) {
      appState.config.adminPassword = newPass;
      localStorage.setItem(ADMIN_CUSTOM_PASS_KEY, newPass);
    }

    saveState(true);
    renderAll();
    showToast('Configurações de horário e valores salvas em tempo real!');
  });

  // Admin Per-Date Availability Controls
  document.getElementById('availManagerDate').addEventListener('change', renderAdminAvailabilityConfig);

  document.getElementById('toggleEntireDayBtn').addEventListener('click', () => {
    const targetDate = document.getElementById('availManagerDate').value || selectedDateISO;
    if (!appState.availabilityOverrides[targetDate]) {
      appState.availabilityOverrides[targetDate] = { closedAllDay: false, blockedStarts: [] };
    }
    const nextClosed = !appState.availabilityOverrides[targetDate].closedAllDay;
    appState.availabilityOverrides[targetDate].closedAllDay = nextClosed;
    saveState(true);
    renderAll();
    showToast(nextClosed ? `Data ${formatDateBR(targetDate)} fechada para reservas.` : `Data ${formatDateBR(targetDate)} reaberta!`);
  });

  document.getElementById('unlockAllDaySlotsBtn').addEventListener('click', () => {
    const targetDate = document.getElementById('availManagerDate').value || selectedDateISO;
    appState.availabilityOverrides[targetDate] = { closedAllDay: false, blockedStarts: [] };
    saveState(true);
    renderAll();
    showToast(`Todos os horários disponíveis de ${formatDateBR(targetDate)} foram liberados!`);
  });

  // Admin Add Fixed Schedule Form
  document.getElementById('addFixedScheduleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const clientName = document.getElementById('fixedClientName').value.trim();
    const dayOfWeek = Number(document.getElementById('fixedDayOfWeek').value);
    const startTime = document.getElementById('fixedStartTime').value;
    const endTime = document.getElementById('fixedEndTime').value;
    const pricePerDay = Number(document.getElementById('fixedCustomPrice').value || 40);

    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      showToast('O horário de término deve ser maior que o de início.');
      return;
    }

    appState.fixedSchedules.push({
      id: 'fix-' + Date.now(),
      dayOfWeek,
      startTime,
      endTime,
      clientName,
      pricePerDay
    });

    document.getElementById('fixedClientName').value = '';
    saveState(true);
    renderAll();
    showToast(`Horário fixo cadastrado para ${clientName}!`);
  });

  // Admin Cashflow Form (Expenses & Extra Incomes)
  document.getElementById('cashflowEntryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.querySelector('input[name="txType"]:checked')?.value || 'EXPENSE';
    const description = document.getElementById('txDescription').value.trim();
    const category = document.getElementById('txCategory').value;
    const amount = Number(document.getElementById('txAmount').value);
    const date = document.getElementById('txDate').value || toLocalISODate(new Date());
    const method = document.getElementById('txMethod').value;

    if (!description || amount <= 0) return;

    appState.cashflow.unshift({
      id: 'tx-' + Date.now(),
      date,
      description,
      category,
      method,
      type,
      amount,
      sourceId: null
    });

    document.getElementById('txDescription').value = '';
    document.getElementById('txAmount').value = '';

    saveState(true);
    renderAll();
    showToast(type === 'EXPENSE' ? 'Despesa registrada no fluxo de caixa!' : 'Receita extra adicionada ao caixa!');
  });

  document.getElementById('cashflowTypeFilter').addEventListener('change', renderAdminCashflowTable);

  // Mobile Sticky Bar Jump to Form
  const mobileJumpBtn = document.getElementById('mobileStickyJumpBtn');
  if (mobileJumpBtn) {
    mobileJumpBtn.addEventListener('click', () => {
      const formEl = document.getElementById('clientBookingForm');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => document.getElementById('clientName')?.focus(), 400);
      }
    });
  }

  // Initial full render & Cloud Sync
  renderAll();
  initSupabaseIntegration();
});
