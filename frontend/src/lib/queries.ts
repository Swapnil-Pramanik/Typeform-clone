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
import type {
  Form,
  FormSummary,
  FormSummaryStats,
  ResponsePage,
  ResponseSort,
} from "@/types";

export const keys = {
  forms: (search?: string) => ["forms", search ?? ""] as const,
  form: (id: number) => ["form", id] as const,
  responses: (id: number, page: number, search: string, sort: ResponseSort) =>
    ["responses", id, page, search, sort] as const,
  summary: (id: number) => ["summary", id] as const,
};

export function useForms(search?: string): UseQueryResult<FormSummary[]> {
  return useQuery({
    queryKey: keys.forms(search),
    queryFn: () => api.listForms(search),
    // Keeps the current list on screen while a search request is in flight,
    // rather than dropping the whole table to a loading pane between keystrokes.
    placeholderData: (previous) => previous,
  });
}

/**
 * Warm a form's builder data before it is asked for.
 *
 * The dashboard already knows which form the pointer is over, and the request
 * costs about 150ms — most of it a fixed round trip to the region rather than
 * anything the database does. Starting it on hover means the builder usually
 * has its data before the click lands, which is the only way left to take real
 * time off that navigation.
 */
export function usePrefetchForm(): (id: number) => void {
  const client = useQueryClient();
  return (id: number) => {
    void client.prefetchQuery({
      queryKey: keys.form(id),
      queryFn: () => api.getForm(id),
      staleTime: 15_000,
    });
  };
}

export function useFormQuery(id: number): UseQueryResult<Form> {
  return useQuery({ queryKey: keys.form(id), queryFn: () => api.getForm(id) });
}

export function useResponses(
  id: number,
  page: number,
  search = "",
  sort: ResponseSort = "newest",
): UseQueryResult<ResponsePage> {
  return useQuery({
    queryKey: keys.responses(id, page, search, sort),
    queryFn: () => api.listResponses(id, page, { search, sort }),
    // Keeps the table on screen while a search request is in flight, instead of
    // dropping to the loading pane on every keystroke.
    placeholderData: (previous) => previous,
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
