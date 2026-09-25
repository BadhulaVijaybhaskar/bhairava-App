import type {
  AuthSession, BookingSummary, CustomerSummary, DocumentSummary, LayoutSummary,
  LeadSummary, PaymentSummary, PlotSummary, ProjectSummary, PublicUser,
  ReservationSummary, VisitSummary,
} from './types';

export * from './types';
export type {
  ProjectSummary as ProjectSummary,
  PlotSummary as PlotSummary,
};

export type TokenStore = {
  getAccessToken(): string | null | Promise<string | null>;
  getRefreshToken(): string | null | Promise<string | null>;
  setTokens(access: string, refresh?: string | null): void | Promise<void>;
  clear(): void | Promise<void>;
};

export type ApiClientOptions = {
  baseUrl: string;
  tokens?: TokenStore;
  onUnauthorized?: () => void;
};

export function createMemoryTokenStore(): TokenStore & { access: string | null; refresh: string | null } {
  const store = {
    access: null as string | null,
    refresh: null as string | null,
    getAccessToken: async () => store.access,
    getRefreshToken: async () => store.refresh,
    setTokens: async (access: string, refresh?: string | null) => {
      store.access = access;
      if (refresh !== undefined) store.refresh = refresh;
    },
    clear: async () => {
      store.access = null;
      store.refresh = null;
    },
  };
  return store;
}

