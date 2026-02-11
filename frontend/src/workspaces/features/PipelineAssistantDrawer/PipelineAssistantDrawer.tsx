import {
  PaperAirplaneIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import Button from "core/components/Button";
import Drawer from "core/components/Drawer/Drawer";
import Spinner from "core/components/Spinner";
import { useTranslation } from "next-i18next";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AssistantMessage,
  PipelineContext,
  usePipelineAssistant,
} from "./usePipelineAssistant";

type PipelineAssistantDrawerProps = {
  open: boolean;
  onClose: () => void;
  context?: PipelineContext;
};

const SUGGESTIONS = [
  "How do I add parameters to my pipeline?",
  "Help me set up a database connection",
  "How do I schedule this pipeline?",
  "Help me debug a pipeline error",
];

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

/**
 * Renders assistant markdown-like content with basic formatting:
 * bold, inline code, code blocks, and line breaks.
 */
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
  // Split by bold (**text**) and inline code (`code`)
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

export default function PipelineAssistantDrawer({
  open,
  onClose,
  context,
}: PipelineAssistantDrawerProps) {
  const { t } = useTranslation();
  const { messages, isLoading, sendMessage, clearMessages } =
    usePipelineAssistant({ context });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when drawer opens
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
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
            <SparklesIcon className="h-4.5 w-4.5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {t("Pipeline Assistant")}
            </h2>
            {context?.pipelineName && (
              <p className="text-xs text-gray-500 truncate max-w-[200px]">
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
              title={t("Clear conversation")}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
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
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {t("How can I help?")}
            </h3>
            <p className="text-xs text-gray-500 max-w-[260px] mb-6">
              {t(
                "Ask me about writing pipeline code, configuring parameters, debugging runs, or anything else related to your pipeline.",
              )}
            </p>
            <div className="flex flex-col gap-2 w-full max-w-[300px]">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
                >
                  {t(suggestion)}
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
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("Ask about your pipeline...")}
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
          >
            {isLoading ? (
              <Spinner size="xs" className="text-gray-400" />
            ) : (
              <PaperAirplaneIcon className="h-4 w-4" />
            )}
          </button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-gray-400">
          {t("AI assistant — responses are generated by a mock service")}
        </p>
      </div>
    </Drawer>
  );
}
