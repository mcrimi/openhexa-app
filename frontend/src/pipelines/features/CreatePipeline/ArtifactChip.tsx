import { CircleStackIcon, DocumentIcon, TableCellsIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "next-i18next";
import { ArtifactMention, ArtifactType } from "./artifactTypes";

const ICONS: Record<ArtifactType, React.ElementType> = {
  dataset: CircleStackIcon,
  file: DocumentIcon,
  table: TableCellsIcon,
};

type Props = {
  mention: ArtifactMention;
  onRemove: (id: string) => void;
};

const ArtifactChip = ({ mention, onRemove }: Props) => {
  const { t } = useTranslation();
  const Icon = ICONS[mention.type];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
      <Icon className="h-3 w-3 flex-shrink-0" data-type={mention.type} />
      <span className="max-w-[120px] truncate">{mention.label}</span>
      <button
        type="button"
        aria-label={t("Remove {{label}}", { label: mention.label })}
        onClick={() => onRemove(mention.id)}
        className="ml-0.5 rounded-full text-indigo-400 hover:text-indigo-700"
      >
        <XMarkIcon className="h-3 w-3" />
      </button>
    </span>
  );
};

export default ArtifactChip;
