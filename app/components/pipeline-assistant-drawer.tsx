"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  TransitionChild,
} from "@headlessui/react";
import {
  PaperAirplaneIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AssistantMessage,
  PipelineContext,
  usePipelineAssistant,
} from "./use-pipeline-assistant";

/* ---------- Spinner (from core/components/Spinner) ---------- */

function Spinner({ className, size = "md" }: { className?: string; size?: "xs" | "sm" | "md" }) {
  return (
    <svg
      className={clsx(
        "animate-spin",
        size === "xs" && "h-3 w-3",
        size === "sm" && "h-5 w-5",
        size === "md" && "h-7 w-7",
        className,
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/* ---------- Drawer (from core/components/Drawer) ---------- */

function Drawer({
  open,
  setOpen,
  children,
  displayClose = true,
  backdropBlur = true,
  backdrop = true,
  width = "max-w-md 2xl:max-w-xl",
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  children: React.ReactNode;
  displayClose?: boolean;
  backdropBlur?: boolean;
  backdrop?: boolean;
  width?: string;
}) {
  return (
    <Dialog open={open} onClose={setOpen} className="relative z-50">
      {backdrop && (
        <DialogBackdrop
          transition
          className={clsx(
            "fixed inset-0 bg-gray-500/75 transition-opacity duration-500 ease-in-out data-closed:opacity-0",
            backdropBlur && "backdrop-blur-xs data-closed:backdrop-blur-none",
          )}
        />
      )}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <DialogPanel
              transition
              className={clsx(
                "pointer-events-auto overflow-x-hidden relative w-screen transform transition duration-300 ease-in-out data-closed:translate-x-full sm:duration-500",
                width,
              )}
            >
              <TransitionChild>
                <div className="absolute left-0 top-0 -ml-8 flex pr-2 pt-4 duration-500 ease-in-out data-closed:opacity-0 sm:-ml-10 sm:pr-4">
                  {displayClose && (
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="relative rounded-md text-gray-300 hover:text-white focus:outline-hidden focus:ring-2 focus:ring-white"
                    >
                      <span className="absolute -inset-2.5" />
                      <span className="sr-only">Close panel</span>
                      <XMarkIcon aria-hidden="true" className="size-6" />
                    </button>
                  )}
                </div>
              </TransitionChild>
              <div className="flex h-full flex-col bg-white shadow-xl">
                {children}
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/* ---------- Message Rendering ---------- */

const SUGGESTIONS = [
  "How do I add parameters to my pipeline?",
  "Help me set up a database connection",
  "How do I schedule this pipeline?",
  "Help me debug a pipeline error",
];

function AssistantContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const inner = part.slice(3, -3);
          const newlineIndex = inner.indexOf("\n");
          const code =
            newlineIndex >= 0 ? inner.slice(newlineIndex + 1) : inner;
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-md bg-gray-800 p-3 text-xs text-gray-100 font-mono leading-5"
            >
              <code>{code}</code>
            </pre>
          );
        }
        return <InlineFormatted key={i} text={part} />;
      })}
    </div>
  );
}

function InlineFormatted({ text }: { text: string }) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <div className="whitespace-pre-wrap">
      {tokens.map((token, i) => {
        if (token.startsWith("**") && token.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold">
              {token.slice(2, -2)}
            </strong>
          );
        }
        if (token.startsWith("`") && token.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded bg-gray-200 px-1 py-0.5 text-xs font-mono"
            >
              {token.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{token}</span>;
      })}
    </div>
  );
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={clsx("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={clsx(
          "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-900 border border-gray-200",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <AssistantContent content={message.content} />
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-4 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
      </div>
    </div>
  );
}

/* ---------- Main Drawer Component ---------- */

type PipelineAssistantDrawerProps = {
  open: boolean;
  onClose: () => void;
  context?: PipelineContext;
};

export default function PipelineAssistantDrawer({
  open,
  onClose,
  context,
}: PipelineAssistantDrawerProps) {
  const { messages, isLoading, sendMessage, clearMessages } =
    usePipelineAssistant({ context });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || isLoading) return;
      sendMessage(input);
      setInput("");
    },
    [input, isLoading, sendMessage],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      if (isLoading) return;
      sendMessage(suggestion);
    },
    [isLoading, sendMessage],
  );

  const isEmpty = messages.length === 0;

  return (
    <Drawer
      open={open}
      setOpen={(val) => {
        if (!val) onClose();
      }}
      width="max-w-md 2xl:max-w-lg"
      backdrop={false}
      backdropBlur={false}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
            <SparklesIcon className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Pipeline Assistant
            </h2>
            {context?.pipelineName && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {context.pipelineName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Clear conversation"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close assistant"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 mb-4">
              <SparklesIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">
              How can I help?
            </h3>
            <p className="text-xs text-muted-foreground max-w-[260px] mb-6">
              Ask me about writing pipeline code, configuring parameters,
              debugging runs, or anything else related to your pipeline.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-[300px]">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className="rounded-lg border border-border bg-white px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-white px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your pipeline..."
              rows={1}
              className={clsx(
                "w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm",
                "placeholder:text-gray-400",
                "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
                "disabled:bg-gray-50 disabled:text-gray-400",
              )}
              disabled={isLoading}
              style={{ minHeight: "38px", maxHeight: "120px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "38px";
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={clsx(
              "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg transition-colors",
              input.trim() && !isLoading
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed",
            )}
            aria-label="Send message"
          >
            {isLoading ? (
              <Spinner size="xs" className="text-gray-400" />
            ) : (
              <PaperAirplaneIcon className="h-4 w-4" />
            )}
          </button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          AI assistant -- responses are generated by a mock service
        </p>
      </div>
    </Drawer>
  );
}
