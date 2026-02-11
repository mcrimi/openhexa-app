"use client";

import { useState } from "react";
import {
  SparklesIcon,
  PlayIcon,
  TrashIcon,
  CodeBracketIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import PipelineAssistantDrawer from "./components/pipeline-assistant-drawer";

const PIPELINE_NAME = "DHIS2 Data Extraction";
const PIPELINE_CODE = "dhis2-data-extraction";

const TABS = [
  { id: "general", label: "General", icon: DocumentTextIcon },
  { id: "runs", label: "Runs", icon: PlayIcon },
  { id: "notifications", label: "Scheduling & Notifications", icon: ClockIcon },
  { id: "code", label: "Code", icon: CodeBracketIcon },
];

const MOCK_CODE = `from openhexa.sdk import current_run, pipeline, parameter, workspace

@parameter("country", type=str, help="Country ISO code")
@parameter("year", type=int, default=2024, help="Year to process")
@parameter("dataset_ids", type=str, help="Comma-separated DHIS2 dataset IDs")
@pipeline("dhis2-data-extraction", name="DHIS2 Data Extraction")
def dhis2_data_extraction(country: str, year: int, dataset_ids: str):
    """Extract data from DHIS2 and store in workspace database."""
    
    current_run.log_info(f"Starting extraction for {country} ({year})")
    
    # Get DHIS2 connection
    dhis2 = workspace.dhis2_connection("dhis2-production")
    db = workspace.postgresql_connection("workspace-db")
    
    ids = [d.strip() for d in dataset_ids.split(",")]
    
    for dataset_id in ids:
        current_run.log_info(f"Extracting dataset {dataset_id}...")
        # Extract data values
        data = dhis2.api.get(
            "dataValueSets",
            params={
                "dataSet": dataset_id,
                "orgUnit": country,
                "period": str(year),
            }
        )
        
        current_run.log_info(
            f"Got {len(data.get('dataValues', []))} values"
        )
        
        # Store in database
        # ... processing logic ...
    
    current_run.log_info("Extraction complete!")`;

const MOCK_FILES = [
  { name: "pipeline.py", active: true },
  { name: "requirements.txt", active: false },
  { name: "utils.py", active: false },
];

function MockSidebarMenu() {
  return (
    <nav className="flex flex-col w-56 bg-gray-900 text-gray-300 text-sm shrink-0">
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 text-white font-semibold text-base">
          <div className="h-7 w-7 rounded bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
            OH
          </div>
          OpenHEXA
        </div>
      </div>
      <div className="px-3 py-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 px-2 mb-1.5">
          Workspace
        </div>
        {[
          { label: "Pipelines", active: true },
          { label: "Datasets", active: false },
          { label: "Connections", active: false },
          { label: "Files", active: false },
        ].map((item) => (
          <div
            key={item.label}
            className={clsx(
              "px-2 py-1.5 rounded text-xs cursor-default",
              item.active
                ? "bg-gray-800 text-white font-medium"
                : "text-gray-400",
            )}
          >
            {item.label}
          </div>
        ))}
      </div>
    </nav>
  );
}

function MockBreadcrumbs() {
  return (
    <div className="flex items-center gap-1 text-sm text-gray-500">
      <span className="hover:text-gray-700 cursor-default">Pipelines</span>
      <ChevronRightIcon className="h-3 w-3" />
      <span className="text-gray-900 font-medium">{PIPELINE_NAME}</span>
    </div>
  );
}

function MockCodeEditor() {
  return (
    <div className="flex flex-1 overflow-hidden rounded-lg border border-border bg-white">
      {/* File tree */}
      <div className="w-48 border-r border-border bg-muted py-2 shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wider">
          <FolderIcon className="h-3.5 w-3.5" />
          Files
        </div>
        {MOCK_FILES.map((file) => (
          <div
            key={file.name}
            className={clsx(
              "px-3 py-1.5 text-xs cursor-default",
              file.active
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-600 hover:bg-gray-100",
            )}
          >
            {file.name}
          </div>
        ))}
      </div>
      {/* Code */}
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-1.5">
          <span className="text-xs text-muted-foreground font-medium">
            pipeline.py
          </span>
          <span className="text-[10px] text-muted-foreground">
            Python
          </span>
        </div>
        <pre className="p-4 text-xs leading-5 font-mono text-gray-800 overflow-x-auto">
          {MOCK_CODE.split("\n").map((line, i) => (
            <div key={i} className="flex">
              <span className="w-8 shrink-0 text-right pr-3 text-gray-400 select-none">
                {i + 1}
              </span>
              <span className="flex-1 whitespace-pre">{line}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

export default function PreviewPage() {
  const [isAssistantOpen, setAssistantOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("code");

  return (
    <div className="flex h-screen overflow-hidden bg-muted">
      <MockSidebarMenu />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header bar */}
        <header className="flex items-center justify-between border-b border-border bg-white px-5 py-3">
          <MockBreadcrumbs />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAssistantOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-sm border border-gray-400 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-xs transition-colors hover:bg-gray-50"
            >
              <SparklesIcon className="h-4 w-4" />
              AI Assistant
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-sm border border-transparent bg-indigo-100 px-3 py-2 text-sm font-medium text-indigo-700 shadow-xs hover:bg-indigo-200">
              Publish as Template
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-sm border border-transparent bg-indigo-100 px-3 py-2 text-sm font-medium text-indigo-700 shadow-xs hover:bg-indigo-200">
              Download code
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-sm border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-xs hover:bg-blue-700">
              <PlayIcon className="h-4 w-4" />
              Run
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-sm border border-transparent bg-red-700 px-3 py-2 text-sm font-medium text-white shadow-xs hover:bg-red-800">
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-border bg-white px-5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-5">
          {activeTab === "code" && <MockCodeEditor />}
          {activeTab === "general" && (
            <div className="rounded-lg border border-border bg-white p-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">
                {PIPELINE_NAME}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Extracts data from DHIS2 instances and loads into workspace
                database for analysis.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Code:</span>{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                    {PIPELINE_CODE}
                  </code>
                </div>
                <div>
                  <span className="text-muted-foreground">Version:</span>{" "}
                  <span className="text-foreground">3.2.1</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last run:</span>{" "}
                  <span className="text-foreground">2 hours ago</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <span className="inline-flex items-center gap-1 text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Success
                  </span>
                </div>
              </div>
            </div>
          )}
          {activeTab === "runs" && (
            <div className="rounded-lg border border-border bg-white p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Recent Runs
              </h2>
              <div className="space-y-2">
                {[
                  { id: "#142", status: "success", time: "2h ago", duration: "3m 22s" },
                  { id: "#141", status: "success", time: "1d ago", duration: "3m 45s" },
                  { id: "#140", status: "failed", time: "2d ago", duration: "1m 12s" },
                  { id: "#139", status: "success", time: "3d ago", duration: "3m 18s" },
                ].map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between rounded border border-border px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={clsx(
                          "h-2 w-2 rounded-full",
                          run.status === "success" ? "bg-green-500" : "bg-red-500",
                        )}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {run.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{run.duration}</span>
                      <span>{run.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === "notifications" && (
            <div className="rounded-lg border border-border bg-white p-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Scheduling & Notifications
              </h2>
              <p className="text-sm text-muted-foreground">
                Configure cron scheduling and email notifications for this
                pipeline.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant Drawer */}
      <PipelineAssistantDrawer
        open={isAssistantOpen}
        onClose={() => setAssistantOpen(false)}
        context={{
          pipelineName: PIPELINE_NAME,
          pipelineCode: PIPELINE_CODE,
        }}
      />
    </div>
  );
}
