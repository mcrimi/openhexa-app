import { gql, useMutation } from "@apollo/client";
import Button from "core/components/Button";
import Field from "core/components/forms/Field";
import Link from "core/components/Link";
import Textarea from "core/components/forms/Textarea";
import { Trans, useTranslation } from "next-i18next";
import { useState } from "react";
import { WorkspaceLayout_WorkspaceFragment } from "workspaces/layouts/WorkspaceLayout/WorkspaceLayout.generated";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

type Props = {
  workspace: WorkspaceLayout_WorkspaceFragment;
  onBack: () => void;
};

type GenerateCLIWorkspaceTokenMutation = {
  generateWorkspaceToken: {
    token?: string | null;
    success: boolean;
  };
};

const CLIInstructionsPanel = ({ workspace, onBack }: Props) => {
  const { t } = useTranslation();
  const [token, setToken] = useState<null | string>(null);

  const [generateToken] = useMutation<GenerateCLIWorkspaceTokenMutation>(
    gql`
      mutation GenerateCLIWorkspaceToken($input: GenerateWorkspaceTokenInput!) {
        generateWorkspaceToken(input: $input) {
          token
          success
        }
      }
    `,
    { variables: { input: { slug: workspace.slug } } },
  );

  const onTokenClick = async () => {
    if (!token) {
      const { data } = await generateToken();
      setToken(data?.generateWorkspaceToken?.token ?? null);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {t("Back")}
      </button>
      <h2 className="text-lg font-medium">{t("Set up the CLI")}</h2>
      <p className="mb-6">
        <Trans>
          In order to create pipelines, you need to setup the{" "}
          <code>openhexa</code> CLI using the{" "}
          <Link
            target="_blank"
            href="https://github.com/BLSQ/openhexa/wiki/Writing-OpenHexa-pipelines"
          >
            guide
          </Link>{" "}
          on Github.
        </Trans>
      </p>
      <p>
        {t(
          "Configure the workspace in your terminal using the following commands:",
        )}
      </p>
      <pre className=" bg-slate-100 p-2 font-mono text-sm leading-6">
        <div>
          <span className="select-none text-gray-400">$ </span>pip install
          openhexa.sdk
          <span className="select-none text-gray-400">
            {t("# if not installed")}
          </span>
        </div>
        <div>
          <span className="select-none text-gray-400">$ </span>
          <span className="whitespace-normal">
            openhexa workspaces add <b>{workspace.slug}</b>
          </span>
        </div>
      </pre>
      <Field name="token" label={t("Access Token")} required>
        <div className="flex w-full flex-1 items-center gap-1">
          {token ? (
            <Textarea className="font-mono" value={token} readOnly />
          ) : (
            <Button variant="secondary" onClick={onTokenClick}>
              {t("Show")}
            </Button>
          )}
        </div>
      </Field>
    </div>
  );
};

export default CLIInstructionsPanel;
