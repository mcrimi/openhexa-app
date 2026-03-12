import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestApp } from "core/helpers/testutils";
import ArtifactChip from "../ArtifactChip";

const dataset = { id: "dataset:sales", type: "dataset" as const, label: "Sales 2024", ref: "dataset:sales-2024" };
const file    = { id: "file:data/out.csv", type: "file" as const, label: "data/out.csv", ref: "file:data/out.csv" };
const table   = { id: "table:patients", type: "table" as const, label: "patients", ref: "table:patients" };

it("renders the label", () => {
  render(<TestApp><ArtifactChip mention={dataset} onRemove={jest.fn()} /></TestApp>);
  expect(screen.getByText("Sales 2024")).toBeInTheDocument();
});

it("calls onRemove when × is clicked", async () => {
  const onRemove = jest.fn();
  render(<TestApp><ArtifactChip mention={dataset} onRemove={onRemove} /></TestApp>);
  await userEvent.click(screen.getByRole("button", { name: /remove/i }));
  expect(onRemove).toHaveBeenCalledWith(dataset.id);
});

it("renders different icons for dataset, file, table", () => {
  const { rerender } = render(<TestApp><ArtifactChip mention={dataset} onRemove={jest.fn()} /></TestApp>);
  expect(document.querySelector("[data-type='dataset']")).toBeInTheDocument();
  rerender(<TestApp><ArtifactChip mention={file} onRemove={jest.fn()} /></TestApp>);
  expect(document.querySelector("[data-type='file']")).toBeInTheDocument();
  rerender(<TestApp><ArtifactChip mention={table} onRemove={jest.fn()} /></TestApp>);
  expect(document.querySelector("[data-type='table']")).toBeInTheDocument();
});
