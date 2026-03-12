export type ArtifactType = "dataset" | "file" | "table";

export type ArtifactMention = {
  id: string;          // unique key — use `${type}:${ref}` for deduplication
  type: ArtifactType;
  label: string;       // display name in chip
  ref: string;         // machine-readable: "dataset:sales-2024", "file:data/out.csv", "table:patients"
};
