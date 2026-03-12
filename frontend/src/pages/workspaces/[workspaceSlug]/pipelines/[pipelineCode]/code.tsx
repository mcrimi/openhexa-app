import { SparklesIcon } from "@heroicons/react/24/outline";
import Page from "core/components/Page";
import { createGetServerSideProps } from "core/helpers/page";
import { NextPageWithLayout } from "core/helpers/types";
import useSidebarOpen from "core/hooks/useSidebarOpen";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import { useState } from "react";
import { PipelineFilesEditor } from "workspaces/features/FilesEditor/PipelineFilesEditor";
import {
  useGetPipelineVersionFilesLazyQuery,
  useWorkspacePipelineCodePageQuery,
  WorkspacePipelineCodePageDocument,
  WorkspacePipelineCodePageQuery,
  WorkspacePipelineCodePageQueryVariables,
} from "workspaces/graphql/queries.generated";
import PipelineLayout from "workspaces/layouts/PipelineLayout";
import DataCard from "core/components/DataCard";
import PipelineVersionPicker from "workspaces/features/PipelineVersionPicker";
import { PipelineVersionPicker_VersionFragment } from "workspaces/features/PipelineVersionPicker/PipelineVersionPicker.generated";
import Spinner from "core/components/Spinner";
import AIChatPanel, {
  ChatMessage,
} from "pipelines/features/CreatePipeline/AIChatPanel";
import { ArtifactMention } from "pipelines/features/CreatePipeline/artifactTypes";
import Button from "core/components/Button";
import { useUploadPipelineMutation } from "workspaces/graphql/mutations.generated";
import JSZip from "jszip";
import { FileType } from "graphql/types";
import { FilesEditor_FileFragment } from "workspaces/features/FilesEditor/FilesEditor.generated";

type Props = {
  pipelineCode: string;
  workspaceSlug: string;
};

