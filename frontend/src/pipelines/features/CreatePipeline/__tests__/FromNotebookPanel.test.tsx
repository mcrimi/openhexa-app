import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestApp } from "core/helpers/testutils";
import FromNotebookPanel from "../FromNotebookPanel";

// Mock BucketObjectPicker since it needs GraphQL
jest.mock("workspaces/features/BucketObjectPicker", () => ({
  __esModule: true,
  default: ({ onChange, placeholder }: any) => (
    <button onClick={() => onChange({ key: "path/to/notebook.ipynb" })}>
      {placeholder}
    </button>
  ),
}));

jest.mock("workspaces/helpers/pipelines", () => ({
  formatPipelineFunctionalType: (type: string) => type,
}));

const WORKSPACE = { slug: "ws", name: "WS", permissions: { update: true } };

it("renders form fields", () => {
  render(
    <TestApp>
      <FromNotebookPanel workspace={WORKSPACE as any} onBack={jest.fn()} />
    </TestApp>,
  );
  expect(screen.getByLabelText(/Pipeline Name/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Notebook/i).length).toBeGreaterThan(0);
  expect(
    screen.getByRole("button", { name: /Create Pipeline/i }),
  ).toBeInTheDocument();
});

it("calls onBack when back button is clicked", async () => {
  const user = userEvent.setup();
  const onBack = jest.fn();
  render(
    <TestApp>
      <FromNotebookPanel workspace={WORKSPACE as any} onBack={onBack} />
    </TestApp>,
  );
  await user.click(screen.getByRole("button", { name: /Back/i }));
  expect(onBack).toHaveBeenCalled();
});

it("shows validation error when submitting without a notebook", async () => {
  const user = userEvent.setup();
  render(
    <TestApp>
      <FromNotebookPanel workspace={WORKSPACE as any} onBack={jest.fn()} />
    </TestApp>,
  );
  await user.type(screen.getByLabelText(/Pipeline Name/i), "My Pipeline");
  await user.click(screen.getByRole("button", { name: /Create Pipeline/i }));
  expect(await screen.findByText(/select a notebook/i)).toBeInTheDocument();
});
