import Page from "core/components/Page";
import { createGetServerSideProps } from "core/helpers/page";
import { NextPageWithLayout } from "core/helpers/types";
import { useTranslation } from "next-i18next";
import {
  WorkspacePipelinesPageDocument,
  WorkspacePipelinesPageQuery,
} from "workspaces/graphql/queries.generated";
import WorkspaceLayout from "workspaces/layouts/WorkspaceLayout";
import { WorkspaceLayout_WorkspaceFragment } from "workspaces/layouts/WorkspaceLayout/WorkspaceLayout.generated";
import SelectionScreen from "pipelines/features/CreatePipeline/SelectionScreen";

type Props = {
  workspace: WorkspaceLayout_WorkspaceFragment;
};

const NewPipelinePage: NextPageWithLayout = ({ workspace }: Props) => {
  const { t } = useTranslation();

  if (!workspace) {
    return null;
  }

  return (
    <Page title={t("Create pipeline")}>
      <WorkspaceLayout workspace={workspace}>
        <WorkspaceLayout.PageContent>
          <SelectionScreen workspace={workspace} />
        </WorkspaceLayout.PageContent>
      </WorkspaceLayout>
    </Page>
  );
};

NewPipelinePage.getLayout = (page) => page;

export const getServerSideProps = createGetServerSideProps({
  requireAuth: true,
  async getServerSideProps(ctx, client) {
    const workspaceSlug = ctx.params?.workspaceSlug as string;

    await WorkspaceLayout.prefetch(ctx, client);

    const { data } = await client.query<WorkspacePipelinesPageQuery>({
      query: WorkspacePipelinesPageDocument,
      variables: {
        workspaceSlug,
        page: 1,
        perPage: 1,
        search: "",
        functionalType: null,
      },
    });

    if (!data.workspace) {
      return { notFound: true };
    }

    return {
      props: {
        workspace: data.workspace,
      },
    };
  },
});

export default NewPipelinePage;
