/**
 * TanStack Query hooks and the query-key factory.
 *
 * Keys are built from one root (`['lacocha']`) so the live stream can invalidate a whole family by
 * prefix: `keys.pond(id)` matches the pond, its readings, its daily table and its forecast.
 * Mutations that change a list use an optimistic update with rollback (attend alert/finding); the
 * rest simply set or invalidate what the server returned.
 */
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import * as api from './endpoints'
import type {
  AlertFilters,
  AlertResponse,
  BatchCreate,
  BatchFilters,
  BatchUpdate,
  DeviceUpdate,
  FindingResponse,
  PondCreate,
  PondUpdate,
  ReadingQuery,
  SyncLogFilters,
  UserUpdate,
  UUID,
} from './types'

export const keys = {
  all: ['lacocha'] as const,

  ponds: () => [...keys.all, 'estanques'] as const,
  pond: (id: UUID) => [...keys.ponds(), id] as const,
  pondReadings: (id: UUID, query: ReadingQuery) =>
    [...keys.pond(id), 'lecturas', query] as const,
  pondDaily: (id: UUID, dias: number) => [...keys.pond(id), 'diario', dias] as const,
  pondForecast: (id: UUID, dias: number) => [...keys.pond(id), 'pronostico', dias] as const,

  batches: () => [...keys.all, 'lotes'] as const,
  batchesFiltered: (filters: BatchFilters) => [...keys.batches(), filters] as const,
  batch: (id: UUID) => [...keys.batches(), id] as const,
  batchSummary: (id: UUID) => [...keys.batch(id), 'resumen'] as const,
  batchProjection: (id: UUID) => [...keys.batch(id), 'proyeccion'] as const,
  fryCounts: (id: UUID, limite: number) => [...keys.batch(id), 'conteos', limite] as const,
  mortalities: (id: UUID, limite: number) =>
    [...keys.batch(id), 'mortalidades', limite] as const,
  feedings: (id: UUID, limite: number) => [...keys.batch(id), 'alimentaciones', limite] as const,
  biometries: (id: UUID, limite: number) => [...keys.batch(id), 'biometrias', limite] as const,

  alerts: () => [...keys.all, 'alertas'] as const,
  alertsFiltered: (filters: AlertFilters) => [...keys.alerts(), filters] as const,

  findings: () => [...keys.all, 'hallazgos'] as const,
  pendingFindings: () => [...keys.findings(), 'pendientes'] as const,
  pondFindings: (id: UUID) => [...keys.findings(), 'estanque', id] as const,
  batchFindings: (id: UUID) => [...keys.findings(), 'lote', id] as const,

  parameters: () => [...keys.all, 'parametros'] as const,
  devices: () => [...keys.all, 'dispositivos'] as const,
  syncLogsRoot: () => [...keys.all, 'sincronizaciones'] as const,
  syncLogs: (filters: SyncLogFilters) =>
    [...keys.syncLogsRoot(), filters.dispositivo_id ?? 'todos'] as const,
  users: () => [...keys.all, 'usuarios'] as const,
  aiAvailable: () => [...keys.all, 'ia-disponible'] as const,
}

// ---------- Queries: catalog ----------

export function usePonds() {
  return useQuery({ queryKey: keys.ponds(), queryFn: () => api.listPonds() })
}

export function usePond(id: UUID | undefined) {
  return useQuery({
    queryKey: keys.pond(id ?? ''),
    queryFn: () => {
      if (!id) throw new Error('Falta el id del estanque')
      return api.getPond(id)
    },
    enabled: Boolean(id),
  })
}

export function useBatches(filters: BatchFilters = {}) {
  return useQuery({
    queryKey: keys.batchesFiltered(filters),
    queryFn: () => api.listBatches(filters),
  })
}

export function useBatch(id: UUID | undefined) {
  return useQuery({
    queryKey: keys.batch(id ?? ''),
    queryFn: () => {
      if (!id) throw new Error('Falta el id del lote')
      return api.getBatch(id)
    },
    enabled: Boolean(id),
  })
}

// ---------- Queries: readings and forecast ----------

export function usePondReadings(id: UUID | undefined, query: ReadingQuery = {}) {
  return useQuery({
    queryKey: keys.pondReadings(id ?? '', query),
    queryFn: () => {
      if (!id) throw new Error('Falta el id del estanque')
      return api.pondReadings(id, query)
    },
    enabled: Boolean(id),
  })
}

export function useDailyReadings(id: UUID | undefined, dias = 7) {
  return useQuery({
    queryKey: keys.pondDaily(id ?? '', dias),
    queryFn: () => {
      if (!id) throw new Error('Falta el id del estanque')
      return api.pondDailyReadings(id, dias)
    },
    enabled: Boolean(id),
  })
}

