import { SparklesIcon } from "@heroicons/react/24/solid";
import { ArrowLeftIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "next-i18next";
import ArtifactChip from "./ArtifactChip";
import ArtifactMentionPicker from "./ArtifactMentionPicker";
import { ArtifactMention } from "./artifactTypes";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type StoredConversation = {
  id: string;
  messages: ChatMessage[];
  startedAt: Date;
};

type Props = {
  messages: ChatMessage[];
  onSend: (message: string, mentions: ArtifactMention[]) => void;
  onNewConversation: () => void;
  onClose: () => void;
  isTyping?: boolean;
  workspaceSlug?: string;
};

type View = "chat" | "history" | "history-detail";

const TypingIndicator = () => (
  <div className="flex justify-start">
    <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-indigo-100 bg-indigo-50 px-4 py-3">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
    </div>
  </div>
);

const MessageList = ({
  messages,
  isTyping = false,
}: {
  messages: ChatMessage[];
  isTyping?: boolean;
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current?.scrollIntoView) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  return (
    <div className="space-y-3 px-4 py-4">
      {messages.map((msg, idx) => (
        <div
          key={`${msg.role}-${idx}-${msg.content.slice(0, 20)}`}
          className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
        >
          {msg.role === "assistant" && (
            <div className="mr-2 mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100">
              <SparklesIcon className="h-3 w-3 text-indigo-500" />
            </div>
          )}
          <div
            className={
              msg.role === "user"
                ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo-600 px-3 py-2 text-xs leading-relaxed text-white shadow-sm"
                : "max-w-[85%] rounded-2xl rounded-tl-sm border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs leading-relaxed text-gray-700"
            }
          >
            {msg.content}
          </div>
        </div>
      ))}
      {isTyping && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
};

const AIChatPanel = ({
  messages,
  onSend,
  onNewConversation,
  onClose,
  isTyping = false,
  workspaceSlug,
}: Props) => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [mentions, setMentions] = useState<ArtifactMention[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const atIndexRef = useRef<number>(-1);
  const pickerQueryLengthRef = useRef<number>(0);
  const [view, setView] = useState<View>("chat");
  const [pastConversations, setPastConversations] = useState<StoredConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<StoredConversation | null>(null);

  const hasMessages = messages.length > 0 || isTyping;

  const handleNew = () => {
    if (messages.length > 0) {
      setPastConversations((prev) => [
        {
          id: Date.now().toString(),
          messages: [...messages],
          startedAt: new Date(),
        },
        ...prev,
      ]);
    }
    onNewConversation();
    setView("chat");
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed && mentions.length === 0) return;
    onSend(trimmed, mentions);
    setInput("");
    setMentions([]);
    setPickerOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart ?? val.length;
    const textUpToCursor = val.slice(0, cursorPos);
    const atIdx = textUpToCursor.lastIndexOf("@");

    if (atIdx !== -1) {
      const afterAt = textUpToCursor.slice(atIdx + 1);
      if (!afterAt.includes(" ")) {
        atIndexRef.current = atIdx;
        setPickerQuery(afterAt);
        pickerQueryLengthRef.current = afterAt.length;
        setPickerOpen(true);
      } else {
        setPickerOpen(false);
      }
    } else {
      setPickerOpen(false);
    }
    setInput(val);
  };

  const handleSelect = (mention: ArtifactMention) => {
    const before = input.slice(0, atIndexRef.current);
    const after = input.slice(atIndexRef.current + 1 + pickerQuery.length);
    setInput(before + after);
    setMentions((prev) => {
      if (prev.some((m) => m.id === mention.id)) return prev;
      return [...prev, mention];
    });
    setPickerOpen(false);
    setPickerQuery("");
    pickerQueryLengthRef.current = 0;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
    if (e.key === "Backspace" && input === "" && mentions.length > 0) {
      setMentions((prev) => prev.slice(0, -1));
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          {view !== "chat" && (
            <button
              onClick={() => setView(view === "history-detail" ? "history" : "chat")}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600">
            <SparklesIcon className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-800">
            {view === "history"
              ? t("History")
              : view === "history-detail"
                ? t("Past conversation")
                : t("AI Assistant")}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {view === "chat" && pastConversations.length > 0 && (
            <button
              onClick={() => setView("history")}
              className="rounded-md px-1.5 py-1 text-[10px] text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              {t("history")}
            </button>
          )}
          {view === "chat" && (
            <button
              onClick={handleNew}
              title={t("New conversation")}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            title={t("Close")}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {view === "history" ? (
        <div className="flex-1 overflow-y-auto">
          {pastConversations.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-gray-400">
              {t("No past conversations")}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pastConversations.map((conv) => {
                const preview =
                  conv.messages.find((m) => m.role === "user")?.content ?? "";
                return (
                  <li key={conv.id}>
                    <button
                      onClick={() => {
                        setSelectedConv(conv);
                        setView("history-detail");
                      }}
                      className="w-full px-4 py-3 text-left transition-colors hover:bg-gray-50"
                    >
                      <p className="truncate text-xs font-medium text-gray-700">
                        {preview || t("(empty)")}
                      </p>
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {formatTime(conv.startedAt)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : view === "history-detail" && selectedConv ? (
        <div className="flex-1 overflow-y-auto">
          <MessageList messages={selectedConv.messages} />
        </div>
      ) : (
        <>
          {/* Current conversation */}
          <div className="flex-1 overflow-y-auto">
            {!hasMessages ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600">
                  <SparklesIcon className="h-5 w-5 text-white" />
                </div>
                <p className="mb-1 text-sm font-semibold text-gray-800">
                  {t("Ask the AI assistant")}
                </p>
                <p className="text-xs text-gray-400">
                  {t("Describe a change and the AI will update your code")}
                </p>
              </div>
            ) : (
              <MessageList messages={messages} isTyping={isTyping} />
            )}
          </div>

          {/* Input area with picker and chip strip */}
          <div className="border-t border-gray-100 p-3">
            {/* Artifact mention picker */}
            {pickerOpen && workspaceSlug && (
              <div className="mb-2">
                <ArtifactMentionPicker
                  workspaceSlug={workspaceSlug}
                  query={pickerQuery}
                  onSelect={handleSelect}
                  onClose={() => {
                    setPickerOpen(false);
                    setInput(
                      (prev) =>
                        prev.slice(0, atIndexRef.current) +
                        prev.slice(atIndexRef.current + 1 + pickerQueryLengthRef.current),
                    );
                    setPickerQuery("");
                    pickerQueryLengthRef.current = 0;
                  }}
                />
              </div>
            )}

            {/* Chip strip */}
            {mentions.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {mentions.map((m) => (
                  <ArtifactChip
                    key={m.id}
                    mention={m}
                    onRemove={(id) => setMentions((prev) => prev.filter((x) => x.id !== id))}
                  />
                ))}
              </div>
            )}

            {/* Input card */}
            <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm transition-all focus-within:border-indigo-400 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]">
              <textarea
                className="w-full resize-none rounded-xl bg-transparent p-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
                placeholder={t("Ask or describe a change… (type @ to mention an artifact)")}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={3}
              />
              <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
                <span className="text-[10px] text-gray-400">
                  {t("@ to attach · Enter to send · Shift+Enter for new line")}
                </span>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() && mentions.length === 0}
                  className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <SparklesIcon className="h-3 w-3" />
                  {t("Send")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIChatPanel;
