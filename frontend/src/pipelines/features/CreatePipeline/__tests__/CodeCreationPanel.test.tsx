import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestApp } from "core/helpers/testutils";
import CodeCreationPanel from "../CodeCreationPanel";

// Mock FilesEditor — it has complex internals
jest.mock("workspaces/features/FilesEditor", () => ({
  FilesEditor: ({ name }: any) => <div data-testid="files-editor">{name}</div>,
}));

// Mock AIChatPanel
jest.mock("../AIChatPanel", () => ({
  __esModule: true,
  default: ({ onSend }: any) => (
    <button onClick={() => onSend("test message")}>AI Chat</button>
  ),
}));

const WORKSPACE = { slug: "ws", name: "WS", permissions: { update: true } };

describe("manual mode", () => {
  it("renders the code editor immediately", () => {
    render(
      <TestApp>
        <CodeCreationPanel workspace={WORKSPACE as any} entryMode="manual" onBack={jest.fn()} />
      </TestApp>,
    );
    expect(screen.getByPlaceholderText(/pipeline name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Pipeline/i })).toBeInTheDocument();
    expect(screen.getByTestId("files-editor")).toBeInTheDocument();
  });

  it("shows error when creating without a name", async () => {
    const user = userEvent.setup();
    render(
      <TestApp>
        <CodeCreationPanel workspace={WORKSPACE as any} entryMode="manual" onBack={jest.fn()} />
      </TestApp>,
    );
    await user.click(screen.getByRole("button", { name: /Create Pipeline/i }));
    expect(screen.getByText(/pipeline name/i)).toBeInTheDocument();
  });
});

describe("ai mode", () => {
  it("renders the AI prompt screen first", () => {
    render(
      <TestApp>
        <CodeCreationPanel workspace={WORKSPACE as any} entryMode="ai" onBack={jest.fn()} />
      </TestApp>,
    );
    expect(screen.getByText(/What do you want to create today/i)).toBeInTheDocument();
    expect(screen.queryByTestId("files-editor")).not.toBeInTheDocument();
  });

  it("transitions to editor after sending the prompt", async () => {
    const user = userEvent.setup();
    render(
      <TestApp>
        <CodeCreationPanel workspace={WORKSPACE as any} entryMode="ai" onBack={jest.fn()} />
      </TestApp>,
    );
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "build a pipeline");
    await user.click(screen.getByRole("button", { name: /send/i }));
    expect(screen.getByTestId("files-editor")).toBeInTheDocument();
  });
});
