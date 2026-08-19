"use client";

import { deleteProject } from "@/app/admin/projects/actions";

export function ConfirmDeleteProjectForm({ projectId }: { projectId: string }) {
  return (
    <form
      action={deleteProject}
      className="surface p-5"
      onSubmit={(e) => {
        if (!window.confirm("Delete this project? This cannot be undone from the list.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={projectId} />
      <p className="text-sm font-semibold text-foreground">Delete project</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Soft-deletes the project. Blocked if it has active bookings.
      </p>
      <button
        type="submit"
        className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
      >
        Delete project
      </button>
    </form>
  );
}