/** `enabled` = AI service on (`useAiAvailable`): the route answers 503 while it is off. */
export function usePondForecast(id: UUID | undefined, dias = 2, enabled = true) {
  return useQuery({
    queryKey: keys.pondForecast(id ?? '', dias),
    queryFn: () => {
      if (!id) throw new Error('Falta el id del estanque')
      return api.pondForecast(id, dias)
    },
    enabled: Boolean(id) && enabled,
  })
}

// ---------- Queries: batch detail ----------

export function useBatchSummary(id: UUID | undefined) {
  return useQuery({
    queryKey: keys.batchSummary(id ?? ''),
    queryFn: () => {
      if (!id) throw new Error('Falta el id del lote')
      return api.batchSummary(id)
    },
    enabled: Boolean(id),
  })
}

/** `enabled` = AI service on (`useAiAvailable`): the route answers 503 while it is off. */
export function useBatchProjection(id: UUID | undefined, enabled = true) {
  return useQuery({
    queryKey: keys.batchProjection(id ?? ''),
    queryFn: () => {
      if (!id) throw new Error('Falta el id del lote')
      return api.batchProjection(id)
    },
    enabled: Boolean(id) && enabled,
    // 503 is the expected answer while the AI service is off: do not hammer it.
    retry: false,
  })
}

export function useFryCounts(id: UUID | undefined, limite = 100) {
  return useQuery({
    queryKey: keys.fryCounts(id ?? '', limite),
    queryFn: () => {
      if (!id) throw new Error('Falta el id del lote')
      return api.batchFryCounts(id, limite)
    },
    enabled: Boolean(id),
  })
}

export function useMortalities(id: UUID | undefined, limite = 100) {
  return useQuery({
    queryKey: keys.mortalities(id ?? '', limite),
    queryFn: () => {
      if (!id) throw new Error('Falta el id del lote')
      return api.batchMortalities(id, limite)
    },
    enabled: Boolean(id),
  })
}

export function useFeedings(id: UUID | undefined, limite = 100) {
  return useQuery({
    queryKey: keys.feedings(id ?? '', limite),
    queryFn: () => {
      if (!id) throw new Error('Falta el id del lote')
      return api.batchFeedings(id, limite)
    },
    enabled: Boolean(id),
  })
}

export function useBiometries(id: UUID | undefined, limite = 100) {
  return useQuery({
    queryKey: keys.biometries(id ?? '', limite),
    queryFn: () => {
      if (!id) throw new Error('Falta el id del lote')
      return api.batchBiometries(id, limite)
    },
    enabled: Boolean(id),
  })
}

// ---------- Queries: alerts, findings, parameters ----------

export function useAlerts(filters: AlertFilters = {}) {
  return useQuery({
    queryKey: keys.alertsFiltered(filters),
    queryFn: () => api.listAlerts(filters),
  })
}

export function usePendingFindings() {
  return useQuery({
    queryKey: keys.pendingFindings(),
    queryFn: () => api.listPendingFindings(),
  })
}

export function usePondFindings(id: UUID | undefined) {
  return useQuery({
    queryKey: keys.pondFindings(id ?? ''),
    queryFn: () => {
      if (!id) throw new Error('Falta el id del estanque')
      return api.pondFindings(id)
    },
    enabled: Boolean(id),
  })
}

export function useBatchFindings(id: UUID | undefined) {
  return useQuery({
    queryKey: keys.batchFindings(id ?? ''),
    queryFn: () => {
      if (!id) throw new Error('Falta el id del lote')
      return api.batchFindings(id)
    },
    enabled: Boolean(id),
  })
}

export function useParameters() {
  return useQuery({ queryKey: keys.parameters(), queryFn: () => api.getParameters() })
}

export function useAiAvailable() {
  return useQuery({
    queryKey: keys.aiAvailable(),
    queryFn: () => api.aiAvailable(),
    retry: false,
  })
}

// ---------- Queries: devices and users ----------

export function useDevices() {
  return useQuery({ queryKey: keys.devices(), queryFn: () => api.listDevices() })
}

export function useSyncLogs(filters: SyncLogFilters = {}) {
  return useQuery({
    queryKey: keys.syncLogs(filters),
    queryFn: () => api.listSyncLogs(filters),
  })
}

export function useUsers() {
  return useQuery({ queryKey: keys.users(), queryFn: () => api.listUsers() })
}

// ---------- Optimistic helpers ----------

