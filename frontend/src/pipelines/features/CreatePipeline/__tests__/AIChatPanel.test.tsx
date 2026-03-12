import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestApp } from "core/helpers/testutils";
import AIChatPanel from "../AIChatPanel";

jest.mock("../ArtifactMentionPicker", () => ({
  __esModule: true,
  default: ({ onSelect, onClose }: any) => (
    <>
      <button
        onClick={() =>
          onSelect({
            id: "dataset:sales",
            type: "dataset",
            label: "Sales 2024",
            ref: "dataset:sales-2024",
          })
        }
      >
        Pick Sales 2024
      </button>
      <button onClick={onClose}>Close picker</button>
    </>
  ),
}));

const defaultProps = {
  messages: [] as any[],
  onSend: jest.fn(),
  onNewConversation: jest.fn(),
  onClose: jest.fn(),
};

it("renders the input and send button", () => {
  render(
    <TestApp>
      <AIChatPanel {...defaultProps} />
    </TestApp>,
  );
  expect(screen.getByRole("textbox")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
});

it("renders the AI Assistant header", () => {
  render(
    <TestApp>
      <AIChatPanel {...defaultProps} />
    </TestApp>,
  );
  expect(screen.getByText("AI Assistant")).toBeInTheDocument();
});

it("calls onClose when clicking the × button", async () => {
  const onClose = jest.fn();
  render(
    <TestApp>
      <AIChatPanel {...defaultProps} onClose={onClose} />
    </TestApp>,
  );
  await userEvent.click(screen.getByTitle("Close"));
  expect(onClose).toHaveBeenCalled();
});

it("archives current conversation and calls onNewConversation when clicking +", async () => {
  const onNewConversation = jest.fn();
  render(
    <TestApp>
      <AIChatPanel
        messages={[{ role: "user", content: "Hello" }]}
        onSend={jest.fn()}
        onNewConversation={onNewConversation}
        onClose={jest.fn()}
      />
    </TestApp>,
  );
  await userEvent.click(screen.getByTitle("New conversation"));
  expect(onNewConversation).toHaveBeenCalled();
});

it("shows history link when there are past conversations", async () => {
  render(
    <TestApp>
      <AIChatPanel
        messages={[{ role: "user", content: "Hello" }]}
        onSend={jest.fn()}
        onNewConversation={jest.fn()}
        onClose={jest.fn()}
      />
    </TestApp>,
  );
  // Archive one conversation by clicking +
  await userEvent.click(screen.getByTitle("New conversation"));
  expect(screen.getByText("history")).toBeInTheDocument();
});

it("switches to history view and back", async () => {
  render(
    <TestApp>
      <AIChatPanel
        messages={[{ role: "user", content: "Hello" }]}
        onSend={jest.fn()}
        onNewConversation={jest.fn()}
        onClose={jest.fn()}
      />
    </TestApp>,
  );
  await userEvent.click(screen.getByTitle("New conversation"));
  await userEvent.click(screen.getByText("history"));
  expect(screen.getByText("History")).toBeInTheDocument();
  // Back button returns to chat
  await userEvent.click(screen.getByRole("button", { name: "" }));
  expect(screen.getByText("AI Assistant")).toBeInTheDocument();
});

it("calls onSend with the message text and clears input", async () => {
  const user = userEvent.setup();
  const onSend = jest.fn();
  render(
    <TestApp>
      <AIChatPanel {...defaultProps} onSend={onSend} />
    </TestApp>,
  );
  await user.type(screen.getByRole("textbox"), "build a pipeline");
  await user.click(screen.getByRole("button", { name: /send/i }));
  expect(onSend).toHaveBeenCalledWith("build a pipeline", []);
  expect(screen.getByRole("textbox")).toHaveValue("");
});

it("renders existing messages", () => {
  render(
    <TestApp>
      <AIChatPanel
        messages={[
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there" },
        ]}
        onSend={jest.fn()}
        onNewConversation={jest.fn()}
        onClose={jest.fn()}
      />
    </TestApp>,
  );
  expect(screen.getByText("Hello")).toBeInTheDocument();
  expect(screen.getByText("Hi there")).toBeInTheDocument();
});

it("sends on Enter key without Shift", async () => {
  const user = userEvent.setup();
  const onSend = jest.fn();
  render(
    <TestApp>
      <AIChatPanel {...defaultProps} onSend={onSend} />
    </TestApp>,
  );
  await user.type(screen.getByRole("textbox"), "hello{Enter}");
  expect(onSend).toHaveBeenCalledWith("hello", []);
});

it("shows typing indicator when isTyping is true", () => {
  render(
    <TestApp>
      <AIChatPanel {...defaultProps} isTyping={true} />
    </TestApp>,
  );
  const dots = document.querySelectorAll(".animate-bounce");
  expect(dots.length).toBeGreaterThan(0);
});

it("opens picker when @ is typed", async () => {
  const user = userEvent.setup();
  render(
    <TestApp>
      <AIChatPanel {...defaultProps} workspaceSlug="ws" />
    </TestApp>,
  );
  await user.type(screen.getByRole("textbox"), "@");
  expect(screen.getByText("Pick Sales 2024")).toBeInTheDocument();
});

it("adds a chip when artifact is selected and removes @ from input", async () => {
  const user = userEvent.setup();
  render(
    <TestApp>
      <AIChatPanel {...defaultProps} workspaceSlug="ws" />
    </TestApp>,
  );
  await user.type(screen.getByRole("textbox"), "@");
  await user.click(screen.getByText("Pick Sales 2024"));
  expect(screen.getByText("Sales 2024")).toBeInTheDocument(); // chip
  expect(screen.getByRole("textbox")).toHaveValue(""); // @ removed
});

it("removes a chip when × is clicked", async () => {
  const user = userEvent.setup();
  render(
    <TestApp>
      <AIChatPanel {...defaultProps} workspaceSlug="ws" />
    </TestApp>,
  );
  await user.type(screen.getByRole("textbox"), "@");
  await user.click(screen.getByText("Pick Sales 2024"));
  await user.click(screen.getByRole("button", { name: /remove/i }));
  expect(screen.queryByText("Sales 2024")).not.toBeInTheDocument();
});

it("sends message with mentions and clears chips", async () => {
  const user = userEvent.setup();
  const onSend = jest.fn();
  render(
    <TestApp>
      <AIChatPanel {...defaultProps} onSend={onSend} workspaceSlug="ws" />
    </TestApp>,
  );
  await user.type(screen.getByRole("textbox"), "@");
  await user.click(screen.getByText("Pick Sales 2024"));
  await user.type(screen.getByRole("textbox"), "analyze this");
  await user.click(screen.getByRole("button", { name: /send/i }));
  expect(onSend).toHaveBeenCalledWith(
    "analyze this",
    [expect.objectContaining({ type: "dataset", label: "Sales 2024" })],
  );
  expect(screen.queryByText("Sales 2024")).not.toBeInTheDocument(); // chip cleared
});