export function createApiClient(opts: ApiClientOptions) {
  const onUnauthorized = opts.onUnauthorized ?? (opts as any).onUnauthorized;
  const base = opts.baseUrl.replace(/\/$/, '');

  /** Single in-flight refresh shared by concurrent 401s (prevents reuse detection). */
  let refreshInFlight: Promise<string | null> | null = null;
  let unauthorizedNotified = false;

  function notifyUnauthorizedOnce() {
    if (unauthorizedNotified) return;
    unauthorizedNotified = true;
    onUnauthorized?.();
  }

  function resetUnauthorizedGate() {
    unauthorizedNotified = false;
  }

  async function performRefresh(): Promise<string | null> {
    if (!opts.tokens) return null;
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
      try {
        const refresh = await opts.tokens!.getRefreshToken();
        const refreshed = await fetch(base + '/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          credentials: 'include',
          body: JSON.stringify(refresh ? { refreshToken: refresh } : {}),
        });
        if (!refreshed.ok) {
          await opts.tokens!.clear();
          notifyUnauthorizedOnce();
          return null;
        }
        const data = (await refreshed.json()) as AuthSession;
        await opts.tokens!.setTokens(data.accessToken, data.refreshToken ?? null);
        resetUnauthorizedGate();
        return data.accessToken;
      } catch {
        await opts.tokens!.clear();
        notifyUnauthorizedOnce();
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();

    return refreshInFlight;
  }

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    flags: { skipAuthRefresh?: boolean } = {},
  ): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    const access = opts.tokens ? await opts.tokens.getAccessToken() : null;
    if (access) headers.Authorization = 'Bearer ' + access;

    async function doFetch(h: Record<string, string>) {
      return fetch(base + path, {
        method,
        headers: h,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'include',
      });
    }

    let res = await doFetch(headers);
    const isRefreshPath = path === '/api/auth/refresh' || path.startsWith('/api/auth/refresh?');
    if (res.status === 401 && opts.tokens && !flags.skipAuthRefresh && !isRefreshPath) {
      const newAccess = await performRefresh();
      if (newAccess) {
        headers.Authorization = 'Bearer ' + newAccess;
        res = await doFetch(headers);
      } else {
        throw new Error('Unauthorized');
      }
    }
    if (!res.ok) {
      if (res.status === 401) notifyUnauthorizedOnce();
      const text = await res.text();
      throw new Error(method + ' ' + path + ' → ' + res.status + ' ' + text);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  return {
    /** Expose for session boot / tests — shares the serialized refresh promise. */
    _performRefresh: performRefresh,
    auth: {
      login: async (email: string, password: string) => {
        const session = await request<AuthSession>('POST', '/api/auth/login', { email, password }, { skipAuthRefresh: true });
        if (opts.tokens) await opts.tokens.setTokens(session.accessToken, session.refreshToken ?? null);
        resetUnauthorizedGate();
        return session;
      },
      /**
       * Refresh session. Prefer HTTP-only cookie (empty body) for web;
       * optional body refreshToken for native clients that store a refresh token securely.
       * Never write refresh tokens to localStorage — callers control the TokenStore.
       */
      refresh: (refreshToken?: string) =>
        request<AuthSession>(
          'POST',
          '/api/auth/refresh',
          refreshToken ? { refreshToken } : {},
          { skipAuthRefresh: true },
        ),
      /** Boot helper: restore access from cookie/refresh without redirect thrash. */
      restoreSession: async () => {
        if (!opts.tokens) return null;
        const existing = await opts.tokens.getAccessToken();
        if (existing) return existing;
        return performRefresh();
      },
      logout: async (refreshToken?: string) => {
        const out = await request<{ ok: boolean }>(
          'POST',
          '/api/auth/logout',
          refreshToken ? { refreshToken } : {},
          { skipAuthRefresh: true },
        );
        if (opts.tokens) await opts.tokens.clear();
        return out;
      },
      me: () => request<{ user: PublicUser }>('GET', '/api/auth/me'),
    },
    projects: {
      list: (lifecycleStatus?: string) =>
        request<ProjectSummary[]>(
          'GET',
          '/api/projects' + (lifecycleStatus ? '?lifecycleStatus=' + encodeURIComponent(lifecycleStatus) : ''),
        ),
      get: (id: string) => request<ProjectSummary>('GET', '/api/projects/' + id),
      create: (body: { name: string; code: string; city?: string; state?: string; location?: string; description?: string }) =>
        request<ProjectSummary>('POST', '/api/projects', body),
      update: (id: string, body: Record<string, unknown>) => request<ProjectSummary>('PATCH', '/api/projects/' + id, body),
      setup: (id: string) => request<Record<string, unknown>>('GET', '/api/projects/' + id + '/setup'),
      addPlotType: (id: string, body: Record<string, unknown>) =>
        request<Record<string, unknown>>('POST', '/api/projects/' + id + '/plot-types', body),
      removePlotType: (id: string, plotTypeId: string) =>
        request<{ ok: boolean }>('DELETE', '/api/projects/' + id + '/plot-types/' + plotTypeId),
      upsertPricing: (id: string, body: { baseRatePerSqYd: string; rulesJson?: Record<string, unknown> }) =>
        request<Record<string, unknown>>('PUT', '/api/projects/' + id + '/pricing', body),
      addAmenity: (id: string, body: Record<string, unknown>) =>
        request<Record<string, unknown>>('POST', '/api/projects/' + id + '/amenities', body),
      removeAmenity: (id: string, amenityId: string) =>
        request<{ ok: boolean }>('DELETE', '/api/projects/' + id + '/amenities/' + amenityId),
      addPhase: (id: string, body: Record<string, unknown>) =>
        request<Record<string, unknown>>('POST', '/api/projects/' + id + '/phases', body),
      updatePhase: (id: string, phaseId: string, body: Record<string, unknown>) =>
        request<Record<string, unknown>>('PATCH', '/api/projects/' + id + '/phases/' + phaseId, body),
      removePhase: (id: string, phaseId: string) =>
        request<{ ok: boolean }>('DELETE', '/api/projects/' + id + '/phases/' + phaseId),
      addBlock: (id: string, body: Record<string, unknown>) =>
        request<Record<string, unknown>>('POST', '/api/projects/' + id + '/blocks', body),
      updateBlock: (id: string, blockId: string, body: Record<string, unknown>) =>
        request<Record<string, unknown>>('PATCH', '/api/projects/' + id + '/blocks/' + blockId, body),
      removeBlock: (id: string, blockId: string) =>
        request<{ ok: boolean }>('DELETE', '/api/projects/' + id + '/blocks/' + blockId),
      mediaList: (id: string) => request<Record<string, unknown>>('GET', '/api/projects/' + id + '/media'),
      mediaUpload: (id: string, body: Record<string, unknown>) =>
        request<Record<string, unknown>>('POST', '/api/projects/' + id + '/media', body),
    },
    plots: {
      listByProject: (projectId: string) => request<PlotSummary[]>('GET', '/api/plots/project/' + projectId),
      setPolygon: (plotId: string, body: { points: unknown; replaceExisting?: boolean; layoutId?: string }) =>
        request<PlotSummary>('POST', '/api/plots/' + plotId + '/polygon', body),
      clearPolygon: (plotId: string) => request<PlotSummary>('DELETE', '/api/plots/' + plotId + '/polygon'),
    },
    layouts: {
      list: (projectId: string) => request<LayoutSummary[]>('GET', '/api/projects/' + projectId + '/layouts'),
      get: (id: string) => request<LayoutSummary>('GET', '/api/layouts/' + id),
      create: (body: Record<string, unknown>) =>
        request<{ layout: LayoutSummary; upload?: unknown }>('POST', '/api/layouts', body),
      relinkPolygon: (body: { sourcePlotId: string; targetPlotId: string }) =>
        request<{ ok: boolean }>('POST', '/api/layouts/relink-polygon', body),
    },
    customers: {
      list: () => request<CustomerSummary[]>('GET', '/api/customers'),
      get: (id: string) => request<CustomerSummary>('GET', '/api/customers/' + id),
      create: (body: { name: string; phone: string; email?: string; city?: string }) =>
        request<CustomerSummary>('POST', '/api/customers', body),
    },
    leads: {
      list: (projectId?: string) =>
        request<LeadSummary[]>('GET', '/api/leads' + (projectId ? '?projectId=' + projectId : '')),
      create: (body: Record<string, unknown>) => request<LeadSummary>('POST', '/api/leads', body),
      updateStage: (id: string, stage: string, notes?: string) =>
        request<LeadSummary>('PATCH', '/api/leads/' + id + '/stage', { stage, notes }),
    },
    visits: {
      list: (projectId?: string) =>
        request<VisitSummary[]>('GET', '/api/visits' + (projectId ? '?projectId=' + projectId : '')),
      create: (body: Record<string, unknown>) => request<VisitSummary>('POST', '/api/visits', body),
      updateStatus: (id: string, status: string, notes?: string) =>
        request<VisitSummary>('PATCH', '/api/visits/' + id + '/status', { status, notes }),
    },
    reservations: {
      list: (q?: { projectId?: string; state?: string }) => {
        const params = new URLSearchParams();
        if (q?.projectId) params.set('projectId', q.projectId);
        if (q?.state) params.set('state', q.state);
        const qs = params.toString();
        return request<ReservationSummary[]>('GET', '/api/reservations' + (qs ? '?' + qs : ''));
      },
      create: (body: {
        plotId: string; customerId: string; agentId?: string; leadId?: string; holdHours?: number; notes?: string;
      }) => request<ReservationSummary>('POST', '/api/reservations', body),
      cancelRequest: (id: string, reason?: string) =>
        request<Record<string, unknown>>('POST', '/api/reservations/' + id + '/cancel-request', { reason }),
    },
    bookings: {
      list: (q?: { projectId?: string; customerId?: string }) => {
        const params = new URLSearchParams();
        if (q?.projectId) params.set('projectId', q.projectId);
        if (q?.customerId) params.set('customerId', q.customerId);
        const qs = params.toString();
        return request<BookingSummary[]>('GET', '/api/bookings' + (qs ? '?' + qs : ''));
      },
      create: (body: {
        plotId: string; customerId: string; agreementValuePaise: string;
        reservationId?: string; agentId?: string; advancePaise?: string; notes?: string;
      }) => request<BookingSummary>('POST', '/api/bookings', body),
    },
    payments: {
      list: (q?: { bookingId?: string; projectId?: string }) => {
        const params = new URLSearchParams();
        if (q?.bookingId) params.set('bookingId', q.bookingId);
        if (q?.projectId) params.set('projectId', q.projectId);
        const qs = params.toString();
        return request<PaymentSummary[]>('GET', '/api/payments' + (qs ? '?' + qs : ''));
      },
      get: (id: string) => request<PaymentSummary>('GET', '/api/payments/' + id),
      create: (body: Record<string, unknown>) => request<PaymentSummary>('POST', '/api/payments', body),
      void: (id: string, reason: string) =>
        request<PaymentSummary>('POST', '/api/payments/' + id + '/void', { reason }),
    },
    documents: {
      list: (q?: { projectId?: string; bookingId?: string; customerId?: string }) => {
        const params = new URLSearchParams();
        if (q?.projectId) params.set('projectId', q.projectId);
        if (q?.bookingId) params.set('bookingId', q.bookingId);
        if (q?.customerId) params.set('customerId', q.customerId);
        const qs = params.toString();
        return request<DocumentSummary[]>('GET', '/api/documents' + (qs ? '?' + qs : ''));
      },
      create: (body: Record<string, unknown>) =>
        request<{ document: DocumentSummary; upload?: unknown }>('POST', '/api/documents', body),
      download: (id: string) =>
        request<{ document: DocumentSummary; download: { downloadUrl: string } }>(
          'GET',
          '/api/documents/' + id + '/download',
        ),
      verify: (id: string) =>
        request<Record<string, unknown>>('PATCH', '/api/documents/' + id + '/verify'),
    },
    audit: {
      list: (q?: { take?: number; action?: string; entityType?: string }) => {
        const params = new URLSearchParams();
        if (q?.take) params.set('take', String(q.take));
        if (q?.action) params.set('action', q.action);
        if (q?.entityType) params.set('entityType', q.entityType);
        const qs = params.toString();
        return request<Array<Record<string, unknown>>>('GET', '/api/audit' + (qs ? '?' + qs : ''));
      },
    },
    agents: {
      list: () => request<Array<Record<string, unknown>>>('GET', '/api/agents'),
    },
    receipts: {
      list: () => request<Array<Record<string, unknown>>>('GET', '/api/receipts'),
      get: (id: string) => request<Record<string, unknown>>('GET', '/api/receipts/' + id),
    },
    commissions: {
      list: () => request<Array<Record<string, unknown>>>('GET', '/api/commissions'),
    },
    paymentSchedules: {
      list: (bookingId?: string) =>
        request<Array<Record<string, unknown>>>(
          'GET',
          '/api/payment-schedules' + (bookingId ? '?bookingId=' + bookingId : ''),
        ),
    },
    registrations: {
      list: () => request<Array<Record<string, unknown>>>('GET', '/api/registrations'),
    },
    resales: {
      list: () => request<Array<Record<string, unknown>>>('GET', '/api/resales'),
    },
    users: {
      list: () => request<Array<Record<string, unknown>>>('GET', '/api/users'),
    },
    companySettings: {
      get: () => request<Record<string, unknown>>('GET', '/api/company-settings'),
      update: (settingsJson: Record<string, unknown>) =>
        request<Record<string, unknown>>('PUT', '/api/company-settings', { settingsJson }),
    },
    reports: {
      summary: () => request<Record<string, unknown>>('GET', '/api/reports/summary'),
    },
    notifications: {
      list: (q?: { unreadOnly?: boolean; take?: number }) => {
        const params = new URLSearchParams();
        if (q?.unreadOnly) params.set('unreadOnly', 'true');
        if (q?.take) params.set('take', String(q.take));
        const qs = params.toString();
        return request<Array<Record<string, unknown>>>('GET', '/api/notifications' + (qs ? '?' + qs : ''));
      },
      markRead: (id: string) => request<Record<string, unknown>>('PATCH', '/api/notifications/' + id + '/read'),
      markAllRead: () => request<{ updated: number }>('POST', '/api/notifications/read-all'),
    },
    health: () => request<{ ok: boolean }>('GET', '/api/health'),
  };
}

export type BhairavaApi = ReturnType<typeof createApiClient>;
