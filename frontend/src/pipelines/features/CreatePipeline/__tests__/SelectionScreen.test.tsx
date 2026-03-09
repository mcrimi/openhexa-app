import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestApp } from "core/helpers/testutils";
import SelectionScreen from "../SelectionScreen";

const WORKSPACE = {
  slug: "test-workspace",
  name: "Test Workspace",
  permissions: { update: true },
};

it("renders all four creation method cards", () => {
  render(
    <TestApp>
      <SelectionScreen workspace={WORKSPACE as any} />
    </TestApp>,
  );

  expect(screen.getByText("Create with AI")).toBeInTheDocument();
  expect(screen.getByText("Create")).toBeInTheDocument();
  expect(screen.getByText("From Template")).toBeInTheDocument();
  expect(screen.getByText("From Notebook")).toBeInTheDocument();
});

it("renders the CLI secondary link", () => {
  render(
    <TestApp>
      <SelectionScreen workspace={WORKSPACE as any} />
    </TestApp>,
  );

  expect(screen.getByText(/Set up the CLI/)).toBeInTheDocument();
});

it("clicking 'Create with AI' transitions away from the cards", async () => {
  render(
    <TestApp>
      <SelectionScreen workspace={WORKSPACE as any} />
    </TestApp>,
  );

  await userEvent.click(screen.getByText("Create with AI"));

  expect(screen.queryByText("From Template")).not.toBeInTheDocument();
});

it("clicking 'Create' transitions away from the cards", async () => {
  render(
    <TestApp>
      <SelectionScreen workspace={WORKSPACE as any} />
    </TestApp>,
  );

  await userEvent.click(screen.getByText("Create"));

  expect(screen.queryByText("From Template")).not.toBeInTheDocument();
});
