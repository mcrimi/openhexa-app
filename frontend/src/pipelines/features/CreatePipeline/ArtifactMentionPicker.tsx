import { CircleStackIcon, DocumentIcon, TableCellsIcon } from "@heroicons/react/24/outline";
import { useArtifactFilesQuery, useArtifactTablesQuery } from "workspaces/graphql/queries.generated";
import { useDatasetPickerQuery } from "datasets/graphql/queries.generated";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "next-i18next";
import { ArtifactMention, ArtifactType } from "./artifactTypes";

type Tab = ArtifactType;

type Props = {
  workspaceSlug: string;
  query: string;
  onSelect: (mention: ArtifactMention) => void;
  onClose: () => void;
};

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "dataset", label: "Datasets", Icon: CircleStackIcon },
  { id: "file",    label: "Files",    Icon: DocumentIcon },
  { id: "table",   label: "Tables",   Icon: TableCellsIcon },
];

const ArtifactMentionPicker = ({ workspaceSlug, query, onSelect, onClose }: Props) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("dataset");
  const [keyboardIdx, setKeyboardIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: dsData, loading: dsLoading } = useDatasetPickerQuery({
    variables: { slug: workspaceSlug },
  });

  const [filesActivated, setFilesActivated] = useState(false);
  const { data: filesData, loading: filesLoading } = useArtifactFilesQuery({
    variables: { workspaceSlug, query: query || undefined },
    skip: !filesActivated,
  });

  const [tablesActivated, setTablesActivated] = useState(false);
  const { data: tablesData, loading: tablesLoading } = useArtifactTablesQuery({
    variables: { workspaceSlug },
    skip: !tablesActivated,
  });

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setKeyboardIdx(0);
    if (tab === "file") setFilesActivated(true);
    if (tab === "table") setTablesActivated(true);
  };

  const lowerQuery = query.toLowerCase();

  const items: ArtifactMention[] = (() => {
    if (activeTab === "dataset") {
      return (dsData?.workspace?.datasets.items ?? [])
        .filter((i) => i.dataset.name.toLowerCase().includes(lowerQuery))
        .map((i) => ({
          id: `dataset:${i.dataset.slug}`,
          type: "dataset" as const,
          label: i.dataset.name,
          ref: `dataset:${i.dataset.slug}`,
        }));
    }
    if (activeTab === "file") {
      return (filesData?.workspace?.bucket?.objects?.items ?? [])
        .filter((i) => i.name.toLowerCase().includes(lowerQuery) || i.path.toLowerCase().includes(lowerQuery))
        .map((i) => ({
          id: `file:${i.path}`,
          type: "file" as const,
          label: i.name,
          ref: `file:${i.path}`,
        }));
    }
    if (activeTab === "table") {
      return (tablesData?.workspace?.database?.tables?.items ?? [])
        .filter((i) => i.name.toLowerCase().includes(lowerQuery))
        .map((i) => ({
          id: `table:${i.name}`,
          type: "table" as const,
          label: i.name,
          ref: `table:${i.name}`,
        }));
    }
    return [];
  })();

  const loading = activeTab === "dataset" ? dsLoading
    : activeTab === "file" ? filesLoading
    : tablesLoading;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setKeyboardIdx((i) => Math.min(i + 1, items.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setKeyboardIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" && items[keyboardIdx]) { e.preventDefault(); onSelect(items[keyboardIdx]); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, keyboardIdx, onClose, onSelect]);

  useEffect(() => { setKeyboardIdx(0); }, [items.length]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl border border-gray-200 bg-white shadow-lg"
    >
      <div className="flex border-b border-gray-100">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => handleTabChange(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === id
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {t(label)}
          </button>
        ))}
      </div>

      <div className="max-h-56 overflow-y-auto">
        {loading ? (
          <p className="px-4 py-3 text-center text-xs text-gray-400">{t("Loading…")}</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-3 text-center text-xs text-gray-400">{t("No results")}</p>
        ) : (
          <ul>
            {items.map((item, idx) => {
              const Icon = TABS.find((tab) => tab.id === item.type)?.Icon ?? CircleStackIcon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onSelect(item)}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-xs transition-colors ${
                      idx === keyboardIdx ? "bg-indigo-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0 text-indigo-400" />
                    <span className="truncate font-medium text-gray-700">{item.label}</span>
                    <span className="ml-auto flex-shrink-0 text-[10px] text-gray-400">{item.type}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ArtifactMentionPicker;
