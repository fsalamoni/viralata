/**
 * @fileoverview Hooks React Query para as Tarefas do abrigo.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as svc from '../services/shelterTaskService';

export function useShelterTasks(clubId) {
  return useQuery({
    queryKey: ['shelter-tasks', clubId],
    queryFn: () => svc.listTasks(clubId),
    enabled: Boolean(clubId),
    staleTime: 15_000,
  });
}

export function useTaskLogs(clubId, taskId, enabled = true) {
  return useQuery({
    queryKey: ['shelter-task-logs', clubId, taskId],
    queryFn: () => svc.getTaskLogs(clubId, taskId),
    enabled: Boolean(clubId) && Boolean(taskId) && Boolean(enabled),
  });
}

export function useTaskMutations(clubId) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['shelter-tasks', clubId] });

  const createTask = useMutation({
    mutationFn: ({ actor, payload }) => svc.createTask(clubId, actor, payload),
    onSuccess: invalidate,
  });
  const moveTask = useMutation({
    mutationFn: ({ taskId, actor, toPhase, data }) => svc.moveTask(clubId, taskId, actor, { toPhase, data }),
    onSuccess: invalidate,
  });
  const addThirdParty = useMutation({
    mutationFn: ({ taskId, actor, data }) => svc.addThirdParty(clubId, taskId, actor, data),
    onSuccess: invalidate,
  });
  const editTask = useMutation({
    mutationFn: ({ taskId, actor, updates }) => svc.editTask(clubId, taskId, actor, updates),
    onSuccess: invalidate,
  });
  const deleteTask = useMutation({
    mutationFn: ({ taskId, actor }) => svc.deleteTask(clubId, taskId, actor),
    onSuccess: invalidate,
  });

  return { createTask, moveTask, addThirdParty, editTask, deleteTask };
}
