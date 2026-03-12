import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestApp } from "core/helpers/testutils";
import ArtifactMentionPicker from "../ArtifactMentionPicker";

// Mock all three queries
jest.mock("workspaces/graphql/queries.generated", () => ({
  ...jest.requireActual("workspaces/graphql/queries.generated"),
  useArtifactFilesQuery: () => ({
    data: {
      workspace: { bucket: { objects: { items: [
        { key: "data/output.csv", name: "output.csv", path: "data/output.csv", type: "FILE", size: 1024 },
      ]}}},
    },
    loading: false,
  }),
  useArtifactTablesQuery: () => ({
    data: {
      workspace: { database: { tables: { items: [
        { name: "patients", count: 500 },
      ]}}},
    },
    loading: false,
  }),
}));

jest.mock("datasets/graphql/queries.generated", () => ({
  useDatasetPickerQuery: () => ({
    data: {
      workspace: { datasets: { items: [
        { id: "ds1", dataset: { slug: "sales-2024", name: "Sales 2024" } },
      ]}},
    },
    loading: false,
  }),
}));

const defaultProps = {
  workspaceSlug: "my-ws",
  query: "",
  onSelect: jest.fn(),
  onClose: jest.fn(),
};

it("renders Datasets tab by default and shows dataset results", async () => {
  render(<TestApp><ArtifactMentionPicker {...defaultProps} /></TestApp>);
  expect(screen.getByRole("tab", { name: /datasets/i })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText("Sales 2024")).toBeInTheDocument());
});

it("switches to Files tab and shows file results", async () => {
  render(<TestApp><ArtifactMentionPicker {...defaultProps} /></TestApp>);
  await userEvent.click(screen.getByRole("tab", { name: /files/i }));
  await waitFor(() => expect(screen.getByText("output.csv")).toBeInTheDocument());
});

it("switches to Tables tab and shows table results", async () => {
  render(<TestApp><ArtifactMentionPicker {...defaultProps} /></TestApp>);
  await userEvent.click(screen.getByRole("tab", { name: /tables/i }));
  await waitFor(() => expect(screen.getByText("patients")).toBeInTheDocument());
});

it("calls onSelect with ArtifactMention when item is clicked", async () => {
  const onSelect = jest.fn();
  render(<TestApp><ArtifactMentionPicker {...defaultProps} onSelect={onSelect} /></TestApp>);
  await waitFor(() => screen.getByText("Sales 2024"));
  await userEvent.click(screen.getByText("Sales 2024"));
  expect(onSelect).toHaveBeenCalledWith(
    expect.objectContaining({ type: "dataset", label: "Sales 2024" })
  );
});

it("calls onClose when Escape is pressed", async () => {
  const onClose = jest.fn();
  render(<TestApp><ArtifactMentionPicker {...defaultProps} onClose={onClose} /></TestApp>);
  await userEvent.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalled();
});

it("filters datasets by query prop", async () => {
  render(<TestApp><ArtifactMentionPicker {...defaultProps} query="xyz" /></TestApp>);
  await waitFor(() => expect(screen.queryByText("Sales 2024")).not.toBeInTheDocument());
});
