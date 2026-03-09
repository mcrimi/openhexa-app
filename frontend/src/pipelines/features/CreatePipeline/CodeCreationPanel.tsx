import { WorkspaceLayout_WorkspaceFragment } from "workspaces/layouts/WorkspaceLayout/WorkspaceLayout.generated";

type Props = {
  workspace: WorkspaceLayout_WorkspaceFragment;
  entryMode: "ai" | "manual";
  onBack: () => void;
};

const CodeCreationPanel = (_props: Props) => null;

export default CodeCreationPanel;
