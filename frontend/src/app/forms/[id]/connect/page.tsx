"use client";

import { use } from "react";

import { FormShell } from "@/components/builder/FormShell";
import { ComingSoon } from "@/components/ui/ComingSoon";

export default function ConnectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const formId = Number(use(params).id);

  return (
    <FormShell formId={formId}>
      <div className="flex flex-1 items-center justify-center overflow-y-auto bg-canvas p-8">
        <ComingSoon
          title="Connect"
          description="Send responses onward as they arrive, or pull data in before the form is shown."
          items={["Webhooks", "Google Sheets", "Slack", "Zapier", "HubSpot", "Airtable"]}
        />
      </div>
    </FormShell>
  );
}
