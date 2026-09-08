/**
 * The public respondent route.
 *
 * Rendered on the server from the public API surface, so a shared link works
 * with no session, no numeric form ID and no client round trip before the first
 * question paints. An unpublished or unknown slug is a plain 404.
 */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { FormFlow } from "@/components/flow/FormFlow";
import { api } from "@/lib/api";
import type { PublicForm } from "@/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function load(slug: string): Promise<PublicForm | null> {
  try {
    return await api.getPublicForm(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const form = await load(slug);
  return { title: form ? form.title : "Form not found" };
}

export default async function PublicFormPage({ params }: PageProps) {
  const { slug } = await params;
  const form = await load(slug);
  if (!form) notFound();

  // Renaming a form re-mints its slug, and the API still resolves the old one —
  // answering with the form's *current* slug. When they differ, this link is a
  // retired one, so send the visitor to the live address rather than serving
  // the form at two URLs.
  if (form.slug !== slug) redirect(`/f/${form.slug}`);

  return <FormFlow form={form} />;
}
