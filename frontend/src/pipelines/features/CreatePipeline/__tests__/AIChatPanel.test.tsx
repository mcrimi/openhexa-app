import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestApp } from "core/helpers/testutils";
import AIChatPanel from "../AIChatPanel";

it("renders the input and send button", () => {
  render(
    <TestApp>
      <AIChatPanel messages={[]} onSend={jest.fn()} />
    </TestApp>,
  );
  expect(
    screen.getByPlaceholderText(/use @ to reference/i),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
});

it("calls onSend with the message text and clears input", async () => {
  const user = userEvent.setup();
  const onSend = jest.fn();
  render(
    <TestApp>
      <AIChatPanel messages={[]} onSend={onSend} />
    </TestApp>,
  );
  await user.type(screen.getByRole("textbox"), "build a pipeline");
  await user.click(screen.getByRole("button", { name: /send/i }));
  expect(onSend).toHaveBeenCalledWith("build a pipeline");
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
      />
    </TestApp>,
  );
  expect(screen.getByText("Hello")).toBeInTheDocument();
  expect(screen.getByText("Hi there")).toBeInTheDocument();
});

it("sends on Enter key without Shift", async () => {
  const user = userEvent.setup();
  const onSend = jest.fn();
  render(<TestApp><AIChatPanel messages={[]} onSend={onSend} /></TestApp>);
  await user.type(screen.getByRole("textbox"), "hello{Enter}");
  expect(onSend).toHaveBeenCalledWith("hello");
});