const WorkspacePipelineCodePage: NextPageWithLayout = (props: Props) => {
  const { pipelineCode, workspaceSlug } = props;
  const { t } = useTranslation();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useSidebarOpen();
  const priorSidebarOpen = useRef<boolean | null>(null);

  const [selectedVersion, setSelectedVersion] =
    useState<PipelineVersionPicker_VersionFragment | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [isAITyping, setIsAITyping] = useState(false);
  const [pendingAISave, setPendingAISave] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [saveVersionError, setSaveVersionError] = useState<string | null>(null);

  const [uploadPipeline] = useUploadPipelineMutation({
    refetchQueries: ["WorkspacePipelineCodePage"],
    awaitRefetchQueries: true,
  });

  const { data, loading } = useWorkspacePipelineCodePageQuery({
    variables: {
      workspaceSlug,
      pipelineCode,
    },
  });
  const [fetchPipelineVersion, { data: versionData, loading: versionLoading }] =
    useGetPipelineVersionFilesLazyQuery();

  const openAI = () => {
    priorSidebarOpen.current = sidebarOpen;
    setSidebarOpen(false);
    setShowAI(true);
  };

  const closeAI = () => {
    setShowAI(false);
    if (priorSidebarOpen.current !== null) {
      setSidebarOpen(priorSidebarOpen.current);
      priorSidebarOpen.current = null;
    }
  };

  const toggleAI = () => {
    if (showAI) {
      closeAI();
    } else {
      openAI();
    }
  };

  useEffect(() => {
    const prompt = router.query.prompt;
    if (!prompt || typeof prompt !== "string") return;

    openAI();
    const userMessage: ChatMessage = { role: "user", content: prompt };
    setAiMessages([userMessage]);
    setIsAITyping(true);

    const timer = setTimeout(() => {
      setAiMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I've written the initial pipeline code based on your description. Review it in the editor and let me know if you'd like any changes.",
        },
      ]);
      setIsAITyping(false);
      setPendingAISave(true);
    }, 2200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data?.workspace || !data?.pipeline) {
    return null;
  }
  const { workspace, pipeline } = data;

  if (!pipeline.currentVersion) {
    return null;
  }

  const onVersionChange = (version: PipelineVersionPicker_VersionFragment) => {
    if (version) {
      setSelectedVersion(version);
      fetchPipelineVersion({
        variables: { versionId: version.id },
      }).then();
    }
  };

  const handleVersionCreated = (
    version: PipelineVersionPicker_VersionFragment,
  ) => {
    setSelectedVersion(version);
    fetchPipelineVersion({
      variables: { versionId: version.id },
    }).then();
    setPendingAISave(false);
  };

  const handleAISend = (message: string, mentions: ArtifactMention[]) => {
    const contextPrefix = mentions.length > 0
      ? `[Context: ${mentions.map((m) => m.ref).join(", ")}]\n`
      : "";
    void contextPrefix; // used for actual AI call in future
    setAiMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsAITyping(true);
    setTimeout(() => {
      setAiMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I've updated the pipeline code based on your request. Review the changes in the editor and save a new version when you're happy.",
        },
      ]);
      setIsAITyping(false);
      setPendingAISave(true);
    }, 1800);
  };

  const handleNewConversation = () => {
    setAiMessages([]);
    setIsAITyping(false);
    setPendingAISave(false);
  };

  const handleSaveVersion = async (
    files: FilesEditor_FileFragment[],
  ) => {
    setIsSavingVersion(true);
    setSaveVersionError(null);
    try {
      const zip = new JSZip();
      files.forEach((f) => {
        if (f.type === FileType.File) {
          zip.file(f.path, f.content ?? "");
        }
      });
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(zipBlob);
      });

      const result = await uploadPipeline({
        variables: {
          input: { workspaceSlug, pipelineCode, zipfile: base64 },
        },
      });

      if (result.data?.uploadPipeline.success) {
        const newVersion = result.data.uploadPipeline.pipelineVersion;
        if (newVersion) handleVersionCreated(newVersion);
        setPendingAISave(false);
      } else {
        setSaveVersionError(
          result.data?.uploadPipeline.errors?.join(", ") ?? t("Save failed"),
        );
      }
    } catch (err) {
      setSaveVersionError(
        err instanceof Error ? err.message : t("Save failed"),
      );
    } finally {
      setIsSavingVersion(false);
    }
  };

  const versionToShow = versionData?.pipelineVersion ?? pipeline.currentVersion;

  return (
    <Page title={pipeline.name ?? t("Pipeline Code")}>
      <PipelineLayout
        workspace={workspace}
        pipeline={pipeline}
        currentTab="code"
      >
        <DataCard.FormSection>
          {/* Version picker row + AI toggle */}
          <div className="flex items-center gap-3">
            <label className="text-md font-medium text-gray-700">
              {t("Version")}:
            </label>
            <div className="w-70 flex-1 max-w-xs">
              <PipelineVersionPicker
                required
                value={selectedVersion ?? pipeline.currentVersion}
                pipeline={pipeline}
                onChange={onVersionChange}
              />
            </div>
            {!showAI && (
              <div className="ml-auto">
                <Button
                  size="sm"
                  onClick={openAI}
                  leadingIcon={<SparklesIcon className="h-4 w-4" />}
                >
                  {t("AI Assistant")}
                </Button>
              </div>
            )}
          </div>

          {/* AI-triggered save banner */}
          {pendingAISave && (
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-800">
                  {saveVersionError
                    ? saveVersionError
                    : t("AI modified the code — ready to save a new version?")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={isSavingVersion}
                  onClick={() => handleSaveVersion(versionToShow.files)}
                >
                  {isSavingVersion ? t("Saving…") : t("Save version")}
                </Button>
                <button
                  onClick={() => setPendingAISave(false)}
                  className="text-xs text-amber-600 hover:text-amber-800"
                >
                  {t("Dismiss")}
                </button>
              </div>
            </div>
          )}

          {/* Editor + AI panel side by side */}
          <div className="flex items-stretch overflow-hidden">
            <div className="relative min-w-0 flex-1">
              {(loading || versionLoading) && (
                <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-xs">
                  <Spinner size="md" />
                </div>
              )}
              <PipelineFilesEditor
                key={versionToShow.id}
                name={versionToShow.versionName}
                files={versionToShow.files}
                isEditable={true}
                workspaceSlug={workspaceSlug}
                pipelineCode={pipelineCode}
                pipelineId={pipeline.id}
                onVersionCreated={handleVersionCreated}
              />
            </div>

            {showAI && (
              <div className="w-80 flex-shrink-0 overflow-hidden rounded-r-lg border-l border-gray-200">
                <AIChatPanel
                  messages={aiMessages}
                  onSend={handleAISend}
                  onNewConversation={handleNewConversation}
                  onClose={closeAI}
                  isTyping={isAITyping}
                  workspaceSlug={workspaceSlug}
                />
              </div>
            )}
          </div>
        </DataCard.FormSection>
      </PipelineLayout>
    </Page>
  );
};

WorkspacePipelineCodePage.getLayout = (page) => page;

export const getServerSideProps = createGetServerSideProps({
  requireAuth: true,
  async getServerSideProps(ctx, client) {
    await PipelineLayout.prefetch(ctx, client);

    const { data } = await client.query<
      WorkspacePipelineCodePageQuery,
      WorkspacePipelineCodePageQueryVariables
    >({
      query: WorkspacePipelineCodePageDocument,
      variables: {
        workspaceSlug: ctx.params!.workspaceSlug as string,
        pipelineCode: ctx.params!.pipelineCode as string,
      },
    });

    if (!data.workspace || !data.pipeline) {
      return { notFound: true };
    }

    return {
      props: {
        workspaceSlug: ctx.params!.workspaceSlug,
        pipelineCode: ctx.params!.pipelineCode,
      },
    };
  },
});

export default WorkspacePipelineCodePage;
