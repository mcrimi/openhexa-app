import { render, screen } from "@testing-library/react";
import { TestApp } from "core/helpers/testutils";
import NewPipelinePage from "pages/workspaces/[workspaceSlug]/pipelines/new";

jest.mock(
  "pipelines/features/CreatePipeline/SelectionScreen",
  () => ({
    __esModule: true,
    default: () => <div>How do you want to create your pipeline?</div>,
  }),
);

jest.mock("workspaces/layouts/WorkspaceLayout", () => {
  const WL = ({ children }: any) => <div>{children}</div>;
  WL.prefetch = jest.fn();
  WL.PageContent = ({ children }: any) => <div>{children}</div>;
  return { __esModule: true, default: WL };
});

const workspace = {
  slug: "test-workspace",
  name: "Test Workspace",
  permissions: {
    update: true,
    manageMembers: false,
    launchNotebookServer: false,
  },
  shortcuts: [],
  countries: [],
};

describe("New Pipeline Page", () => {
  it("renders the selection screen", async () => {
    render(
      <TestApp mocks={[]}>
        <NewPipelinePage workspace={workspace} />
      </TestApp>,
    );

    const elm = await screen.findByText(
      "How do you want to create your pipeline?",
    );
    expect(elm).toBeInTheDocument();
  });

  it("does not render when workspace is missing", () => {
    const { container } = render(
      <TestApp mocks={[]}>
        <NewPipelinePage />
      </TestApp>,
    );

    expect(container.firstChild).toBeNull();
  });
});
