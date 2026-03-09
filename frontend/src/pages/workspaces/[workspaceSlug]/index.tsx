import Block from "core/components/Block";
import Button from "core/components/Button";
import MarkdownEditor from "core/components/MarkdownEditor/MarkdownEditor";
import MarkdownViewer from "core/components/MarkdownViewer";
import Page from "core/components/Page";
import Spinner from "core/components/Spinner";
import { createGetServerSideProps } from "core/helpers/page";
import { NextPageWithLayout } from "core/helpers/types";
import useCacheKey from "core/hooks/useCacheKey";
import { useTranslation } from "next-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUpdateWorkspaceMutation } from "workspaces/graphql/mutations.generated";
import {
  useWorkspacePageQuery,
  WorkspacePageDocument,
  WorkspacePageQuery,
} from "workspaces/graphql/queries.generated";
import WorkspaceLayout from "workspaces/layouts/WorkspaceLayout";
import { PencilIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

type Props = {
  workspaceSlug: string;
  page: number;
  perPage: number;
};

const WorkspaceHome: NextPageWithLayout = (props: Props) => {
  const { t } = useTranslation();

  useCacheKey("workspace", () => refetch());

  const [isEditing, setIsEditing] = useState(false);
  const [mutate, { loading }] = useUpdateWorkspaceMutation();
  const { data, refetch } = useWorkspacePageQuery({
    variables: { slug: props.workspaceSlug },
  });
  const [description, setDescription] = useState(
    data?.workspace?.description || "",
  );
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsEditing(false);
    setDescription(data?.workspace?.description || "");
  }, [data?.workspace?.description]);

  const onSave = useCallback(async () => {
    await mutate({
      variables: {
        input: {
          slug: props.workspaceSlug,
          description: description.trim(),
        },
      },
    });
    setIsEditing(false);
  }, [mutate, props.workspaceSlug, description]);

  const onCancel = useCallback(() => {
    setDescription(data?.workspace?.description || "");
    setIsEditing(false);
  }, [data?.workspace?.description]);

  const onStartEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  if (!data?.workspace) {
    return null;
  }

  const { workspace } = data;
  const canEdit = workspace.permissions.update;

  return (
    <Page title={workspace.name}>
      <WorkspaceLayout
        workspace={workspace}
        helpLinks={[
          {
            href: "https://docs.openhexa.com/workspaces/",
            label: t("About workspaces"),
          },
          {
            href: "https://docs.openhexa.com/workspaces/",
            label: t("Editing the workspace homepage"),
          },
        ]}
        header={<></>}
        headerActions={
          !isEditing && canEdit ? (
            <Button onClick={onStartEditing}>{t("Edit")}</Button>
          ) : null
        }
      >
        <WorkspaceLayout.PageContent>
          <div
            ref={contentRef}
            className={clsx(
              "relative transition-all duration-200 ease-in-out",
              isEditing && "ring-2 ring-blue-500/20 rounded-lg",
            )}
          >
            {/* Floating Edit Bar - slides down when editing */}
            <div
              className={clsx(
                "overflow-hidden transition-all duration-200 ease-in-out",
                isEditing
                  ? "max-h-16 opacity-100 mb-0"
                  : "max-h-0 opacity-0 mb-0",
              )}
            >
              <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-4 py-2.5 rounded-t-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <PencilIcon className="h-4 w-4" />
                  <span className="font-medium">{t("Editing workspace description")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onCancel}
                    leadingIcon={<XMarkIcon className="h-4 w-4" />}
                  >
                    {t("Cancel")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={onSave}
                    leadingIcon={
                      loading ? (
                        <Spinner size="xs" />
                      ) : (
                        <CheckIcon className="h-4 w-4" />
                      )
                    }
                  >
                    {t("Save changes")}
                  </Button>
                </div>
              </div>
            </div>

            {/* Content Area - seamless transition between view/edit */}
            {isEditing ? (
              <div className="bg-white sm:rounded-b-lg overflow-hidden border-b border-gray-200">
                <MarkdownEditor
                  className="min-h-[400px]"
                  markdown={description || ""}
                  onChange={(markdown) => {
                    setDescription(markdown);
                  }}
                />
              </div>
            ) : (
              <Block>
                <Block.Content>
                  <div
                    className={clsx(
                      "group relative",
                      canEdit && "cursor-pointer hover:bg-gray-50/50 transition-colors duration-150 rounded-md -m-2 p-2",
                    )}
                    onClick={canEdit ? onStartEditing : undefined}
                    role={canEdit ? "button" : undefined}
                    tabIndex={canEdit ? 0 : undefined}
                    onKeyDown={
                      canEdit
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onStartEditing();
                            }
                          }
                        : undefined
                    }
                  >
                    <MarkdownViewer
                      key={data.workspace.slug}
                      markdown={workspace.description || ""}
                    />
                    {canEdit && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md border border-gray-200 shadow-sm">
                          <PencilIcon className="h-3 w-3" />
                          {t("Click to edit")}
                        </span>
                      </div>
                    )}
                  </div>
                </Block.Content>
              </Block>
            )}
          </div>
        </WorkspaceLayout.PageContent>
      </WorkspaceLayout>
    </Page>
  );
};

WorkspaceHome.getLayout = (page) => page;

export const getServerSideProps = createGetServerSideProps({
  requireAuth: true,
  async getServerSideProps(ctx, client) {
    await WorkspaceLayout.prefetch(ctx, client);
    const { data } = await client.query<WorkspacePageQuery>({
      query: WorkspacePageDocument,
      variables: {
        slug: ctx.params?.workspaceSlug,
      },
    });

    if (!data.workspace) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        workspaceSlug: ctx.params?.workspaceSlug,
      },
    };
  },
});

export default WorkspaceHome;
