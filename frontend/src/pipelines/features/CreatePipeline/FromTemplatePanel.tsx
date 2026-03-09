import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "next-i18next";
import PipelineTemplates from "pipelines/features/PipelineTemplates";
import { WorkspaceLayout_WorkspaceFragment } from "workspaces/layouts/WorkspaceLayout/WorkspaceLayout.generated";

type Props = {
  workspace: WorkspaceLayout_WorkspaceFragment;
  onBack: () => void;
};

const FromTemplatePanel = ({ workspace, onBack }: Props) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 px-4 pt-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {t("Back")}
      </button>
      <PipelineTemplates workspace={workspace} showCard={false} />
    </div>
  );
};

export default FromTemplatePanel;