/** The alerts list at key[2] carries its filters; a pending-only list drops an attended alert. */
function isPendingOnlyAlertKey(queryKey: QueryKey): boolean {
  const filters = queryKey[2]
  return (
    typeof filters === 'object' &&
    filters !== null &&
    'pendientes' in filters &&
    (filters as AlertFilters).pendientes === true
  )
}

function isPendingFindingsKey(queryKey: QueryKey): boolean {
  return queryKey[2] === 'pendientes'
}

interface OptimisticContext<T> {
  previous: Array<[QueryKey, T[] | undefined]>
}

// ---------- Mutations: attend (optimistic) ----------

export function useAttendAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: { id: UUID; dispositivo_id?: string }) =>
      api.attendAlert(variables.id, variables.dispositivo_id),

    onMutate: async (variables): Promise<OptimisticContext<AlertResponse>> => {
      await queryClient.cancelQueries({ queryKey: keys.alerts() })
      const previous = queryClient.getQueriesData<AlertResponse[]>({
        queryKey: keys.alerts(),
      })
      const attendedAt = new Date().toISOString()

      for (const [queryKey, data] of previous) {
        if (!data) continue
        const next = isPendingOnlyAlertKey(queryKey)
          ? data.filter((alert) => alert.id !== variables.id)
          : data.map((alert) =>
              alert.id === variables.id
                ? {
                    ...alert,
                    atendida: true,
                    atendida_en: attendedAt,
                    atendida_por: 'panel',
                  }
                : alert,
            )
        queryClient.setQueryData(queryKey, next)
      }

      return { previous }
    },

    onError: (_error, _variables, context) => {
      if (!context) return
      for (const [queryKey, data] of context.previous) {
        queryClient.setQueryData(queryKey, data)
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: keys.alerts() })
      void queryClient.invalidateQueries({ queryKey: keys.batches() })
    },
  })
}

export function useAttendFinding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: { id: UUID; dispositivo_id?: string }) =>
      api.attendFinding(variables.id, variables.dispositivo_id),

    onMutate: async (variables): Promise<OptimisticContext<FindingResponse>> => {
      await queryClient.cancelQueries({ queryKey: keys.findings() })
      const previous = queryClient.getQueriesData<FindingResponse[]>({
        queryKey: keys.findings(),
      })
      const attendedAt = new Date().toISOString()

      for (const [queryKey, data] of previous) {
        if (!data) continue
        const next = isPendingFindingsKey(queryKey)
          ? data.filter((finding) => finding.id !== variables.id)
          : data.map((finding) =>
              finding.id === variables.id
                ? {
                    ...finding,
                    atendido: true,
                    atendido_en: attendedAt,
                    atendido_por: 'panel',
                  }
                : finding,
            )
        queryClient.setQueryData(queryKey, next)
      }

      return { previous }
    },

    onError: (_error, _variables, context) => {
      if (!context) return
      for (const [queryKey, data] of context.previous) {
        queryClient.setQueryData(queryKey, data)
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: keys.findings() })
    },
  })
}

// ---------- Mutations: catalog ----------

export function useCreatePond() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: PondCreate) => api.createPond(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.ponds() })
    },
  })
}

export function useUpdatePond() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: { id: UUID; body: PondUpdate }) =>
      api.updatePond(variables.id, variables.body),
    onSuccess: (pond) => {
      queryClient.setQueryData(keys.pond(pond.id), pond)
      void queryClient.invalidateQueries({ queryKey: keys.ponds() })
    },
  })
}

export function useCreateBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: BatchCreate) => api.createBatch(body),
    onSuccess: (batch) => {
      void queryClient.invalidateQueries({ queryKey: keys.batches() })
      void queryClient.invalidateQueries({ queryKey: keys.pond(batch.estanque_id) })
    },
  })
}

export function useUpdateBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: { id: UUID; body: BatchUpdate }) =>
      api.updateBatch(variables.id, variables.body),
    onSuccess: (batch) => {
      queryClient.setQueryData(keys.batch(batch.id), batch)
      void queryClient.invalidateQueries({ queryKey: keys.batches() })
      void queryClient.invalidateQueries({ queryKey: keys.batchSummary(batch.id) })
      void queryClient.invalidateQueries({ queryKey: keys.batchProjection(batch.id) })
    },
  })
}

// ---------- Mutations: devices and users ----------

export function useUpdateDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: { id: string; body: DeviceUpdate }) =>
      api.updateDevice(variables.id, variables.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.devices() })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: { id: UUID; body: UserUpdate }) =>
      api.updateUser(variables.id, variables.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.users() })
    },
  })
}

export function useResetTemporaryPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: UUID) => api.resetTemporaryPassword(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.users() })
    },
  })
}
