"use client";

/**
 * TanStack Query hooks — the app's only server-state layer.
 *
 * Query keys are declared once in `keys` so an invalidation can never drift from
 * the query it is meant to refresh.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Form, FormSummary, FormSummaryStats, ResponsePage } from "@/types";

export const keys = {
  forms: (search?: string) => ["forms", search ?? ""] as const,
  form: (id: number) => ["form", id] as const,
  responses: (id: number, page: number) => ["responses", id, page] as const,
  summary: (id: number) => ["summary", id] as const,
};

export function useForms(search?: string): UseQueryResult<FormSummary[]> {
  return useQuery({
    queryKey: keys.forms(search),
    queryFn: () => api.listForms(search),
  });
}

export function useFormQuery(id: number): UseQueryResult<Form> {
  return useQuery({ queryKey: keys.form(id), queryFn: () => api.getForm(id) });
}

export function useResponses(
  id: number,
  page: number,
): UseQueryResult<ResponsePage> {
  return useQuery({
    queryKey: keys.responses(id, page),
    queryFn: () => api.listResponses(id, page),
  });
}

export function useSummary(id: number): UseQueryResult<FormSummaryStats> {
  return useQuery({ queryKey: keys.summary(id), queryFn: () => api.getSummary(id) });
}

/** Dashboard-level actions. Each one refreshes the form list on success. */
export function useFormActions() {
  const client = useQueryClient();
  const refreshList = () => client.invalidateQueries({ queryKey: ["forms"] });

  return {
    create: useMutation({ mutationFn: api.createForm, onSuccess: refreshList }),
    remove: useMutation({ mutationFn: api.deleteForm, onSuccess: refreshList }),
    duplicate: useMutation({ mutationFn: api.duplicateForm, onSuccess: refreshList }),
    rename: useMutation({
      mutationFn: ({ id, title }: { id: number; title: string }) =>
        api.updateForm(id, { title }),
      onSuccess: refreshList,
    }),
    publish: useMutation({
      mutationFn: api.publishForm,
      onSuccess: (form) => {
        client.setQueryData(keys.form(form.id), form);
        void refreshList();
      },
    }),
    unpublish: useMutation({
      mutationFn: api.unpublishForm,
      onSuccess: (form) => {
        client.setQueryData(keys.form(form.id), form);
        void refreshList();
      },
    }),
  };
}
